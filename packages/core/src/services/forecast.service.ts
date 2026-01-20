/**
 * Revenue Forecasting & Churn Prediction Service
 *
 * Purpose: Provides 30/60/90-day revenue projections and churn risk analysis
 * Product Context: Supports Owner Pillar - "Long-term Resilience" with predictive analytics
 *
 * @see CLAUDE.md - Revenue Forecasting & Churn Prediction Feature
 */

import { prisma } from '@gym/database';

// =============================================================================
// TYPES
// =============================================================================

export interface RevenueForecast {
  period: '30day' | '60day' | '90day';
  days: number;
  projectedRevenue: number;
  confidenceLow: number;
  confidenceHigh: number;
  expectedChurn: number;
  expectedChurnRevenue: number;
  scheduledCancellations: number;
  scheduledCancellationRevenue: number;
  renewals: number;
  renewalRevenue: number;
  growthRate: number;
}

export interface ChurnRiskMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  riskScore: number;
  riskFactors: string[];
  subscriptionValue: number;
  lastActivity: Date | null;
  daysSinceActivity: number;
  subscriptionEnds: Date | null;
  cancelAtPeriodEnd: boolean;
  subscriptionStatus: string;
}

export interface ChurnMetrics {
  atRiskCount: number;
  atRiskRevenue: number;
  scheduledCancellations: number;
  scheduledCancellationRevenue: number;
  churnRateThisMonth: number;
  churnRatePreviousMonth: number;
  churnRateTrend: 'up' | 'down' | 'stable';
  historicalChurnRate: number;
}

export interface ForecastData {
  currentMRR: number;
  normalizedMRR: number;
  activeSubscriptions: number;
  avgSubscriptionValue: number;
  forecasts: RevenueForecast[];
  churn: ChurnMetrics;
  atRiskMembers: ChurnRiskMember[];
  history: {
    months: string[];
    actualRevenue: number[];
  };
  renewalsByWeek: {
    week: string;
    startDate: string;
    count: number;
    revenue: number;
  }[];
}

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Multipliers to convert billing intervals to monthly equivalent
 * Used for normalizing MRR calculation
 */
const MONTHLY_MULTIPLIER: Record<string, number> = {
  WEEKLY: 4.33,     // 52 weeks / 12 months
  MONTHLY: 1,
  QUARTERLY: 0.333, // 1/3
  YEARLY: 0.0833,   // 1/12
};

/**
 * Risk weights for churn prediction
 */
const RISK_WEIGHTS = {
  NO_ACTIVITY_14_DAYS: 25,
  NO_ACTIVITY_30_DAYS: 20,
  NEVER_CHECKED_IN: 15,
  NO_RECENT_BOOKINGS: 10,
  CANCEL_AT_PERIOD_END: 30,
  PAST_DUE_STATUS: 20,
  NEW_MEMBER_90_DAYS: 5,
  ACTIVITY_DECLINE_50_PERCENT: 15,
};

// =============================================================================
// MRR CALCULATION
// =============================================================================

/**
 * Calculate normalized Monthly Recurring Revenue
 * Accounts for different billing intervals (weekly, monthly, quarterly, yearly)
 */
export async function calculateNormalizedMRR(gymId: string): Promise<{
  currentMRR: number;
  normalizedMRR: number;
  activeSubscriptions: number;
  avgSubscriptionValue: number;
  subscriptionsByPlan: { planName: string; count: number; revenue: number }[];
}> {
  const subscriptions = await prisma.subscription.findMany({
    where: {
      member: { gymId },
      status: 'ACTIVE',
    },
    include: {
      plan: true,
    },
  });

  let normalizedMRR = 0;
  const planBreakdown: Record<string, { count: number; revenue: number; name: string }> = {};

  for (const sub of subscriptions) {
    const multiplier = MONTHLY_MULTIPLIER[sub.plan.billingInterval] || 1;
    const monthlyValue = Number(sub.plan.priceAmount) * multiplier;
    normalizedMRR += monthlyValue;

    // Track by plan - ensure we have an entry first
    const existingPlan = planBreakdown[sub.planId];
    if (existingPlan) {
      existingPlan.count++;
      existingPlan.revenue += monthlyValue;
    } else {
      planBreakdown[sub.planId] = { count: 1, revenue: monthlyValue, name: sub.plan.name };
    }
  }

  const subscriptionsByPlan = Object.values(planBreakdown).map((p) => ({
    planName: p.name,
    count: p.count,
    revenue: Math.round(p.revenue * 100) / 100,
  }));

  const activeSubscriptions = subscriptions.length;
  const avgSubscriptionValue = activeSubscriptions > 0
    ? normalizedMRR / activeSubscriptions
    : 0;

  // Current MRR (simple sum without normalization for comparison)
  const currentMRR = subscriptions.reduce(
    (sum, sub) => sum + Number(sub.plan.priceAmount),
    0
  );

  return {
    currentMRR: Math.round(currentMRR * 100) / 100,
    normalizedMRR: Math.round(normalizedMRR * 100) / 100,
    activeSubscriptions,
    avgSubscriptionValue: Math.round(avgSubscriptionValue * 100) / 100,
    subscriptionsByPlan,
  };
}

