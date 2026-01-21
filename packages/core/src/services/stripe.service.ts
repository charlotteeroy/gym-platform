import Stripe from 'stripe';
import { prisma, SubscriptionStatus, MemberStatus, RefundStatus, FailedPaymentStatus, PayrollStatus } from '@gym/database';
import { BILLING_INTERVAL_DAYS, type BillingInterval, ERROR_CODES, type ApiError } from '@gym/shared';
import { addDays } from '@gym/shared';

// Platform fee percentage (can be overridden per gym)
const DEFAULT_PLATFORM_FEE_PERCENT = 2.5;

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

      // Connect events
      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case 'payout.paid':
        await handlePayoutPaid(event.data.object as Stripe.Payout);
        break;

      case 'payout.failed':
        await handlePayoutFailed(event.data.object as Stripe.Payout);
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

  // Record in dunning system
  await handleInvoicePaymentFailed(invoice);
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

      // Mark any failed payment attempts as recovered
      await tx.failedPaymentAttempt.updateMany({
        where: {
          subscriptionId: subscription.id,
          status: FailedPaymentStatus.PENDING,
        },
        data: { status: FailedPaymentStatus.RECOVERED },
      });
    });
  }
}

// ============================================
// STRIPE CONNECT
// ============================================

/**
 * Create a Stripe Connect Express account for a gym
 */
export async function createConnectAccount(
  gymId: string
): Promise<{ success: true; accountId: string } | { success: false; error: ApiError }> {
  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
  });

  if (!gym) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Gym not found' },
    };
  }

  // If account already exists, return it
  if (gym.stripeAccountId) {
    return { success: true, accountId: gym.stripeAccountId };
  }

  try {
    const account = await getStripe().accounts.create({
      type: 'express',
      country: 'US', // Can be made dynamic based on gym location
      email: gym.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'company',
      metadata: {
        gymId: gym.id,
        gymName: gym.name,
      },
    });

    await prisma.gym.update({
      where: { id: gymId },
      data: {
        stripeAccountId: account.id,
        stripeAccountStatus: 'onboarding',
      },
    });

    return { success: true, accountId: account.id };
  } catch (error) {
    console.error('Failed to create Connect account:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to create payment account' },
    };
  }
}

/**
 * Create onboarding link for a gym's Connect account
 */
export async function createOnboardingLink(
  gymId: string,
  returnUrl: string,
  refreshUrl: string
): Promise<{ success: true; url: string } | { success: false; error: ApiError }> {
  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
  });

  if (!gym) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Gym not found' },
    };
  }

  // Create account if it doesn't exist
  if (!gym.stripeAccountId) {
    const createResult = await createConnectAccount(gymId);
    if (!createResult.success) {
      return createResult;
    }
    gym.stripeAccountId = createResult.accountId;
  }

  try {
    const accountLink = await getStripe().accountLinks.create({
      account: gym.stripeAccountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return { success: true, url: accountLink.url };
  } catch (error) {
    console.error('Failed to create onboarding link:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to create onboarding link' },
    };
  }
}

/**
 * Get Connect account status
 */
export async function getConnectAccountStatus(
  gymId: string
): Promise<{
  success: true;
  status: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardingComplete: boolean;
  requirements?: Stripe.Account.Requirements;
} | { success: false; error: ApiError }> {
  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
  });

  if (!gym) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Gym not found' },
    };
  }

  if (!gym.stripeAccountId) {
    return {
      success: true,
      status: 'not_connected',
      chargesEnabled: false,
      payoutsEnabled: false,
      onboardingComplete: false,
    };
  }

  try {
    const account = await getStripe().accounts.retrieve(gym.stripeAccountId);

    const status = account.details_submitted
      ? account.charges_enabled
        ? 'active'
        : 'restricted'
      : 'onboarding';

    // Update gym with latest status
    await prisma.gym.update({
      where: { id: gymId },
      data: {
        stripeAccountStatus: status,
        stripeChargesEnabled: account.charges_enabled || false,
        stripePayoutsEnabled: account.payouts_enabled || false,
        stripeOnboardingComplete: account.details_submitted || false,
      },
    });

    return {
      success: true,
      status,
      chargesEnabled: account.charges_enabled || false,
      payoutsEnabled: account.payouts_enabled || false,
      onboardingComplete: account.details_submitted || false,
      requirements: account.requirements || undefined,
    };
  } catch (error) {
    console.error('Failed to get account status:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to get account status' },
    };
  }
}

/**
 * Create a checkout session with destination charge (Connect)
 */
export async function createConnectCheckoutSession(
  memberId: string,
  planId: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ success: true; sessionUrl: string } | { success: false; error: ApiError }> {
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

  const gym = member.gym;

  // Check if gym has Connect account and charges enabled
  if (!gym.stripeAccountId || !gym.stripeChargesEnabled) {
    // Fall back to regular checkout if Connect not set up
    return createCheckoutSession(memberId, planId, successUrl, cancelUrl);
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
    const syncResult = await syncPlanToStripe(planId);
    if (!syncResult.success) {
      return { success: false, error: syncResult.error! };
    }
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

  // Calculate application fee
  const platformFeePercent = Number(gym.stripePlatformFeePercent) || DEFAULT_PLATFORM_FEE_PERCENT;
  const unitAmount = Math.round(Number(plan.priceAmount) * 100);
  const applicationFeeAmount = Math.round(unitAmount * (platformFeePercent / 100));

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
        application_fee_percent: platformFeePercent,
        transfer_data: {
          destination: gym.stripeAccountId,
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
    console.error('Failed to create Connect checkout session:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to create checkout session' },
    };
  }
}

