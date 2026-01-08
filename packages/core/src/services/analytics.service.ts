import { prisma } from '@gym/database';

export interface GymHealthScore {
  score: number; // 0-100
  status: 'critical' | 'warning' | 'healthy';
  trend: 'declining' | 'stable' | 'improving';
  factors: {
    memberRetention: number;
    subscriptionHealth: number;
    classEngagement: number;
    revenueStability: number;
  };
}

export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  type: string;
  title: string;
  description: string;
  metric?: string;
  actionUrl?: string;
  createdAt: Date;
}

export interface AtRiskMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  riskScore: number; // 0-100, higher = more likely to churn
  riskFactors: string[];
  lastCheckIn: Date | null;
  lastClassBooking: Date | null;
  subscriptionStatus: string;
  daysSinceLastActivity: number;
}

export interface TrendData {
  label: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  isPositive: boolean; // Is this trend direction good?
}

/**
 * Calculate gym health score and detect early warning signals
 */
export async function getGymHealth(gymId: string): Promise<GymHealthScore> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Get current and previous period data
  const [
    totalMembers,
    activeSubscriptions,
    cancelledThisMonth,
    cancelledLastMonth,
    bookingsThisMonth,
    bookingsLastMonth,
    checkInsThisMonth,
    checkInsLastMonth,
  ] = await Promise.all([
    // Total active members
    prisma.member.count({
      where: { gymId, status: 'ACTIVE' },
    }),
    // Active subscriptions
    prisma.subscription.count({
      where: {
        member: { gymId },
        status: 'ACTIVE',
      },
    }),
    // Cancellations this month
    prisma.subscription.count({
      where: {
        member: { gymId },
        status: 'CANCELLED',
        cancelledAt: { gte: thirtyDaysAgo },
      },
    }),
    // Cancellations last month
    prisma.subscription.count({
      where: {
        member: { gymId },
        status: 'CANCELLED',
        cancelledAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
    }),
    // Bookings this month
    prisma.booking.count({
      where: {
        member: { gymId },
        createdAt: { gte: thirtyDaysAgo },
      },
    }),
    // Bookings last month
    prisma.booking.count({
      where: {
        member: { gymId },
        createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
    }),
    // Check-ins this month
    prisma.checkIn.count({
      where: {
        gymId,
        checkedInAt: { gte: thirtyDaysAgo },
      },
    }),
    // Check-ins last month
    prisma.checkIn.count({
      where: {
        gymId,
        checkedInAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
    }),
  ]);

  // Calculate retention rate (inverse of churn)
  const churnRate = totalMembers > 0 ? (cancelledThisMonth / totalMembers) * 100 : 0;
  const memberRetention = Math.max(0, 100 - churnRate * 10); // Scale churn impact

  // Subscription health (active vs total)
  const subscriptionHealth = totalMembers > 0
    ? (activeSubscriptions / totalMembers) * 100
    : 100;

  // Class engagement (bookings trend)
  const bookingChange = bookingsLastMonth > 0
    ? ((bookingsThisMonth - bookingsLastMonth) / bookingsLastMonth) * 100
    : 0;
  const classEngagement = Math.min(100, Math.max(0, 50 + bookingChange));

  // Revenue stability (based on subscription trend)
  const revenueStability = cancelledThisMonth <= cancelledLastMonth ? 85 : 60;

  // Calculate overall score (weighted average)
  const score = Math.round(
    memberRetention * 0.35 +
    subscriptionHealth * 0.30 +
    classEngagement * 0.20 +
    revenueStability * 0.15
  );

  // Determine status
  let status: 'critical' | 'warning' | 'healthy';
  if (score < 50) {
    status = 'critical';
  } else if (score < 75) {
    status = 'warning';
  } else {
    status = 'healthy';
  }

  // Determine trend
  const engagementTrend = checkInsThisMonth - checkInsLastMonth;
  let trend: 'declining' | 'stable' | 'improving';
  if (engagementTrend < -5) {
    trend = 'declining';
  } else if (engagementTrend > 5) {
    trend = 'improving';
  } else {
    trend = 'stable';
  }

  return {
    score,
    status,
    trend,
    factors: {
      memberRetention: Math.round(memberRetention),
      subscriptionHealth: Math.round(subscriptionHealth),
      classEngagement: Math.round(classEngagement),
      revenueStability: Math.round(revenueStability),
    },
  };
}

/**
 * Get active alerts for the gym owner
 */
export async function getAlerts(gymId: string): Promise<Alert[]> {
  const alerts: Alert[] = [];
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Check for recent cancellations spike
  const [recentCancellations, previousCancellations] = await Promise.all([
    prisma.subscription.count({
      where: {
        member: { gymId },
        status: 'CANCELLED',
        cancelledAt: { gte: sevenDaysAgo },
      },
    }),
    prisma.subscription.count({
      where: {
        member: { gymId },
        status: 'CANCELLED',
        cancelledAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo },
      },
    }),
  ]);

  if (recentCancellations > previousCancellations && recentCancellations >= 2) {
    alerts.push({
      id: 'cancellation-spike',
      severity: recentCancellations > 5 ? 'critical' : 'warning',
      type: 'churn',
      title: 'Cancellation spike detected',
      description: `${recentCancellations} members cancelled in the last 7 days, up from ${previousCancellations} the week before.`,
      metric: `+${recentCancellations - previousCancellations} cancellations`,
      actionUrl: '/members?filter=cancelled',
      createdAt: now,
    });
  }

  // Check for declining check-ins
  const [checkInsThisWeek, checkInsLastWeek] = await Promise.all([
    prisma.checkIn.count({
      where: { gymId, checkedInAt: { gte: sevenDaysAgo } },
    }),
    prisma.checkIn.count({
      where: { gymId, checkedInAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } },
    }),
  ]);

  if (checkInsLastWeek > 0) {
    const checkInDrop = ((checkInsLastWeek - checkInsThisWeek) / checkInsLastWeek) * 100;
    if (checkInDrop > 20) {
      alerts.push({
        id: 'checkin-decline',
        severity: checkInDrop > 40 ? 'critical' : 'warning',
        type: 'engagement',
        title: 'Check-in drop detected',
        description: `Gym visits down ${Math.round(checkInDrop)}% compared to last week. Members may be losing engagement.`,
        metric: `-${Math.round(checkInDrop)}% visits`,
        createdAt: now,
      });
    }
  }

  // Check for low class attendance
  const upcomingSessions = await prisma.classSession.findMany({
    where: {
      gymId,
      startTime: { gte: now, lte: sevenDaysAgo },
      status: 'SCHEDULED',
    },
    include: {
      class: true,
      _count: { select: { bookings: true } },
    },
  });

  const lowAttendanceClasses = upcomingSessions.filter(
    (s) => s._count.bookings < s.class.capacity * 0.25
  );

  if (lowAttendanceClasses.length >= 3) {
    alerts.push({
      id: 'low-class-attendance',
      severity: 'warning',
      type: 'classes',
      title: 'Low class bookings',
      description: `${lowAttendanceClasses.length} upcoming classes have less than 25% capacity booked.`,
      metric: `${lowAttendanceClasses.length} classes`,
      actionUrl: '/classes',
      createdAt: now,
    });
  }

  // Check for members with expiring subscriptions (no renewal)
  const expiringSubscriptions = await prisma.subscription.count({
    where: {
      member: { gymId },
      status: 'ACTIVE',
      currentPeriodEnd: {
        gte: now,
        lte: sevenDaysAgo,
      },
      cancelAtPeriodEnd: true,
    },
  });

  if (expiringSubscriptions > 0) {
    alerts.push({
      id: 'expiring-subscriptions',
      severity: expiringSubscriptions > 5 ? 'critical' : 'warning',
      type: 'revenue',
      title: 'Subscriptions expiring soon',
      description: `${expiringSubscriptions} members have subscriptions ending this week and won't renew.`,
      metric: `${expiringSubscriptions} expiring`,
      actionUrl: '/members?filter=expiring',
      createdAt: now,
    });
  }

  // Check for dormant members (no activity in 30 days but still subscribed)
  const dormantMembers = await prisma.member.count({
    where: {
      gymId,
      status: 'ACTIVE',
      subscription: { status: 'ACTIVE' },
      checkIns: {
        none: {
          checkedInAt: { gte: thirtyDaysAgo },
        },
      },
      bookings: {
        none: {
          createdAt: { gte: thirtyDaysAgo },
        },
      },
    },
  });

  if (dormantMembers > 0) {
    alerts.push({
      id: 'dormant-members',
      severity: dormantMembers > 10 ? 'warning' : 'info',
      type: 'engagement',
      title: 'Dormant members detected',
      description: `${dormantMembers} paying members haven't visited or booked a class in 30+ days.`,
      metric: `${dormantMembers} members`,
      actionUrl: '/members?filter=dormant',
      createdAt: now,
    });
  }

  // Sort by severity
  const severityOrder = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return alerts;
}

