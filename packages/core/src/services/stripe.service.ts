import Stripe from 'stripe';
import { prisma, SubscriptionStatus, MemberStatus } from '@gym/database';
import { BILLING_INTERVAL_DAYS, type BillingInterval, ERROR_CODES, type ApiError } from '@gym/shared';
import { addDays } from '@gym/shared';

// Lazy-initialize Stripe to avoid build-time errors when env vars aren't set
let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    }
    stripeClient = new Stripe(apiKey);
  }
  return stripeClient;
}

export { getStripe as stripe };

/**
 * Create a Stripe customer for a member
 */
export async function createStripeCustomer(
  memberId: string
): Promise<{ success: true; customerId: string } | { success: false; error: ApiError }> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { gym: true },
  });

  if (!member) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Member not found' },
    };
  }

  if (member.stripeCustomerId) {
    return { success: true, customerId: member.stripeCustomerId };
  }

  try {
    const customer = await getStripe().customers.create({
      email: member.email,
      name: `${member.firstName} ${member.lastName}`,
      metadata: {
        memberId: member.id,
        gymId: member.gymId,
      },
    });

    await prisma.member.update({
      where: { id: memberId },
      data: { stripeCustomerId: customer.id },
    });

    return { success: true, customerId: customer.id };
  } catch (error) {
    console.error('Failed to create Stripe customer:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to create payment profile' },
    };
  }
}

/**
 * Sync a membership plan to Stripe (create product + price)
 */
export async function syncPlanToStripe(planId: string): Promise<{ success: boolean; error?: ApiError }> {
  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
    include: { gym: true },
  });

  if (!plan) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Plan not found' },
    };
  }

  try {
    // Create or update product
    let productId = plan.stripeProductId;

    if (!productId) {
      const product = await getStripe().products.create({
        name: plan.name,
        description: plan.description || undefined,
        metadata: {
          planId: plan.id,
          gymId: plan.gymId,
        },
      });
      productId = product.id;
    } else {
      await getStripe().products.update(productId, {
        name: plan.name,
        description: plan.description || undefined,
      });
    }

    // Create price (prices are immutable, so we always create new ones)
    const intervalMap: Record<BillingInterval, Stripe.PriceCreateParams.Recurring.Interval> = {
      WEEKLY: 'week',
      MONTHLY: 'month',
      QUARTERLY: 'month',
      YEARLY: 'year',
    };

    const intervalCountMap: Record<BillingInterval, number> = {
      WEEKLY: 1,
      MONTHLY: 1,
      QUARTERLY: 3,
      YEARLY: 1,
    };

    const price = await getStripe().prices.create({
      product: productId,
      unit_amount: Math.round(Number(plan.priceAmount) * 100), // Convert to cents
      currency: plan.priceCurrency.toLowerCase(),
      recurring: {
        interval: intervalMap[plan.billingInterval],
        interval_count: intervalCountMap[plan.billingInterval],
      },
      metadata: {
        planId: plan.id,
      },
    });

    // Update plan with Stripe IDs
    await prisma.membershipPlan.update({
      where: { id: planId },
      data: {
        stripeProductId: productId,
        stripePriceId: price.id,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to sync plan to Stripe:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to sync payment plan' },
    };
  }
}

/**
 * Create a checkout session for subscription
 */
export async function createCheckoutSession(
  memberId: string,
  planId: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ success: true; sessionUrl: string } | { success: false; error: ApiError }> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });

  if (!member) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Member not found' },
    };
  }

  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Plan not found' },
    };
  }

  if (!plan.stripePriceId) {
    // Sync plan to Stripe first
    const syncResult = await syncPlanToStripe(planId);
    if (!syncResult.success) {
      return { success: false, error: syncResult.error! };
    }
    // Reload plan
    const updatedPlan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
    if (!updatedPlan?.stripePriceId) {
      return {
        success: false,
        error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to create payment plan' },
      };
    }
    plan.stripePriceId = updatedPlan.stripePriceId;
  }

  // Ensure customer exists
  let customerId = member.stripeCustomerId;
  if (!customerId) {
    const customerResult = await createStripeCustomer(memberId);
    if (!customerResult.success) {
      return { success: false, error: customerResult.error };
    }
    customerId = customerResult.customerId;
  }

  try {
    const session = await getStripe().checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: plan.stripePriceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        memberId,
        planId,
        gymId: member.gymId,
      },
      subscription_data: {
        metadata: {
          memberId,
          planId,
          gymId: member.gymId,
        },
      },
    });

    if (!session.url) {
      return {
        success: false,
        error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to create checkout session' },
      };
    }

    return { success: true, sessionUrl: session.url };
  } catch (error) {
    console.error('Failed to create checkout session:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to create checkout session' },
    };
  }
}

/**
 * Create a billing portal session for customer self-service
 */