// ============================================
// REFUNDS
// ============================================

/**
 * Create a refund for a payment
 */
export async function createRefund(
  paymentId: string,
  amount: number | null, // null for full refund
  reason: string | null,
  processedById: string | null
): Promise<{ success: true; refundId: string } | { success: false; error: ApiError }> {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { gym: true },
  });

  if (!payment) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Payment not found' },
    };
  }

  if (!payment.stripePaymentId) {
    return {
      success: false,
      error: { code: ERROR_CODES.INVALID_INPUT, message: 'Payment cannot be refunded (no Stripe payment ID)' },
    };
  }

  const refundAmount = amount || Number(payment.amount);

  try {
    // Create refund in Stripe
    const stripeRefund = await getStripe().refunds.create({
      payment_intent: payment.stripePaymentId,
      amount: amount ? Math.round(amount * 100) : undefined, // undefined = full refund
      reason: reason === 'duplicate' ? 'duplicate' : reason === 'fraudulent' ? 'fraudulent' : 'requested_by_customer',
      metadata: {
        paymentId: payment.id,
        gymId: payment.gymId,
      },
    });

    // Create refund record in database
    const refund = await prisma.refund.create({
      data: {
        gymId: payment.gymId,
        paymentId: payment.id,
        amount: refundAmount,
        reason,
        status: stripeRefund.status === 'succeeded' ? RefundStatus.SUCCEEDED : RefundStatus.PENDING,
        stripeRefundId: stripeRefund.id,
        processedById,
        processedAt: stripeRefund.status === 'succeeded' ? new Date() : null,
      },
    });

    // Update payment status if fully refunded
    if (!amount || amount >= Number(payment.amount)) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'REFUNDED' },
      });
    }

    return { success: true, refundId: refund.id };
  } catch (error) {
    console.error('Failed to create refund:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to process refund' },
    };
  }
}

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

/**
 * Cancel a subscription (at period end)
 */
export async function cancelSubscription(
  memberId: string,
  cancelImmediately: boolean = false
): Promise<{ success: boolean; error?: ApiError }> {
  const subscription = await prisma.subscription.findUnique({
    where: { memberId },
    include: { member: true },
  });

  if (!subscription) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Subscription not found' },
    };
  }

  if (!subscription.stripeSubscriptionId) {
    return {
      success: false,
      error: { code: ERROR_CODES.INVALID_INPUT, message: 'No Stripe subscription to cancel' },
    };
  }

  try {
    if (cancelImmediately) {
      await getStripe().subscriptions.cancel(subscription.stripeSubscriptionId);
    } else {
      await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: !cancelImmediately,
        cancelledAt: cancelImmediately ? new Date() : null,
        status: cancelImmediately ? SubscriptionStatus.CANCELLED : subscription.status,
      },
    });

    if (cancelImmediately) {
      await prisma.member.update({
        where: { id: memberId },
        data: { status: MemberStatus.CANCELLED },
      });
    }

    return { success: true };
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to cancel subscription' },
    };
  }
}

/**
 * Pause a subscription
 */
export async function pauseSubscription(
  memberId: string,
  resumeAt?: Date
): Promise<{ success: boolean; error?: ApiError }> {
  const subscription = await prisma.subscription.findUnique({
    where: { memberId },
  });

  if (!subscription) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Subscription not found' },
    };
  }

  if (!subscription.stripeSubscriptionId) {
    return {
      success: false,
      error: { code: ERROR_CODES.INVALID_INPUT, message: 'No Stripe subscription to pause' },
    };
  }

  try {
    // Stripe uses "pause_collection" to pause subscriptions
    await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
      pause_collection: {
        behavior: 'mark_uncollectible',
        resumes_at: resumeAt ? Math.floor(resumeAt.getTime() / 1000) : undefined,
      },
    });

    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.PAUSED,
          pausedAt: new Date(),
          resumeAt: resumeAt || null,
        },
      });

      await tx.member.update({
        where: { id: memberId },
        data: { status: MemberStatus.PAUSED },
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to pause subscription:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to pause subscription' },
    };
  }
}

/**
 * Resume a paused subscription
 */
export async function resumeSubscription(
  memberId: string
): Promise<{ success: boolean; error?: ApiError }> {
  const subscription = await prisma.subscription.findUnique({
    where: { memberId },
  });

  if (!subscription) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Subscription not found' },
    };
  }

  if (!subscription.stripeSubscriptionId) {
    return {
      success: false,
      error: { code: ERROR_CODES.INVALID_INPUT, message: 'No Stripe subscription to resume' },
    };
  }

  try {
    await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
      pause_collection: '', // Empty string to resume
    } as Stripe.SubscriptionUpdateParams);

    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.ACTIVE,
          pausedAt: null,
          resumeAt: null,
        },
      });

      await tx.member.update({
        where: { id: memberId },
        data: { status: MemberStatus.ACTIVE },
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to resume subscription:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to resume subscription' },
    };
  }
}

/**
 * Undo cancellation (if cancellation is scheduled for period end)
 */