/**
 * Get members at risk of churning
 */
export async function getAtRiskMembers(gymId: string, limit = 10): Promise<AtRiskMember[]> {
  const now = new Date();
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Get active members with their activity data
  const members = await prisma.member.findMany({
    where: {
      gymId,
      status: 'ACTIVE',
      subscription: { status: 'ACTIVE' },
    },
    include: {
      subscription: true,
      checkIns: {
        orderBy: { checkedInAt: 'desc' },
        take: 1,
      },
      bookings: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: { session: true },
      },
    },
  });

  const atRiskMembers: AtRiskMember[] = [];

  for (const member of members) {
    const riskFactors: string[] = [];
    let riskScore = 0;

    const lastCheckIn = member.checkIns[0]?.checkedInAt || null;
    const lastBooking = member.bookings[0]?.createdAt || null;
    const lastActivity = lastCheckIn || lastBooking || member.createdAt;
    const daysSinceLastActivity = Math.floor(
      (now.getTime() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)
    );

    // No activity in 14+ days
    if (daysSinceLastActivity >= 14) {
      riskScore += 30;
      riskFactors.push(`No activity in ${daysSinceLastActivity} days`);
    }

    // No activity in 30+ days (very high risk)
    if (daysSinceLastActivity >= 30) {
      riskScore += 25;
      riskFactors.push('Dormant for 30+ days');
    }

    // No check-ins ever
    if (!lastCheckIn) {
      riskScore += 20;
      riskFactors.push('Never checked in');
    }

    // No class bookings in 14+ days
    if (!lastBooking || new Date(lastBooking) < fourteenDaysAgo) {
      riskScore += 15;
      riskFactors.push('No recent class bookings');
    }

    // Subscription ending soon
    if (member.subscription?.cancelAtPeriodEnd) {
      riskScore += 40;
      riskFactors.push('Subscription set to cancel');
    }

    // Only include if there's meaningful risk
    if (riskScore >= 30) {
      atRiskMembers.push({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        riskScore: Math.min(100, riskScore),
        riskFactors,
        lastCheckIn,
        lastClassBooking: lastBooking,
        subscriptionStatus: member.subscription?.status || 'NONE',
        daysSinceLastActivity,
      });
    }
  }

  // Sort by risk score (highest first) and limit
  return atRiskMembers
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, limit);
}

