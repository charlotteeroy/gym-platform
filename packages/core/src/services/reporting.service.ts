import { prisma, SubscriptionStatus } from '@gym/database';
import { type ApiError, ERROR_CODES } from '@gym/shared';

/**
 * P&L (Profit & Loss) Report Data
 */
export interface PnLReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  revenue: {
    subscriptions: number;
    oneTimePayments: number;
    otherIncome: number;
    total: number;
  };
  expenses: {
    payroll: number;
    operational: number;
    refunds: number;
    total: number;
  };
  netIncome: number;
  margin: number;
}

/**
 * Cash Flow Report Data
 */
export interface CashFlowReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  inflows: {
    subscriptionPayments: number;
    oneTimePayments: number;
    total: number;
  };
  outflows: {
    payroll: number;
    expenses: number;
    refunds: number;
    total: number;
  };
  netCashFlow: number;
  byPeriod: Array<{
    period: string;
    inflow: number;
    outflow: number;
    net: number;
  }>;
}

/**
 * Revenue Breakdown Data
 */
export interface RevenueBreakdown {
  period: {
    startDate: Date;
    endDate: Date;
  };
  bySource: Array<{
    source: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  byPlan: Array<{
    planName: string;
    amount: number;
    percentage: number;
    subscriberCount: number;
  }>;
  trends: Array<{
    period: string;
    subscriptions: number;
    oneTime: number;
    total: number;
  }>;
}

/**
 * Generate P&L Report for a gym
 */
export async function getPnLReport(
  gymId: string,
  startDate: Date,
  endDate: Date
): Promise<{ success: true; report: PnLReport } | { success: false; error: ApiError }> {
  try {
    // Get revenue from payments
    const payments = await prisma.payment.findMany({
      where: {
        gymId,
        createdAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
      include: {
        member: {
          include: {
            subscription: {
              include: {
                plan: true,
              },
            },
          },
        },
      },
    });

    // Categorize revenue based on whether the payment is for a member with an active subscription
    let subscriptionRevenue = 0;
    let oneTimeRevenue = 0;

    for (const payment of payments) {
      const amount = Number(payment.amount);
      // Consider it a subscription payment if the member has an active subscription
      if (payment.member?.subscription && payment.member.subscription.status === SubscriptionStatus.ACTIVE) {
        subscriptionRevenue += amount;
      } else {
        oneTimeRevenue += amount;
      }
    }

    const totalRevenue = subscriptionRevenue + oneTimeRevenue;

    // Get expenses
    const expenses = await prisma.expense.findMany({
      where: {
        gymId,
        date: { gte: startDate, lte: endDate },
      },
    });

    const operationalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Get payroll
    const payrollPeriods = await prisma.payrollPeriod.findMany({
      where: {
        gymId,
        status: 'PAID',
        paidAt: { gte: startDate, lte: endDate },
      },
    });

    const payrollExpenses = payrollPeriods.reduce((sum, p) => sum + Number(p.totalAmount), 0);

    // Get refunds
    const refunds = await prisma.refund.findMany({
      where: {
        gymId,
        createdAt: { gte: startDate, lte: endDate },
        status: 'SUCCEEDED',
      },
    });

    const refundAmount = refunds.reduce((sum, r) => sum + Number(r.amount), 0);

    const totalExpenses = operationalExpenses + payrollExpenses + refundAmount;
    const netIncome = totalRevenue - totalExpenses;
    const margin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

    return {
      success: true,
      report: {
        period: { startDate, endDate },
        revenue: {
          subscriptions: subscriptionRevenue,
          oneTimePayments: oneTimeRevenue,
          otherIncome: 0,
          total: totalRevenue,
        },
        expenses: {
          payroll: payrollExpenses,
          operational: operationalExpenses,
          refunds: refundAmount,
          total: totalExpenses,
        },
        netIncome,
        margin,
      },
    };
  } catch (error) {
    console.error('Failed to generate P&L report:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to generate P&L report' },
    };
  }
}

/**
 * Generate Cash Flow Report for a gym
 */
export async function getCashFlowReport(
  gymId: string,
  startDate: Date,
  endDate: Date,
  groupBy: 'day' | 'week' | 'month' = 'month'
): Promise<{ success: true; report: CashFlowReport } | { success: false; error: ApiError }> {
  try {
    // Get all payments
    const payments = await prisma.payment.findMany({
      where: {
        gymId,
        createdAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
      include: {
        member: {
          include: {
            subscription: true,
          },
        },
      },
    });

    // Get expenses
    const expenses = await prisma.expense.findMany({
      where: {
        gymId,
        date: { gte: startDate, lte: endDate },
      },
    });

    // Get payroll
    const payrollPeriods = await prisma.payrollPeriod.findMany({
      where: {
        gymId,
        status: 'PAID',
        paidAt: { gte: startDate, lte: endDate },
      },
    });

    // Get refunds
    const refunds = await prisma.refund.findMany({
      where: {
        gymId,
        createdAt: { gte: startDate, lte: endDate },
        status: 'SUCCEEDED',
      },
    });

    // Calculate totals
    let subscriptionPayments = 0;
    let oneTimePayments = 0;

    for (const payment of payments) {
      const amount = Number(payment.amount);
      if (payment.member?.subscription && payment.member.subscription.status === SubscriptionStatus.ACTIVE) {
        subscriptionPayments += amount;
      } else {
        oneTimePayments += amount;
      }
    }

    const totalInflow = subscriptionPayments + oneTimePayments;
    const totalPayroll = payrollPeriods.reduce((sum, p) => sum + Number(p.totalAmount), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalRefunds = refunds.reduce((sum, r) => sum + Number(r.amount), 0);
    const totalOutflow = totalPayroll + totalExpenses + totalRefunds;

    // Group by period
    const periodMap = new Map<string, { inflow: number; outflow: number }>();

    const getPeriodKey = (date: Date): string => {
      if (groupBy === 'day') {
        return date.toISOString().split('T')[0] || date.toISOString().slice(0, 10);
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        return weekStart.toISOString().split('T')[0] || weekStart.toISOString().slice(0, 10);
      } else {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
    };

    // Add payments to periods
    for (const payment of payments) {
      const key = getPeriodKey(payment.createdAt);
      const existing = periodMap.get(key) || { inflow: 0, outflow: 0 };
      existing.inflow += Number(payment.amount);
      periodMap.set(key, existing);
    }

    // Add expenses to periods
    for (const expense of expenses) {
      const key = getPeriodKey(expense.date);
      const existing = periodMap.get(key) || { inflow: 0, outflow: 0 };
      existing.outflow += Number(expense.amount);
      periodMap.set(key, existing);
    }

    // Add payroll to periods
    for (const payroll of payrollPeriods) {
      if (payroll.paidAt) {
        const key = getPeriodKey(payroll.paidAt);
        const existing = periodMap.get(key) || { inflow: 0, outflow: 0 };
        existing.outflow += Number(payroll.totalAmount);
        periodMap.set(key, existing);
      }
    }

    // Add refunds to periods
    for (const refund of refunds) {
      const key = getPeriodKey(refund.createdAt);
      const existing = periodMap.get(key) || { inflow: 0, outflow: 0 };
      existing.outflow += Number(refund.amount);
      periodMap.set(key, existing);
    }

    // Sort and format
    const byPeriod = Array.from(periodMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, data]) => ({
        period,
        inflow: data.inflow,
        outflow: data.outflow,
        net: data.inflow - data.outflow,
      }));

    return {
      success: true,
      report: {
        period: { startDate, endDate },
        inflows: {
          subscriptionPayments,
          oneTimePayments,
          total: totalInflow,
        },
        outflows: {
          payroll: totalPayroll,
          expenses: totalExpenses,
          refunds: totalRefunds,
          total: totalOutflow,
        },
        netCashFlow: totalInflow - totalOutflow,
        byPeriod,
      },
    };
  } catch (error) {
    console.error('Failed to generate cash flow report:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to generate cash flow report' },
    };
  }
}

/**
 * Generate Revenue Breakdown Report for a gym
 */
export async function getRevenueBreakdown(
  gymId: string,
  startDate: Date,
  endDate: Date
): Promise<{ success: true; report: RevenueBreakdown } | { success: false; error: ApiError }> {
  try {
    // Get all payments with related data
    const payments = await prisma.payment.findMany({
      where: {
        gymId,
        createdAt: { gte: startDate, lte: endDate },
        status: 'COMPLETED',
      },
      include: {
        member: {
          include: {
            subscription: {
              include: {
                plan: true,
              },
            },
          },
        },
      },
    });

    // Calculate revenue by source
    let subscriptionRevenue = 0;
    let oneTimeRevenue = 0;
    let subscriptionCount = 0;
    let oneTimeCount = 0;
    const planRevenue = new Map<string, { name: string; amount: number; count: number }>();

    for (const payment of payments) {
      const amount = Number(payment.amount);

      if (payment.member?.subscription && payment.member.subscription.plan) {
        subscriptionRevenue += amount;
        subscriptionCount++;
        const planId = payment.member.subscription.plan.id;
        const existing = planRevenue.get(planId) || {
          name: payment.member.subscription.plan.name,
          amount: 0,
          count: 0,
        };
        existing.amount += amount;
        existing.count++;
        planRevenue.set(planId, existing);
      } else {
        oneTimeRevenue += amount;
        oneTimeCount++;
      }
    }

    const totalRevenue = subscriptionRevenue + oneTimeRevenue;

    // Get unique subscriber count per plan
    const activeSubscriptions = await prisma.subscription.groupBy({
      by: ['planId'],
      where: {
        member: { gymId },
        status: SubscriptionStatus.ACTIVE,
      },
      _count: {
        id: true,
      },
    });

    const planSubscriberCounts = new Map<string, number>();
    for (const sub of activeSubscriptions) {
      if (sub.planId) {
        planSubscriberCounts.set(sub.planId, sub._count.id);
      }
    }

    // Format by source
    const bySource = [
      {
        source: 'Subscriptions',
        amount: subscriptionRevenue,
        percentage: totalRevenue > 0 ? (subscriptionRevenue / totalRevenue) * 100 : 0,
        count: subscriptionCount,
      },
      {
        source: 'One-Time Payments',
        amount: oneTimeRevenue,
        percentage: totalRevenue > 0 ? (oneTimeRevenue / totalRevenue) * 100 : 0,
        count: oneTimeCount,
      },
    ];

    // Format by plan
    const byPlan = Array.from(planRevenue.entries())
      .map(([planId, data]) => ({
        planName: data.name,
        amount: data.amount,
        percentage: totalRevenue > 0 ? (data.amount / totalRevenue) * 100 : 0,
        subscriberCount: planSubscriberCounts.get(planId) || 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    // Calculate monthly trends
    const trendMap = new Map<string, { subscriptions: number; oneTime: number }>();

    for (const payment of payments) {
      const monthKey = `${payment.createdAt.getFullYear()}-${String(payment.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const existing = trendMap.get(monthKey) || { subscriptions: 0, oneTime: 0 };
      const amount = Number(payment.amount);

      if (payment.member?.subscription) {
        existing.subscriptions += amount;
      } else {
        existing.oneTime += amount;
      }
      trendMap.set(monthKey, existing);
    }

    const trends = Array.from(trendMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, data]) => ({
        period,
        subscriptions: data.subscriptions,
        oneTime: data.oneTime,
        total: data.subscriptions + data.oneTime,
      }));

    return {
      success: true,
      report: {
        period: { startDate, endDate },
        bySource,
        byPlan,
        trends,
      },
    };
  } catch (error) {
    console.error('Failed to generate revenue breakdown:', error);
    return {
      success: false,
      error: { code: ERROR_CODES.INTERNAL_ERROR, message: 'Failed to generate revenue breakdown' },
    };
  }
}