export async function createBillingPortalSession(
  memberId: string,
  returnUrl: string
): Promise<{ success: true; sessionUrl: string } | { success: false; error: ApiError }> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });

  if (!member) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Member not found' },
    };
  }

  if (!member.stripeCustomerId) {
    return {
      success: false,
      error: { code: ERROR_CODES.INVALID_INPUT, message: 'No payment profile found' },
    };
  }

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: member.stripeCustomerId,
      return_url: returnUrl,
    });

    return { success: true, sessionUrl: session.url };
  } catch (error) {
    console.error('Failed to create billing portal session:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to access billing portal' },
    };
  }
}

/**
 * Handle Stripe webhook events
 */
export async function handleStripeWebhook(
  payload: string,
  signature: string
): Promise<{ success: boolean; error?: string }> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET not configured');
    return { success: false, error: 'Webhook not configured' };
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return { success: false, error: 'Invalid signature' };
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error processing webhook:', error);
    return { success: false, error: 'Processing failed' };
  }
}

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const memberId = session.metadata?.memberId;
  const planId = session.metadata?.planId;

  if (!memberId || !planId || !session.subscription) {
    console.error('Missing metadata in checkout session');
    return;
  }

  const plan = await prisma.membershipPlan.findUnique({ where: { id: planId } });
  if (!plan) {
    console.error('Plan not found:', planId);
    return;
  }

  const subscriptionId =
    typeof session.subscription === 'string' ? session.subscription : session.subscription.id;

  // Fetch subscription details
  const subscriptionResponse = await getStripe().subscriptions.retrieve(subscriptionId);
  // In Stripe SDK v20+, the response object contains the subscription data
  const subData = subscriptionResponse as unknown as { current_period_end: number };

  const now = new Date();
  const periodEnd = new Date(subData.current_period_end * 1000);

  await prisma.$transaction(async (tx) => {
    // Create or update subscription
    await tx.subscription.upsert({
      where: { memberId },
      create: {
        memberId,
        planId,
        status: SubscriptionStatus.ACTIVE,
        stripeSubscriptionId: subscriptionId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      update: {
        planId,
        status: SubscriptionStatus.ACTIVE,
        stripeSubscriptionId: subscriptionId,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      },
    });

    // Activate member
    await tx.member.update({
      where: { id: memberId },
      data: { status: MemberStatus.ACTIVE },
    });
  });
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const memberId = subscription.metadata?.memberId;

  if (!memberId) {
    console.error('Missing memberId in subscription metadata');
    return;
  }

  const statusMap: Record<Stripe.Subscription.Status, SubscriptionStatus> = {
    active: SubscriptionStatus.ACTIVE,
    past_due: SubscriptionStatus.PAST_DUE,
    canceled: SubscriptionStatus.CANCELLED,
    unpaid: SubscriptionStatus.EXPIRED,
    incomplete: SubscriptionStatus.ACTIVE,
    incomplete_expired: SubscriptionStatus.EXPIRED,
    trialing: SubscriptionStatus.ACTIVE,
    paused: SubscriptionStatus.PAUSED,
  };

  const status = statusMap[subscription.status] || SubscriptionStatus.ACTIVE;

  // Access billing period from subscription object (cast needed for SDK v20+ types)
  const subData = subscription as unknown as {
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end: boolean;
  };

  await prisma.subscription.update({
    where: { memberId },
    data: {
      status,
      currentPeriodStart: new Date(subData.current_period_start * 1000),
      currentPeriodEnd: new Date(subData.current_period_end * 1000),
      cancelAtPeriodEnd: subData.cancel_at_period_end,
    },
  });

  // Update member status if needed
  if (status === SubscriptionStatus.CANCELLED || status === SubscriptionStatus.EXPIRED) {
    await prisma.member.update({
      where: { id: memberId },
      data: { status: MemberStatus.CANCELLED },
    });
  } else if (status === SubscriptionStatus.PAUSED) {
    await prisma.member.update({
      where: { id: memberId },
      data: { status: MemberStatus.PAUSED },
    });
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const memberId = subscription.metadata?.memberId;

  if (!memberId) {
    console.error('Missing memberId in subscription metadata');
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.subscription.update({
      where: { memberId },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    await tx.member.update({
      where: { id: memberId },
      data: { status: MemberStatus.CANCELLED },
    });
  });
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // In Stripe SDK v20+, access subscription via parent property or cast
  const invoiceData = invoice as unknown as { subscription?: string | { id: string } | null };
  const subscriptionId =
    typeof invoiceData.subscription === 'string'
      ? invoiceData.subscription
      : invoiceData.subscription?.id;

  if (!subscriptionId) return;

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
  });

  if (subscription) {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.PAST_DUE },
    });
  }
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // In Stripe SDK v20+, access subscription via parent property or cast
  const invoiceData = invoice as unknown as { subscription?: string | { id: string } | null };
  const subscriptionId =
    typeof invoiceData.subscription === 'string'
      ? invoiceData.subscription
      : invoiceData.subscription?.id;

  if (!subscriptionId) return;

  const subscription = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: subscriptionId },
    include: { member: true },
  });

  if (subscription && subscription.status === SubscriptionStatus.PAST_DUE) {
    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: { status: SubscriptionStatus.ACTIVE },
      });

      await tx.member.update({
        where: { id: subscription.memberId },
        data: { status: MemberStatus.ACTIVE },
      });
    });
  }
}