export async function undoCancellation(
  memberId: string
): Promise<{ success: boolean; error?: ApiError }> {
  const subscription = await prisma.subscription.findUnique({
    where: { memberId },
  });

  if (!subscription) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Subscription not found' },
    };
  }

  if (!subscription.cancelAtPeriodEnd) {
    return {
      success: false,
      error: { code: ERROR_CODES.INVALID_INPUT, message: 'Subscription is not scheduled for cancellation' },
    };
  }

  if (!subscription.stripeSubscriptionId) {
    return {
      success: false,
      error: { code: ERROR_CODES.INVALID_INPUT, message: 'No Stripe subscription found' },
    };
  }

  try {
    await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        cancelAtPeriodEnd: false,
        cancelledAt: null,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to undo cancellation:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to undo cancellation' },
    };
  }
}

// ============================================
// PAYMENT METHODS
// ============================================

/**
 * Create a SetupIntent for adding a new payment method
 */
export async function createSetupIntent(
  memberId: string
): Promise<{ success: true; clientSecret: string } | { success: false; error: ApiError }> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });

  if (!member) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Member not found' },
    };
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
    const setupIntent = await getStripe().setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      metadata: {
        memberId,
      },
    });

    if (!setupIntent.client_secret) {
      return {
        success: false,
        error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to create setup intent' },
      };
    }

    return { success: true, clientSecret: setupIntent.client_secret };
  } catch (error) {
    console.error('Failed to create setup intent:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to create setup intent' },
    };
  }
}

/**
 * List payment methods for a member
 */
export async function listPaymentMethods(
  memberId: string
): Promise<{ success: true; paymentMethods: Stripe.PaymentMethod[] } | { success: false; error: ApiError }> {
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
    return { success: true, paymentMethods: [] };
  }

  try {
    const paymentMethods = await getStripe().paymentMethods.list({
      customer: member.stripeCustomerId,
      type: 'card',
    });

    return { success: true, paymentMethods: paymentMethods.data };
  } catch (error) {
    console.error('Failed to list payment methods:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to list payment methods' },
    };
  }
}

/**
 * Delete a payment method
 */
export async function deletePaymentMethod(
  memberId: string,
  paymentMethodId: string
): Promise<{ success: boolean; error?: ApiError }> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });

  if (!member) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Member not found' },
    };
  }

  try {
    // Verify the payment method belongs to this customer
    const paymentMethod = await getStripe().paymentMethods.retrieve(paymentMethodId);
    if (paymentMethod.customer !== member.stripeCustomerId) {
      return {
        success: false,
        error: { code: ERROR_CODES.FORBIDDEN, message: 'Payment method does not belong to this member' },
      };
    }

    await getStripe().paymentMethods.detach(paymentMethodId);

    return { success: true };
  } catch (error) {
    console.error('Failed to delete payment method:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to delete payment method' },
    };
  }
}

/**
 * Set default payment method for a customer
 */
export async function setDefaultPaymentMethod(
  memberId: string,
  paymentMethodId: string
): Promise<{ success: boolean; error?: ApiError }> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
  });

  if (!member || !member.stripeCustomerId) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Member not found' },
    };
  }

  try {
    await getStripe().customers.update(member.stripeCustomerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to set default payment method:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to set default payment method' },
    };
  }
}

// ============================================
// INVOICES
// ============================================

/**
 * List invoices for a member
 */
export async function listMemberInvoices(
  memberId: string,
  limit: number = 10
): Promise<{ success: true; invoices: Stripe.Invoice[] } | { success: false; error: ApiError }> {
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
    return { success: true, invoices: [] };
  }

  try {
    const invoices = await getStripe().invoices.list({
      customer: member.stripeCustomerId,
      limit,
    });

    return { success: true, invoices: invoices.data };
  } catch (error) {
    console.error('Failed to list invoices:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to list invoices' },
    };
  }
}

// ============================================
// CONNECT PAYOUTS (for staff payroll)
// ============================================

/**
 * Create a transfer to a connected account (for payroll)
 */
export async function createTransfer(
  gymId: string,
  amount: number,
  destinationAccountId: string,
  description: string,
  metadata?: Record<string, string>
): Promise<{ success: true; transferId: string } | { success: false; error: ApiError }> {
  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
  });

  if (!gym) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Gym not found' },
    };
  }

  try {
    const transfer = await getStripe().transfers.create({
      amount: Math.round(amount * 100),
      currency: gym.currency.toLowerCase(),
      destination: destinationAccountId,
      description,
      metadata: {
        gymId,
        ...metadata,
      },
    });

    return { success: true, transferId: transfer.id };
  } catch (error) {
    console.error('Failed to create transfer:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to process transfer' },
    };
  }
}

// ============================================
// CONNECT WEBHOOK HANDLERS
// ============================================

/**
 * Handle Connect account.updated webhook
 */
export async function handleAccountUpdated(account: Stripe.Account): Promise<void> {
  const gymId = account.metadata?.gymId;

  if (!gymId) {
    console.error('No gymId in account metadata');
    return;
  }

  const status = account.details_submitted
    ? account.charges_enabled
      ? 'active'
      : 'restricted'
    : 'onboarding';

  await prisma.gym.update({
    where: { id: gymId },
    data: {
      stripeAccountStatus: status,
      stripeChargesEnabled: account.charges_enabled || false,
      stripePayoutsEnabled: account.payouts_enabled || false,
      stripeOnboardingComplete: account.details_submitted || false,
    },
  });
}