/**
 * Get key metric trends
 */
export async function getTrends(gymId: string): Promise<TrendData[]> {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  const [
    membersNow,
    membersPrevious,
    subscriptionsNow,
    subscriptionsPrevious,
    bookingsNow,
    bookingsPrevious,
    checkInsNow,
    checkInsPrevious,
    cancellationsNow,
    cancellationsPrevious,
  ] = await Promise.all([
    prisma.member.count({ where: { gymId, status: 'ACTIVE' } }),
    prisma.member.count({
      where: {
        gymId,
        createdAt: { lt: thirtyDaysAgo },
        OR: [{ status: 'ACTIVE' }, { status: 'CANCELLED' }],
      },
    }),
    prisma.subscription.count({
      where: { member: { gymId }, status: 'ACTIVE' },
    }),
    prisma.subscription.count({
      where: {
        member: { gymId },
        createdAt: { lt: thirtyDaysAgo },
        OR: [{ status: 'ACTIVE' }, { status: 'CANCELLED' }],
      },
    }),
    prisma.booking.count({
      where: { member: { gymId }, createdAt: { gte: thirtyDaysAgo } },
    }),
    prisma.booking.count({
      where: {
        member: { gymId },
        createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo },
      },
    }),
    prisma.checkIn.count({
      where: { gymId, checkedInAt: { gte: thirtyDaysAgo } },
    }),
    prisma.checkIn.count({
      where: { gymId, checkedInAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
    }),
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
  ]);

  function calculateTrend(current: number, previous: number, positiveIsGood: boolean): TrendData {
    const change = current - previous;
    const changePercent = previous > 0 ? (change / previous) * 100 : 0;
    let trend: 'up' | 'down' | 'stable';

    if (Math.abs(changePercent) < 5) {
      trend = 'stable';
    } else if (change > 0) {
      trend = 'up';
    } else {
      trend = 'down';
    }

    const isPositive = positiveIsGood ? change >= 0 : change <= 0;

    return {
      label: '',
      current,
      previous,
      change,
      changePercent: Math.round(changePercent),
      trend,
      isPositive,
    };
  }

  return [
    { ...calculateTrend(membersNow, membersPrevious, true), label: 'Active Members' },
    { ...calculateTrend(subscriptionsNow, subscriptionsPrevious, true), label: 'Subscriptions' },
    { ...calculateTrend(bookingsNow, bookingsPrevious, true), label: 'Class Bookings' },
    { ...calculateTrend(checkInsNow, checkInsPrevious, true), label: 'Gym Visits' },
    { ...calculateTrend(cancellationsNow, cancellationsPrevious, false), label: 'Cancellations' },
  ];
}

/**
 * Get quick stats for the dashboard
 */
export async function getQuickStats(gymId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalMembers,
    activeSubscriptions,
    monthlyRevenue,
    classesToday,
  ] = await Promise.all([
    prisma.member.count({ where: { gymId, status: 'ACTIVE' } }),
    prisma.subscription.count({
      where: { member: { gymId }, status: 'ACTIVE' },
    }),
    prisma.subscription.findMany({
      where: { member: { gymId }, status: 'ACTIVE' },
      include: { plan: true },
    }).then((subs) =>
      subs.reduce((sum, sub) => sum + Number(sub.plan.priceAmount), 0)
    ),
    prisma.classSession.count({
      where: {
        gymId,
        startTime: {
          gte: new Date(now.setHours(0, 0, 0, 0)),
          lt: new Date(now.setHours(23, 59, 59, 999)),
        },
        status: 'SCHEDULED',
      },
    }),
  ]);

  return {
    totalMembers,
    activeSubscriptions,
    monthlyRevenue,
    classesToday,
  };
}
