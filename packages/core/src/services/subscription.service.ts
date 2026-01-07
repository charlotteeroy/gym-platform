import {
  prisma,
  type MembershipPlan,
  type Subscription,
  SubscriptionStatus,
  MemberStatus,
} from '@gym/database';
import {
  type CreateMembershipPlanInput,
  type UpdateMembershipPlanInput,
  BILLING_INTERVAL_DAYS,
  ERROR_CODES,
  type ApiError,
} from '@gym/shared';
import { addDays } from '@gym/shared';

export type PlanResult =
  | { success: true; plan: MembershipPlan }
  | { success: false; error: ApiError };

export type SubscriptionResult =
  | { success: true; subscription: Subscription }
  | { success: false; error: ApiError };

/**
 * Create a membership plan
 */
export async function createMembershipPlan(
  gymId: string,
  input: CreateMembershipPlanInput
): Promise<PlanResult> {
  const plan = await prisma.membershipPlan.create({
    data: {
      ...input,
      gymId,
    },
  });

  return { success: true, plan };
}

/**
 * Get membership plan by ID
 */
export async function getMembershipPlanById(planId: string): Promise<MembershipPlan | null> {
  return prisma.membershipPlan.findUnique({
    where: { id: planId },
  });
}

/**
 * Update membership plan
 */
export async function updateMembershipPlan(
  planId: string,
  input: UpdateMembershipPlanInput
): Promise<PlanResult> {
  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Membership plan not found',
      },
    };
  }

  const updatedPlan = await prisma.membershipPlan.update({
    where: { id: planId },
    data: input,
  });

  return { success: true, plan: updatedPlan };
}

/**
 * List membership plans for a gym
 */
export async function listMembershipPlans(
  gymId: string,
  options: { includeInactive?: boolean } = {}
): Promise<MembershipPlan[]> {
  const { includeInactive = false } = options;

  return prisma.membershipPlan.findMany({
    where: {
      gymId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: { priceAmount: 'asc' },
  });
}

/**
 * Assign a subscription to a member
 */
export async function assignSubscription(
  memberId: string,
  planId: string,
  startDate: Date = new Date()
): Promise<SubscriptionResult> {
  const member = await prisma.member.findUnique({
    where: { id: memberId },
    include: { subscription: true },
  });

  if (!member) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Member not found',
      },
    };
  }

  // Cancel existing subscription if any
  if (member.subscription) {
    await prisma.subscription.update({
      where: { id: member.subscription.id },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });
  }

  const plan = await prisma.membershipPlan.findUnique({
    where: { id: planId },
  });

  if (!plan) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Membership plan not found',
      },
    };
  }

  if (!plan.isActive) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.INVALID_INPUT,
        message: 'Membership plan is not active',
      },
    };
  }

  // Calculate period end
  const days = BILLING_INTERVAL_DAYS[plan.billingInterval];
  const currentPeriodEnd = addDays(startDate, days);

  // Create subscription and update member status
  const subscription = await prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.create({
      data: {
        memberId,
        planId,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: startDate,
        currentPeriodEnd,
      },
    });

    await tx.member.update({
      where: { id: memberId },
      data: { status: MemberStatus.ACTIVE },
    });

    return sub;
  });

  return { success: true, subscription };
}

/**
 * Get member's subscription
 */
export async function getMemberSubscription(
  memberId: string
): Promise<(Subscription & { plan: MembershipPlan }) | null> {
  return prisma.subscription.findUnique({
    where: { memberId },
    include: { plan: true },
  });
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelImmediately = false
): Promise<SubscriptionResult> {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
  });

  if (!subscription) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Subscription not found',
      },
    };
  }

  if (cancelImmediately) {
    const updated = await prisma.$transaction(async (tx) => {
      const sub = await tx.subscription.update({
        where: { id: subscriptionId },
        data: {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: new Date(),
        },
      });

      await tx.member.update({
        where: { id: subscription.memberId },
        data: { status: MemberStatus.CANCELLED },
      });

      return sub;
    });

    return { success: true, subscription: updated };
  } else {
    // Cancel at period end
    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: { cancelAtPeriodEnd: true },
    });

    return { success: true, subscription: updated };
  }
}

/**
 * Pause a subscription
 */
export async function pauseSubscription(subscriptionId: string): Promise<SubscriptionResult> {
  const updated = await prisma.$transaction(async (tx) => {
    const subscription = await tx.subscription.update({
      where: { id: subscriptionId },
      data: { status: SubscriptionStatus.PAUSED },
    });

    await tx.member.update({
      where: { id: subscription.memberId },
      data: { status: MemberStatus.PAUSED },
    });

    return subscription;
  });

  return { success: true, subscription: updated };
}

/**
 * Resume a paused subscription
 */
export async function resumeSubscription(subscriptionId: string): Promise<SubscriptionResult> {
  const subscription = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });

  if (!subscription) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.NOT_FOUND,
        message: 'Subscription not found',
      },
    };
  }

  if (subscription.status !== SubscriptionStatus.PAUSED) {
    return {
      success: false,
      error: {
        code: ERROR_CODES.INVALID_INPUT,
        message: 'Subscription is not paused',
      },
    };
  }

  // Calculate new period dates
  const now = new Date();
  const days = BILLING_INTERVAL_DAYS[subscription.plan.billingInterval];
  const currentPeriodEnd = addDays(now, days);

  const updated = await prisma.$transaction(async (tx) => {
    const sub = await tx.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: now,
        currentPeriodEnd,
        cancelAtPeriodEnd: false,
      },
    });

    await tx.member.update({
      where: { id: subscription.memberId },
      data: { status: MemberStatus.ACTIVE },
    });

    return sub;
  });

  return { success: true, subscription: updated };
}

/**
 * Process expired subscriptions (to be run as a cron job)
 */
export async function processExpiredSubscriptions(): Promise<number> {
  const now = new Date();

  // Find subscriptions that have ended and should be cancelled
  const expiredSubscriptions = await prisma.subscription.findMany({
    where: {
      status: SubscriptionStatus.ACTIVE,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: { lte: now },
    },
  });

  for (const subscription of expiredSubscriptions) {
    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: SubscriptionStatus.CANCELLED,
          cancelledAt: now,
        },
      });

      await tx.member.update({
        where: { id: subscription.memberId },
        data: { status: MemberStatus.CANCELLED },
      });
    });
  }

  return expiredSubscriptions.length;
}