/**
 * Handle charge.refunded webhook
 */
async function handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
  // Find the refund record if it exists (might have been created manually)
  const refund = await prisma.refund.findFirst({
    where: { stripeRefundId: charge.id },
  });

  if (refund && refund.status !== RefundStatus.SUCCEEDED) {
    await prisma.refund.update({
      where: { id: refund.id },
      data: {
        status: RefundStatus.SUCCEEDED,
        processedAt: new Date(),
      },
    });
  }

  // Update payment status
  const payment = await prisma.payment.findFirst({
    where: { stripePaymentId: charge.payment_intent as string },
  });

  if (payment) {
    const chargeData = charge as unknown as { amount_refunded: number; amount: number };
    const isFullRefund = chargeData.amount_refunded === chargeData.amount;

    if (isFullRefund) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'REFUNDED' },
      });
    }
  }
}

/**
 * Handle payout.paid webhook
 */
async function handlePayoutPaid(payout: Stripe.Payout): Promise<void> {
  // Update payout record if exists
  const payoutRecord = await prisma.payout.findFirst({
    where: { stripePayoutId: payout.id },
  });

  if (payoutRecord) {
    await prisma.payout.update({
      where: { id: payoutRecord.id },
      data: {
        status: 'PAID',
        processedAt: new Date(),
      },
    });
  }
}

/**
 * Handle payout.failed webhook
 */
async function handlePayoutFailed(payout: Stripe.Payout): Promise<void> {
  // Update payout record if exists
  const payoutRecord = await prisma.payout.findFirst({
    where: { stripePayoutId: payout.id },
  });

  if (payoutRecord) {
    await prisma.payout.update({
      where: { id: payoutRecord.id },
      data: {
        status: 'FAILED',
      },
    });

    // Log failure for admin attention
    console.error(`Payout ${payout.id} failed:`, payout.failure_message);
  }
}

// ============================================
// DUNNING (Failed Payment Recovery)
// ============================================

/**
 * Record a failed payment attempt
 */
export async function recordFailedPayment(
  gymId: string,
  memberId: string,
  subscriptionId: string,
  amount: number,
  failureCode: string | null,
  failureMessage: string | null,
  stripeInvoiceId: string | null
): Promise<{ success: true; failedPaymentId: string } | { success: false; error: ApiError }> {
  try {
    // Check if there's an existing pending record for this invoice
    const existingRecord = stripeInvoiceId
      ? await prisma.failedPaymentAttempt.findFirst({
          where: {
            stripeInvoiceId,
            status: FailedPaymentStatus.PENDING,
          },
        })
      : null;

    if (existingRecord) {
      // Update attempt number and next retry date
      const nextAttempt = existingRecord.attemptNumber + 1;
      const nextRetryAt = calculateNextRetryDate(nextAttempt);

      const updated = await prisma.failedPaymentAttempt.update({
        where: { id: existingRecord.id },
        data: {
          attemptNumber: nextAttempt,
          failureCode,
          failureMessage,
          nextRetryAt,
          // After 4 attempts, mark as final failure
          status: nextAttempt >= 4 ? FailedPaymentStatus.FAILED_FINAL : FailedPaymentStatus.PENDING,
        },
      });

      // If final failure, pause the subscription
      if (nextAttempt >= 4) {
        await pauseSubscriptionForNonPayment(memberId);
      }

      return { success: true, failedPaymentId: updated.id };
    }

    // Create new failed payment record
    const nextRetryAt = calculateNextRetryDate(1);

    const failedPayment = await prisma.failedPaymentAttempt.create({
      data: {
        gymId,
        memberId,
        subscriptionId,
        amount,
        failureCode,
        failureMessage,
        stripeInvoiceId,
        attemptNumber: 1,
        nextRetryAt,
        status: FailedPaymentStatus.PENDING,
      },
    });

    return { success: true, failedPaymentId: failedPayment.id };
  } catch (error) {
    console.error('Failed to record failed payment:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to record failed payment' },
    };
  }
}

/**
 * Calculate next retry date based on attempt number
 * Day 0: Payment fails
 * Day 3: First retry
 * Day 7: Second retry
 * Day 14: Final retry
 */
function calculateNextRetryDate(attemptNumber: number): Date {
  const now = new Date();
  switch (attemptNumber) {
    case 1:
      return addDays(now, 3);
    case 2:
      return addDays(now, 4); // 7 days total
    case 3:
      return addDays(now, 7); // 14 days total
    default:
      return addDays(now, 30); // For written off, set far future
  }
}

/**
 * Pause subscription due to non-payment
 */
async function pauseSubscriptionForNonPayment(memberId: string): Promise<void> {
  const subscription = await prisma.subscription.findUnique({
    where: { memberId },
  });

  if (subscription && subscription.stripeSubscriptionId) {
    try {
      await getStripe().subscriptions.update(subscription.stripeSubscriptionId, {
        pause_collection: {
          behavior: 'mark_uncollectible',
        },
      });

      await prisma.$transaction(async (tx) => {
        await tx.subscription.update({
          where: { id: subscription.id },
          data: {
            status: SubscriptionStatus.PAUSED,
            pausedAt: new Date(),
          },
        });

        await tx.member.update({
          where: { id: memberId },
          data: { status: MemberStatus.PAUSED },
        });
      });
    } catch (error) {
      console.error('Failed to pause subscription for non-payment:', error);
    }
  }
}