// =============================================================================
// CHURN RISK ANALYSIS
// =============================================================================

/**
 * Calculate churn risk score for each active member
 * Returns members sorted by risk score (highest first)
 */
export async function getMemberChurnRisk(
  gymId: string,
  limit = 10
): Promise<ChurnRiskMember[]> {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Get active members with subscription and activity data
  const members = await prisma.member.findMany({
    where: {
      gymId,
      status: 'ACTIVE',
      subscription: {
        status: { in: ['ACTIVE', 'PAST_DUE'] },
      },
    },
    include: {
      subscription: {
        include: { plan: true },
      },
      checkIns: {
        where: { checkedInAt: { gte: sixtyDaysAgo } },
        orderBy: { checkedInAt: 'desc' },
      },
      bookings: {
        where: { createdAt: { gte: thirtyDaysAgo } },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  const atRiskMembers: ChurnRiskMember[] = [];

  for (const member of members) {
    const riskFactors: string[] = [];
    let riskScore = 0;

    // Calculate last activity
    const lastCheckIn = member.checkIns[0]?.checkedInAt || null;
    const lastBooking = member.bookings[0]?.createdAt || null;
    const lastActivity = lastCheckIn
      ? (lastBooking ? (lastCheckIn > lastBooking ? lastCheckIn : lastBooking) : lastCheckIn)
      : lastBooking;

    const daysSinceActivity = lastActivity
      ? Math.floor((now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // Risk factor: No activity in 14+ days
    if (daysSinceActivity >= 14 && daysSinceActivity < 30) {
      riskScore += RISK_WEIGHTS.NO_ACTIVITY_14_DAYS;
      riskFactors.push(`No activity in ${daysSinceActivity} days`);
    }

    // Risk factor: No activity in 30+ days
    if (daysSinceActivity >= 30) {
      riskScore += RISK_WEIGHTS.NO_ACTIVITY_30_DAYS;
      riskFactors.push(`Dormant for ${daysSinceActivity} days`);
    }

    // Risk factor: Never checked in
    if (!lastCheckIn) {
      riskScore += RISK_WEIGHTS.NEVER_CHECKED_IN;
      riskFactors.push('Never checked in');
    }

    // Risk factor: No recent bookings
    if (member.bookings.length === 0) {
      riskScore += RISK_WEIGHTS.NO_RECENT_BOOKINGS;
      riskFactors.push('No class bookings in 30 days');
    }

    // Risk factor: Subscription set to cancel
    if (member.subscription?.cancelAtPeriodEnd) {
      riskScore += RISK_WEIGHTS.CANCEL_AT_PERIOD_END;
      riskFactors.push('Scheduled to cancel');
    }

    // Risk factor: Past due subscription
    if (member.subscription?.status === 'PAST_DUE') {
      riskScore += RISK_WEIGHTS.PAST_DUE_STATUS;
      riskFactors.push('Payment past due');
    }

    // Risk factor: New member (under 90 days tenure)
    if (member.joinedAt > ninetyDaysAgo) {
      riskScore += RISK_WEIGHTS.NEW_MEMBER_90_DAYS;
      riskFactors.push('New member (< 90 days)');
    }

    // Risk factor: Activity decline (compare last 30 days to 30-60 days ago)
    const recentCheckIns = member.checkIns.filter(c => new Date(c.checkedInAt) >= thirtyDaysAgo).length;
    const previousCheckIns = member.checkIns.filter(
      c => new Date(c.checkedInAt) >= sixtyDaysAgo && new Date(c.checkedInAt) < thirtyDaysAgo
    ).length;

    if (previousCheckIns > 0 && recentCheckIns < previousCheckIns * 0.5) {
      riskScore += RISK_WEIGHTS.ACTIVITY_DECLINE_50_PERCENT;
      riskFactors.push('Activity dropped 50%+');
    }

    // Calculate subscription value (normalized to monthly)
    const subscriptionValue = member.subscription?.plan
      ? Number(member.subscription.plan.priceAmount) *
        (MONTHLY_MULTIPLIER[member.subscription.plan.billingInterval] || 1)
      : 0;

    // Only include members with meaningful risk
    if (riskScore >= 25) {
      atRiskMembers.push({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        riskScore: Math.min(100, riskScore),
        riskFactors,
        subscriptionValue: Math.round(subscriptionValue * 100) / 100,
        lastActivity,
        daysSinceActivity,
        subscriptionEnds: member.subscription?.currentPeriodEnd || null,
        cancelAtPeriodEnd: member.subscription?.cancelAtPeriodEnd || false,
        subscriptionStatus: member.subscription?.status || 'NONE',
      });
    }
  }

  // Sort by risk score (highest first) and limit
  return atRiskMembers
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, limit);
}

/**
 * Get aggregate churn metrics for the gym
 */
export async function getChurnMetrics(gymId: string): Promise<ChurnMetrics> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // Get at-risk members
  const atRiskMembers = await getMemberChurnRisk(gymId, 100);
  const atRiskCount = atRiskMembers.length;
  const atRiskRevenue = atRiskMembers.reduce((sum, m) => sum + m.subscriptionValue, 0);

  // Get scheduled cancellations
  const scheduledCancellations = await prisma.subscription.findMany({
    where: {
      member: { gymId },
      status: 'ACTIVE',
      cancelAtPeriodEnd: true,
    },
    include: {
      plan: true,
    },
  });

  const scheduledCancellationCount = scheduledCancellations.length;
  const scheduledCancellationRevenue = scheduledCancellations.reduce((sum, sub) => {
    const monthlyValue = Number(sub.plan.priceAmount) * (MONTHLY_MULTIPLIER[sub.plan.billingInterval] || 1);
    return sum + monthlyValue;
  }, 0);

  // Calculate churn rates
  const [
    cancelledThisMonth,
    cancelledLastMonth,
    totalActiveThisMonth,
    totalActiveLastMonth,
    cancelledLast90Days,
    totalActive90DaysAgo,
  ] = await Promise.all([
    prisma.subscription.count({
      where: {
        member: { gymId },
        status: 'CANCELLED',
        cancelledAt: { gte: thirtyDaysAgo },
      },
    }),
    prisma.subscription.count({
      where: {
        member: { gymId },
        status: 'CANCELLED',
        cancelledAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
    }),
    prisma.subscription.count({
      where: {
        member: { gymId },
        status: 'ACTIVE',
      },
    }),
    prisma.subscription.count({
      where: {
        member: { gymId },
        createdAt: { lt: thirtyDaysAgo },
        OR: [{ status: 'ACTIVE' }, { status: 'CANCELLED', cancelledAt: { gte: thirtyDaysAgo } }],
      },
    }),
    prisma.subscription.count({
      where: {
        member: { gymId },
        status: 'CANCELLED',
        cancelledAt: { gte: ninetyDaysAgo },
      },
    }),
    prisma.subscription.count({
      where: {
        member: { gymId },
        createdAt: { lt: ninetyDaysAgo },
        OR: [{ status: 'ACTIVE' }, { status: 'CANCELLED', cancelledAt: { gte: ninetyDaysAgo } }],
      },
    }),
  ]);

  const churnRateThisMonth = totalActiveThisMonth > 0
    ? (cancelledThisMonth / (totalActiveThisMonth + cancelledThisMonth)) * 100
    : 0;

  const churnRatePreviousMonth = totalActiveLastMonth > 0
    ? (cancelledLastMonth / totalActiveLastMonth) * 100
    : 0;

  const historicalChurnRate = totalActive90DaysAgo > 0
    ? ((cancelledLast90Days / 3) / totalActive90DaysAgo) * 100 // Average monthly over 3 months
    : 0;

  // Determine trend
  let churnRateTrend: 'up' | 'down' | 'stable';
  const churnDiff = churnRateThisMonth - churnRatePreviousMonth;
  if (churnDiff > 0.5) {
    churnRateTrend = 'up';
  } else if (churnDiff < -0.5) {
    churnRateTrend = 'down';
  } else {
    churnRateTrend = 'stable';
  }

  return {
    atRiskCount,
    atRiskRevenue: Math.round(atRiskRevenue * 100) / 100,
    scheduledCancellations: scheduledCancellationCount,
    scheduledCancellationRevenue: Math.round(scheduledCancellationRevenue * 100) / 100,
    churnRateThisMonth: Math.round(churnRateThisMonth * 10) / 10,
    churnRatePreviousMonth: Math.round(churnRatePreviousMonth * 10) / 10,
    churnRateTrend,
    historicalChurnRate: Math.round(historicalChurnRate * 10) / 10,
  };
}

// =============================================================================
// REVENUE FORECASTING
// =============================================================================

/**
 * Get historical monthly revenue for charting
 */
export async function getHistoricalRevenue(
  gymId: string,
  months = 6
): Promise<{ months: string[]; actualRevenue: number[] }> {
  const now = new Date();
  const monthsData: string[] = [];
  const revenueData: number[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);

    const monthLabel = monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    monthsData.push(monthLabel);

    // Get completed payments for that month
    const payments = await prisma.payment.aggregate({
      where: {
        gymId,
        status: 'COMPLETED',
        createdAt: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      _sum: { amount: true },
    });

    revenueData.push(Number(payments._sum.amount || 0));
  }

  return {
    months: monthsData,
    actualRevenue: revenueData,
  };
}

/**
 * Get upcoming subscription renewals by week
 */
export async function getRenewalsByWeek(
  gymId: string,
  weeks = 4
): Promise<{ week: string; startDate: string; count: number; revenue: number }[]> {
  const now = new Date();
  const results: { week: string; startDate: string; count: number; revenue: number }[] = [];

  for (let i = 0; i < weeks; i++) {
    const weekStart = new Date(now.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const subscriptions = await prisma.subscription.findMany({
      where: {
        member: { gymId },
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
        currentPeriodEnd: {
          gte: weekStart,
          lt: weekEnd,
        },
      },
      include: { plan: true },
    });

    const revenue = subscriptions.reduce((sum, sub) => {
      const monthlyValue = Number(sub.plan.priceAmount) * (MONTHLY_MULTIPLIER[sub.plan.billingInterval] || 1);
      return sum + monthlyValue;
    }, 0);

    results.push({
      week: `Week ${i + 1}`,
      startDate: weekStart.toISOString().split('T')[0] || '',
      count: subscriptions.length,
      revenue: Math.round(revenue * 100) / 100,
    });
  }

  return results;
}

/**
 * Generate revenue forecasts for 30, 60, and 90 day periods
 */
export async function getRevenueForecasts(gymId: string): Promise<RevenueForecast[]> {
  const now = new Date();

  // Get current MRR data
  const mrrData = await calculateNormalizedMRR(gymId);
  const { normalizedMRR, avgSubscriptionValue, activeSubscriptions } = mrrData;

  // Get churn metrics
  const churnMetrics = await getChurnMetrics(gymId);

  // Get historical new signups rate (average per month over last 3 months)
  const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const newSignupsLast3Months = await prisma.subscription.count({
    where: {
      member: { gymId },
      createdAt: { gte: threeMonthsAgo },
    },
  });
  const avgNewSignupsPerMonth = newSignupsLast3Months / 3;

  // Calculate forecasts for each period
  const periods: Array<{ period: '30day' | '60day' | '90day'; days: number }> = [
    { period: '30day', days: 30 },
    { period: '60day', days: 60 },
    { period: '90day', days: 90 },
  ];

  const forecasts: RevenueForecast[] = [];

  for (const { period, days } of periods) {
    const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const months = days / 30;

    // Get scheduled cancellations within period
    const scheduledCancellations = await prisma.subscription.findMany({
      where: {
        member: { gymId },
        status: 'ACTIVE',
        cancelAtPeriodEnd: true,
        currentPeriodEnd: {
          gte: now,
          lte: periodEnd,
        },
      },
      include: { plan: true },
    });

    const scheduledCancellationRevenue = scheduledCancellations.reduce((sum, sub) => {
      const monthlyValue = Number(sub.plan.priceAmount) * (MONTHLY_MULTIPLIER[sub.plan.billingInterval] || 1);
      return sum + monthlyValue * months; // Revenue lost over the period
    }, 0);

    // Get renewals within period (subscriptions that will renew)
    const renewals = await prisma.subscription.findMany({
      where: {
        member: { gymId },
        status: 'ACTIVE',
        cancelAtPeriodEnd: false,
        currentPeriodEnd: {
          gte: now,
          lte: periodEnd,
        },
      },
      include: { plan: true },
    });

    const renewalRevenue = renewals.reduce((sum, sub) => {
      const monthlyValue = Number(sub.plan.priceAmount) * (MONTHLY_MULTIPLIER[sub.plan.billingInterval] || 1);
      return sum + monthlyValue;
    }, 0);

    // Calculate expected churn (at-risk members × historical churn probability)
    const expectedChurnRate = churnMetrics.historicalChurnRate / 100;
    const expectedChurn = Math.round(churnMetrics.atRiskCount * expectedChurnRate * 0.3 * months); // 30% of at-risk actually churn
    const expectedChurnRevenue = expectedChurn * avgSubscriptionValue * months;

    // Calculate expected new signups
    const expectedNewSignups = Math.round(avgNewSignupsPerMonth * months);
    const expectedNewRevenue = expectedNewSignups * avgSubscriptionValue * months;

    // Base revenue projection
    const baseRevenue = normalizedMRR * months;

    // Projected revenue
    const projectedRevenue = baseRevenue
      - scheduledCancellationRevenue
      - expectedChurnRevenue
      + expectedNewRevenue;

    // Calculate confidence interval (±10% for 30 day, ±15% for 60 day, ±20% for 90 day)
    const confidenceMargin = days === 30 ? 0.10 : days === 60 ? 0.15 : 0.20;
    const confidenceLow = projectedRevenue * (1 - confidenceMargin);
    const confidenceHigh = projectedRevenue * (1 + confidenceMargin);

    // Growth rate compared to current MRR
    const growthRate = baseRevenue > 0
      ? ((projectedRevenue - baseRevenue) / baseRevenue) * 100
      : 0;

    forecasts.push({
      period,
      days,
      projectedRevenue: Math.round(projectedRevenue * 100) / 100,
      confidenceLow: Math.round(confidenceLow * 100) / 100,
      confidenceHigh: Math.round(confidenceHigh * 100) / 100,
      expectedChurn,
      expectedChurnRevenue: Math.round(expectedChurnRevenue * 100) / 100,
      scheduledCancellations: scheduledCancellations.length,
      scheduledCancellationRevenue: Math.round(scheduledCancellationRevenue * 100) / 100,
      renewals: renewals.length,
      renewalRevenue: Math.round(renewalRevenue * 100) / 100,
      growthRate: Math.round(growthRate * 10) / 10,
    });
  }

  return forecasts;
}

// =============================================================================
// MAIN FORECAST DATA FUNCTION
// =============================================================================

/**
 * Get complete forecast data for the billing dashboard
 * This is the main function called by the API endpoint
 */
export async function getForecastData(gymId: string): Promise<ForecastData> {
  const [
    mrrData,
    forecasts,
    churnMetrics,
    atRiskMembers,
    history,
    renewalsByWeek,
  ] = await Promise.all([
    calculateNormalizedMRR(gymId),
    getRevenueForecasts(gymId),
    getChurnMetrics(gymId),
    getMemberChurnRisk(gymId, 10),
    getHistoricalRevenue(gymId, 6),
    getRenewalsByWeek(gymId, 4),
  ]);

  return {
    currentMRR: mrrData.currentMRR,
    normalizedMRR: mrrData.normalizedMRR,
    activeSubscriptions: mrrData.activeSubscriptions,
    avgSubscriptionValue: mrrData.avgSubscriptionValue,
    forecasts,
    churn: churnMetrics,
    atRiskMembers,
    history,
    renewalsByWeek,
  };
}