/**
 * Handle invoice.payment_failed webhook
 */
export async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = invoice.customer as string;
  // In Stripe SDK v20+, access subscription via parent property or cast
  const invoiceData = invoice as unknown as { subscription?: string | { id: string } | null };
  const subscriptionId =
    typeof invoiceData.subscription === 'string'
      ? invoiceData.subscription
      : invoiceData.subscription?.id;

  if (!customerId || !subscriptionId) {
    console.error('Missing customer or subscription in failed invoice');
    return;
  }

  // Find member by Stripe customer ID
  const member = await prisma.member.findFirst({
    where: { stripeCustomerId: customerId },
    include: { subscription: true },
  });

  if (!member || !member.subscription) {
    console.error('Member or subscription not found for failed invoice');
    return;
  }

  const lastError = invoice.last_finalization_error;

  await recordFailedPayment(
    member.gymId,
    member.id,
    member.subscription.id,
    invoice.amount_due / 100,
    lastError?.code || null,
    lastError?.message || 'Payment failed',
    invoice.id
  );
}

/**
 * Retry a failed payment
 */
export async function retryFailedPayment(
  failedPaymentId: string
): Promise<{ success: boolean; error?: ApiError }> {
  const failedPayment = await prisma.failedPaymentAttempt.findUnique({
    where: { id: failedPaymentId },
    include: {
      member: true,
      subscription: true,
    },
  });

  if (!failedPayment) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Failed payment record not found' },
    };
  }

  if (failedPayment.status !== FailedPaymentStatus.PENDING) {
    return {
      success: false,
      error: { code: ERROR_CODES.INVALID_INPUT, message: 'Payment is not in pending status' },
    };
  }

  if (!failedPayment.stripeInvoiceId) {
    return {
      success: false,
      error: { code: ERROR_CODES.INVALID_INPUT, message: 'No Stripe invoice to retry' },
    };
  }

  try {
    // Retry the invoice payment
    const invoice = await getStripe().invoices.pay(failedPayment.stripeInvoiceId);

    if (invoice.status === 'paid') {
      // Mark as recovered
      await prisma.failedPaymentAttempt.update({
        where: { id: failedPaymentId },
        data: {
          status: FailedPaymentStatus.RECOVERED,
        },
      });

      // If subscription was paused, resume it
      if (failedPayment.member.status === MemberStatus.PAUSED) {
        await resumeSubscription(failedPayment.memberId);
      }

      return { success: true };
    } else {
      // Payment still failed, update attempt count
      const nextAttempt = failedPayment.attemptNumber + 1;

      await prisma.failedPaymentAttempt.update({
        where: { id: failedPaymentId },
        data: {
          attemptNumber: nextAttempt,
          nextRetryAt: calculateNextRetryDate(nextAttempt),
          status: nextAttempt >= 4 ? FailedPaymentStatus.FAILED_FINAL : FailedPaymentStatus.PENDING,
        },
      });

      return {
        success: false,
        error: { code: ERROR_CODES.PAYMENT_FAILED, message: 'Payment retry failed' },
      };
    }
  } catch (error) {
    console.error('Failed to retry payment:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to retry payment' },
    };
  }
}

/**
 * Write off a failed payment (mark as bad debt)
 */
export async function writeOffFailedPayment(
  failedPaymentId: string
): Promise<{ success: boolean; error?: ApiError }> {
  const failedPayment = await prisma.failedPaymentAttempt.findUnique({
    where: { id: failedPaymentId },
  });

  if (!failedPayment) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Failed payment record not found' },
    };
  }

  if (failedPayment.status === FailedPaymentStatus.RECOVERED) {
    return {
      success: false,
      error: { code: ERROR_CODES.INVALID_INPUT, message: 'Cannot write off a recovered payment' },
    };
  }

  try {
    // Mark the invoice as uncollectible in Stripe
    if (failedPayment.stripeInvoiceId) {
      try {
        await getStripe().invoices.markUncollectible(failedPayment.stripeInvoiceId);
      } catch (stripeError) {
        // Invoice might already be voided or in a different state
        console.warn('Could not mark invoice as uncollectible:', stripeError);
      }
    }

    await prisma.failedPaymentAttempt.update({
      where: { id: failedPaymentId },
      data: {
        status: FailedPaymentStatus.WRITTEN_OFF,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to write off payment:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to write off payment' },
    };
  }
}

/**
 * Get failed payments for a gym
 */
export async function getFailedPayments(
  gymId: string,
  status?: FailedPaymentStatus,
  page: number = 1,
  limit: number = 20
): Promise<{
  success: true;
  items: Array<{
    id: string;
    amount: number;
    failureCode: string | null;
    failureMessage: string | null;
    attemptNumber: number;
    nextRetryAt: Date | null;
    status: string;
    createdAt: Date;
    member: {
      id: string;
      firstName: string;
      lastName: string;
      email: string;
    };
    subscription: {
      id: string;
      plan: {
        name: string;
      } | null;
    };
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
} | { success: false; error: ApiError }> {
  try {
    const skip = (page - 1) * limit;

    const where = {
      gymId,
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      prisma.failedPaymentAttempt.findMany({
        where,
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          subscription: {
            include: {
              plan: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.failedPaymentAttempt.count({ where }),
    ]);

    return {
      success: true,
      items: items.map((item) => ({
        id: item.id,
        amount: Number(item.amount),
        failureCode: item.failureCode,
        failureMessage: item.failureMessage,
        attemptNumber: item.attemptNumber,
        nextRetryAt: item.nextRetryAt,
        status: item.status,
        createdAt: item.createdAt,
        member: item.member,
        subscription: {
          id: item.subscription.id,
          plan: item.subscription.plan,
        },
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Failed to get failed payments:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to load failed payments' },
    };
  }
}

// ============================================
// PAYROLL MANAGEMENT
// ============================================

/**
 * Create a new payroll period
 */
export async function createPayrollPeriod(
  gymId: string,
  startDate: Date,
  endDate: Date
): Promise<{ success: true; payrollPeriodId: string } | { success: false; error: ApiError }> {
  try {
    // Check for overlapping periods
    const overlapping = await prisma.payrollPeriod.findFirst({
      where: {
        gymId,
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (overlapping) {
      return {
        success: false,
        error: { code: ERROR_CODES.CONFLICT, message: 'Overlapping payroll period exists' },
      };
    }

    const payrollPeriod = await prisma.payrollPeriod.create({
      data: {
        gymId,
        startDate,
        endDate,
        status: PayrollStatus.DRAFT,
        totalAmount: 0,
      },
    });

    return { success: true, payrollPeriodId: payrollPeriod.id };
  } catch (error) {
    console.error('Failed to create payroll period:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to create payroll period' },
    };
  }
}

/**
 * Get payroll periods for a gym
 */
export async function getPayrollPeriods(
  gymId: string,
  status?: PayrollStatus,
  page: number = 1,
  limit: number = 20
): Promise<{
  success: true;
  items: Array<{
    id: string;
    startDate: Date;
    endDate: Date;
    status: string;
    totalAmount: number;
    paidAt: Date | null;
    entriesCount: number;
    createdAt: Date;
  }>;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
} | { success: false; error: ApiError }> {
  try {
    const skip = (page - 1) * limit;

    const where = {
      gymId,
      ...(status && { status }),
    };

    const [items, total] = await Promise.all([
      prisma.payrollPeriod.findMany({
        where,
        include: {
          _count: {
            select: { entries: true },
          },
        },
        orderBy: { startDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payrollPeriod.count({ where }),
    ]);

    return {
      success: true,
      items: items.map((item) => ({
        id: item.id,
        startDate: item.startDate,
        endDate: item.endDate,
        status: item.status,
        totalAmount: Number(item.totalAmount),
        paidAt: item.paidAt,
        entriesCount: item._count.entries,
        createdAt: item.createdAt,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    console.error('Failed to get payroll periods:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to load payroll periods' },
    };
  }
}

/**
 * Get a specific payroll period with entries
 */
export async function getPayrollPeriod(
  gymId: string,
  payrollPeriodId: string
): Promise<{
  success: true;
  period: {
    id: string;
    startDate: Date;
    endDate: Date;
    status: string;
    totalAmount: number;
    paidAt: Date | null;
    createdAt: Date;
    entries: Array<{
      id: string;
      baseAmount: number;
      commissionsAmount: number;
      bonusAmount: number;
      deductionsAmount: number;
      totalAmount: number;
      stripeTransferId: string | null;
      paidAt: Date | null;
      notes: string | null;
      staff: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        role: string;
      };
    }>;
  };
} | { success: false; error: ApiError }> {
  try {
    const period = await prisma.payrollPeriod.findFirst({
      where: {
        id: payrollPeriodId,
        gymId,
      },
      include: {
        entries: {
          include: {
            staff: {
              include: {
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!period) {
      return {
        success: false,
        error: { code: ERROR_CODES.NOT_FOUND, message: 'Payroll period not found' },
      };
    }

    return {
      success: true,
      period: {
        id: period.id,
        startDate: period.startDate,
        endDate: period.endDate,
        status: period.status,
        totalAmount: Number(period.totalAmount),
        paidAt: period.paidAt,
        createdAt: period.createdAt,
        entries: period.entries.map((entry) => ({
          id: entry.id,
          baseAmount: Number(entry.baseAmount),
          commissionsAmount: Number(entry.commissionsAmount),
          bonusAmount: Number(entry.bonusAmount),
          deductionsAmount: Number(entry.deductionsAmount),
          totalAmount: Number(entry.totalAmount),
          stripeTransferId: entry.stripeTransferId,
          paidAt: entry.paidAt,
          notes: entry.notes,
          staff: {
            id: entry.staff.id,
            firstName: entry.staff.firstName,
            lastName: entry.staff.lastName,
            email: entry.staff.user.email,
            role: entry.staff.role,
          },
        })),
      },
    };
  } catch (error) {
    console.error('Failed to get payroll period:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to load payroll period' },
    };
  }
}

/**
 * Add a payroll entry
 */
export async function addPayrollEntry(
  gymId: string,
  payrollPeriodId: string,
  staffId: string,
  data: {
    baseAmount: number;
    commissionsAmount?: number;
    bonusAmount?: number;
    deductionsAmount?: number;
    notes?: string;
  }
): Promise<{ success: true; entryId: string } | { success: false; error: ApiError }> {
  try {
    const period = await prisma.payrollPeriod.findFirst({
      where: {
        id: payrollPeriodId,
        gymId,
      },
    });

    if (!period) {
      return {
        success: false,
        error: { code: ERROR_CODES.NOT_FOUND, message: 'Payroll period not found' },
      };
    }

    if (period.status !== PayrollStatus.DRAFT) {
      return {
        success: false,
        error: { code: ERROR_CODES.INVALID_INPUT, message: 'Can only add entries to draft payroll periods' },
      };
    }

    // Check staff exists and belongs to gym
    const staff = await prisma.staff.findFirst({
      where: {
        id: staffId,
        gymId,
      },
    });

    if (!staff) {
      return {
        success: false,
        error: { code: ERROR_CODES.NOT_FOUND, message: 'Staff member not found' },
      };
    }

    // Check for duplicate entry
    const existingEntry = await prisma.payrollEntry.findFirst({
      where: {
        payrollPeriodId,
        staffId,
      },
    });

    if (existingEntry) {
      return {
        success: false,
        error: { code: ERROR_CODES.CONFLICT, message: 'Entry for this staff member already exists in this period' },
      };
    }

    const totalAmount =
      data.baseAmount +
      (data.commissionsAmount || 0) +
      (data.bonusAmount || 0) -
      (data.deductionsAmount || 0);

    const entry = await prisma.payrollEntry.create({
      data: {
        payrollPeriodId,
        staffId,
        baseAmount: data.baseAmount,
        commissionsAmount: data.commissionsAmount || 0,
        bonusAmount: data.bonusAmount || 0,
        deductionsAmount: data.deductionsAmount || 0,
        totalAmount,
        notes: data.notes,
      },
    });

    // Update period total
    await updatePayrollPeriodTotal(payrollPeriodId);

    return { success: true, entryId: entry.id };
  } catch (error) {
    console.error('Failed to add payroll entry:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to add payroll entry' },
    };
  }
}

/**
 * Update a payroll entry
 */
export async function updatePayrollEntry(
  gymId: string,
  entryId: string,
  data: {
    baseAmount?: number;
    commissionsAmount?: number;
    bonusAmount?: number;
    deductionsAmount?: number;
    notes?: string;
  }
): Promise<{ success: boolean; error?: ApiError }> {
  try {
    const entry = await prisma.payrollEntry.findUnique({
      where: { id: entryId },
      include: {
        payrollPeriod: true,
      },
    });

    if (!entry || entry.payrollPeriod.gymId !== gymId) {
      return {
        success: false,
        error: { code: ERROR_CODES.NOT_FOUND, message: 'Payroll entry not found' },
      };
    }

    if (entry.payrollPeriod.status !== PayrollStatus.DRAFT) {
      return {
        success: false,
        error: { code: ERROR_CODES.INVALID_INPUT, message: 'Can only update entries in draft payroll periods' },
      };
    }

    const baseAmount = data.baseAmount ?? Number(entry.baseAmount);
    const commissionsAmount = data.commissionsAmount ?? Number(entry.commissionsAmount);
    const bonusAmount = data.bonusAmount ?? Number(entry.bonusAmount);
    const deductionsAmount = data.deductionsAmount ?? Number(entry.deductionsAmount);
    const totalAmount = baseAmount + commissionsAmount + bonusAmount - deductionsAmount;

    await prisma.payrollEntry.update({
      where: { id: entryId },
      data: {
        baseAmount,
        commissionsAmount,
        bonusAmount,
        deductionsAmount,
        totalAmount,
        notes: data.notes !== undefined ? data.notes : entry.notes,
      },
    });

    // Update period total
    await updatePayrollPeriodTotal(entry.payrollPeriodId);

    return { success: true };
  } catch (error) {
    console.error('Failed to update payroll entry:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to update payroll entry' },
    };
  }
}

/**
 * Delete a payroll entry
 */
export async function deletePayrollEntry(
  gymId: string,
  entryId: string
): Promise<{ success: boolean; error?: ApiError }> {
  try {
    const entry = await prisma.payrollEntry.findUnique({
      where: { id: entryId },
      include: {
        payrollPeriod: true,
      },
    });

    if (!entry || entry.payrollPeriod.gymId !== gymId) {
      return {
        success: false,
        error: { code: ERROR_CODES.NOT_FOUND, message: 'Payroll entry not found' },
      };
    }

    if (entry.payrollPeriod.status !== PayrollStatus.DRAFT) {
      return {
        success: false,
        error: { code: ERROR_CODES.INVALID_INPUT, message: 'Can only delete entries in draft payroll periods' },
      };
    }

    await prisma.payrollEntry.delete({
      where: { id: entryId },
    });

    // Update period total
    await updatePayrollPeriodTotal(entry.payrollPeriodId);

    return { success: true };
  } catch (error) {
    console.error('Failed to delete payroll entry:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to delete payroll entry' },
    };
  }
}

/**
 * Helper to update payroll period total
 */
async function updatePayrollPeriodTotal(payrollPeriodId: string): Promise<void> {
  const entries = await prisma.payrollEntry.findMany({
    where: { payrollPeriodId },
    select: { totalAmount: true },
  });

  const total = entries.reduce((sum, e) => sum + Number(e.totalAmount), 0);

  await prisma.payrollPeriod.update({
    where: { id: payrollPeriodId },
    data: { totalAmount: total },
  });
}

/**
 * Approve a payroll period
 */
export async function approvePayroll(
  gymId: string,
  payrollPeriodId: string
): Promise<{ success: boolean; error?: ApiError }> {
  try {
    const period = await prisma.payrollPeriod.findFirst({
      where: {
        id: payrollPeriodId,
        gymId,
      },
      include: {
        _count: {
          select: { entries: true },
        },
      },
    });

    if (!period) {
      return {
        success: false,
        error: { code: ERROR_CODES.NOT_FOUND, message: 'Payroll period not found' },
      };
    }

    if (period.status !== PayrollStatus.DRAFT) {
      return {
        success: false,
        error: { code: ERROR_CODES.INVALID_INPUT, message: 'Can only approve draft payroll periods' },
      };
    }

    if (period._count.entries === 0) {
      return {
        success: false,
        error: { code: ERROR_CODES.INVALID_INPUT, message: 'Cannot approve a payroll period with no entries' },
      };
    }

    await prisma.payrollPeriod.update({
      where: { id: payrollPeriodId },
      data: { status: PayrollStatus.APPROVED },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to approve payroll:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to approve payroll' },
    };
  }
}

/**
 * Process payroll (create Stripe transfers)
 * Note: This is a simplified version. In production, you would need to
 * handle staff Stripe account setup and bank verification.
 */
export async function processPayroll(
  gymId: string,
  payrollPeriodId: string
): Promise<{ success: boolean; error?: ApiError; processedCount?: number; failedCount?: number }> {
  const period = await prisma.payrollPeriod.findFirst({
    where: {
      id: payrollPeriodId,
      gymId,
    },
    include: {
      gym: true,
      entries: {
        include: {
          staff: true,
        },
      },
    },
  });

  if (!period) {
    return {
      success: false,
      error: { code: ERROR_CODES.NOT_FOUND, message: 'Payroll period not found' },
    };
  }

  if (period.status !== PayrollStatus.APPROVED) {
    return {
      success: false,
      error: { code: ERROR_CODES.INVALID_INPUT, message: 'Can only process approved payroll periods' },
    };
  }

  // Check if gym has a connected Stripe account
  if (!period.gym.stripeAccountId) {
    return {
      success: false,
      error: { code: ERROR_CODES.INVALID_INPUT, message: 'Gym does not have a connected Stripe account' },
    };
  }

  try {
    // Mark as processing
    await prisma.payrollPeriod.update({
      where: { id: payrollPeriodId },
      data: { status: PayrollStatus.PROCESSING },
    });

    let processedCount = 0;
    let failedCount = 0;

    // Process each entry
    for (const entry of period.entries) {
      // Skip already paid entries
      if (entry.paidAt) {
        processedCount++;
        continue;
      }

      // For now, we'll mark entries as paid without actual Stripe transfers
      // In production, you would:
      // 1. Check if staff has a connected Stripe Express account or bank details
      // 2. Create a transfer to their account
      // 3. Store the transfer ID

      try {
        // In a real implementation, you would create a Stripe transfer here:
        // const transfer = await getStripe().transfers.create({
        //   amount: Math.round(Number(entry.totalAmount) * 100),
        //   currency: period.gym.currency.toLowerCase(),
        //   destination: staff.stripeAccountId,
        //   description: `Payroll for ${period.startDate.toISOString().split('T')[0]} - ${period.endDate.toISOString().split('T')[0]}`,
        // });

        await prisma.payrollEntry.update({
          where: { id: entry.id },
          data: {
            paidAt: new Date(),
            // stripeTransferId: transfer.id,
          },
        });

        processedCount++;
      } catch (error) {
        console.error(`Failed to process entry ${entry.id}:`, error);
        failedCount++;
      }
    }

    // Update period status
    const newStatus = failedCount === 0 ? PayrollStatus.PAID : PayrollStatus.FAILED;

    await prisma.payrollPeriod.update({
      where: { id: payrollPeriodId },
      data: {
        status: newStatus,
        paidAt: failedCount === 0 ? new Date() : null,
      },
    });

    return {
      success: failedCount === 0,
      processedCount,
      failedCount,
      error: failedCount > 0
        ? { code: ERROR_CODES.INTERNAL_ERROR, message: `Failed to process ${failedCount} entries` }
        : undefined,
    };
  } catch (error) {
    console.error('Failed to process payroll:', error);

    // Revert to approved status
    await prisma.payrollPeriod.update({
      where: { id: payrollPeriodId },
      data: { status: PayrollStatus.APPROVED },
    });

    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to process payroll' },
    };
  }
}

/**
 * Delete a payroll period (only draft)
 */
export async function deletePayrollPeriod(
  gymId: string,
  payrollPeriodId: string
): Promise<{ success: boolean; error?: ApiError }> {
  try {
    const period = await prisma.payrollPeriod.findFirst({
      where: {
        id: payrollPeriodId,
        gymId,
      },
    });

    if (!period) {
      return {
        success: false,
        error: { code: ERROR_CODES.NOT_FOUND, message: 'Payroll period not found' },
      };
    }

    if (period.status !== PayrollStatus.DRAFT) {
      return {
        success: false,
        error: { code: ERROR_CODES.INVALID_INPUT, message: 'Can only delete draft payroll periods' },
      };
    }

    // Delete period (entries will cascade)
    await prisma.payrollPeriod.delete({
      where: { id: payrollPeriodId },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to delete payroll period:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to delete payroll period' },
    };
  }
}
