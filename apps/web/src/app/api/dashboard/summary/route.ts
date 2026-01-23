import { prisma } from '@gym/database';
import { getSession, getStaffWithGym } from '@/lib/auth';
import { apiSuccess, apiError, apiUnauthorized, apiForbidden } from '@/lib/api';
import { getGymHealth, getAlerts, getAtRiskMembers, getMemberProgression } from '@gym/core';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return apiUnauthorized();
    }

    const staff = await getStaffWithGym();
    if (!staff) {
      return apiForbidden('You do not have access to any gym');
    }

    const gymId = staff.gymId;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfWeek);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

    // Fetch all data in parallel
    const [
      health,
      alerts,
      atRiskMembers,
      totalMembers,
      activeMembers,
      newThisMonth,
      checkInsToday,
      classesToday,
      todaysClassSessions,
      newMembers48h,
      revenueToday,
      revenueThisWeek,
      revenueLastWeek,
      revenueThisMonth,
      revenueLastMonth,
      failedPayments,
      overdueInvoices,
      expiringSubscriptions,
      checkIns30Days,
      memberProgression,
    ] = await Promise.all([
      // Health & Alerts
      getGymHealth(gymId),
      getAlerts(gymId),
      getAtRiskMembers(gymId, 10),

      // Key Metrics
      prisma.member.count({ where: { gymId } }),
      prisma.member.count({ where: { gymId, status: 'ACTIVE' } }),
      prisma.member.count({ where: { gymId, createdAt: { gte: startOfMonth } } }),
      prisma.checkIn.count({ where: { gymId, checkedInAt: { gte: startOfDay, lt: endOfDay } } }),
      prisma.classSession.count({ where: { gymId, startTime: { gte: startOfDay, lt: endOfDay }, status: 'SCHEDULED' } }),

      // Today's Classes with bookings
      prisma.classSession.findMany({
        where: { gymId, startTime: { gte: startOfDay, lt: endOfDay }, status: 'SCHEDULED' },
        include: {
          class: {
            include: {
              instructor: { select: { id: true, firstName: true, lastName: true } },
            },
          },
          _count: { select: { bookings: true } },
        },
        orderBy: { startTime: 'asc' },
      }),

      // New members in last 48 hours
      prisma.member.findMany({
        where: { gymId, createdAt: { gte: fortyEightHoursAgo } },
        select: { id: true, firstName: true, lastName: true, email: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Revenue - Today
      prisma.payment.aggregate({
        where: { gymId, status: 'COMPLETED', createdAt: { gte: startOfDay, lt: endOfDay } },
        _sum: { amount: true },
      }),

      // Revenue - This Week
      prisma.payment.aggregate({
        where: { gymId, status: 'COMPLETED', createdAt: { gte: startOfWeek } },
        _sum: { amount: true },
      }),

      // Revenue - Last Week
      prisma.payment.aggregate({
        where: { gymId, status: 'COMPLETED', createdAt: { gte: startOfLastWeek, lt: endOfLastWeek } },
        _sum: { amount: true },
      }),

      // Revenue - This Month
      prisma.payment.aggregate({
        where: { gymId, status: 'COMPLETED', createdAt: { gte: startOfMonth } },
        _sum: { amount: true },
      }),

      // Revenue - Last Month
      prisma.payment.aggregate({
        where: { gymId, status: 'COMPLETED', createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
        _sum: { amount: true },
      }),

      // Failed Payments (last 30 days)
      prisma.payment.findMany({
        where: { gymId, status: 'FAILED', createdAt: { gte: thirtyDaysAgo } },
        include: { member: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),

      // Overdue Invoices
      prisma.invoice.findMany({
        where: { gymId, status: 'OVERDUE', dueDate: { lt: now } },
        include: { member: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),

      // Expiring Subscriptions (next 7 days)
      prisma.subscription.findMany({
        where: {
          member: { gymId },
          status: 'ACTIVE',
          currentPeriodEnd: { gte: now, lte: sevenDaysFromNow },
        },
        include: {
          member: { select: { id: true, firstName: true, lastName: true, email: true } },
          plan: { select: { id: true, name: true } },
        },
        orderBy: { currentPeriodEnd: 'asc' },
        take: 10,
      }),

      // Check-ins for traffic patterns (30 days)
      prisma.checkIn.findMany({
        where: { gymId, checkedInAt: { gte: thirtyDaysAgo } },
        select: { checkedInAt: true },
      }),

      // Member Progression
      getMemberProgression(gymId),
    ]);

    // Calculate revenue metrics
    const revenueTodayAmount = Number(revenueToday._sum.amount || 0);
    const revenueThisWeekAmount = Number(revenueThisWeek._sum.amount || 0);
    const revenueLastWeekAmount = Number(revenueLastWeek._sum.amount || 0);
    const revenueThisMonthAmount = Number(revenueThisMonth._sum.amount || 0);
    const revenueLastMonthAmount = Number(revenueLastMonth._sum.amount || 0);

    const weekTrend = revenueLastWeekAmount > 0
      ? Math.round(((revenueThisWeekAmount - revenueLastWeekAmount) / revenueLastWeekAmount) * 100)
      : 0;
    const monthTrend = revenueLastMonthAmount > 0
      ? Math.round(((revenueThisMonthAmount - revenueLastMonthAmount) / revenueLastMonthAmount) * 100)
      : 0;

    // Calculate failed payments total
    const failedPaymentsTotal = failedPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    // Calculate overdue invoices total
    const overdueTotal = overdueInvoices.reduce((sum, inv) => sum + Number(inv.total), 0);

    // Calculate traffic patterns
    const hourlyVisits: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourlyVisits[i] = 0;
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dailyVisits: Record<string, number> = {};
    dayNames.forEach((d) => (dailyVisits[d] = 0));

    checkIns30Days.forEach((checkIn) => {
      const hour = checkIn.checkedInAt.getHours();
      const day = dayNames[checkIn.checkedInAt.getDay()];
      hourlyVisits[hour]++;
      if (day) dailyVisits[day]++;
    });

    const totalVisits = checkIns30Days.length;
    const formatHour = (hour: number) => {
      if (hour === 0) return '12am';
      if (hour === 12) return '12pm';
      if (hour < 12) return `${hour}am`;
      return `${hour - 12}pm`;
    };

    const topHours = Object.entries(hourlyVisits)
      .map(([hour, count]) => ({
        hour: parseInt(hour),
        label: formatHour(parseInt(hour)),
        count,
        percentage: totalVisits > 0 ? Math.round((count / totalVisits) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const topDays = Object.entries(dailyVisits)
      .map(([day, count]) => ({
        day,
        count,
        percentage: totalVisits > 0 ? Math.round((count / totalVisits) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Check if user can see revenue (Owner/Admin only)
    const canSeeRevenue = ['OWNER', 'ADMIN'].includes(staff.role);

    // Format today's classes
    const todaysClasses = todaysClassSessions.map((session) => ({
      id: session.id,
      time: session.startTime,
      name: session.class.name,
      instructor: session.class.instructor
        ? `${session.class.instructor.firstName} ${session.class.instructor.lastName}`
        : 'TBA',
      booked: session._count.bookings,
      capacity: session.class.capacity,
      percentFull: Math.round((session._count.bookings / session.class.capacity) * 100),
    }));

    // Build response
    const response = {
      // Key Metrics
      metrics: {
        totalMembers,
        activeMembers,
        newThisMonth,
        checkInsToday,
        classesToday,
      },

      // Revenue (only if authorized)
      revenue: canSeeRevenue ? {
        today: revenueTodayAmount,
        thisWeek: revenueThisWeekAmount,
        thisMonth: revenueThisMonthAmount,
        weekTrend,
        monthTrend,
        failedPayments: {
          count: failedPayments.length,
          total: failedPaymentsTotal,
          items: failedPayments.map((p) => ({
            id: p.id,
            amount: Number(p.amount),
            memberName: p.member ? `${p.member.firstName} ${p.member.lastName}` : 'Unknown',
            memberId: p.member?.id,
            date: p.createdAt,
          })),
        },
        overdueInvoices: {
          count: overdueInvoices.length,
          total: overdueTotal,
          items: overdueInvoices.map((inv) => ({
            id: inv.id,
            invoiceNumber: inv.invoiceNumber,
            amount: Number(inv.total),
            memberName: inv.member ? `${inv.member.firstName} ${inv.member.lastName}` : 'Unknown',
            memberId: inv.member?.id,
            dueDate: inv.dueDate,
            daysOverdue: Math.floor((now.getTime() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
          })),
        },
      } : null,

      // Retention
      retention: {
        atRiskMembers: atRiskMembers.map((m) => ({
          id: m.id,
          name: `${m.firstName} ${m.lastName}`,
          email: m.email,
          daysSinceLastActivity: m.daysSinceLastActivity,
          reason: m.daysSinceLastActivity > 30 ? 'No visit in over 30 days' :
                  m.daysSinceLastActivity > 14 ? 'No visit in 2+ weeks' :
                  'Declining activity',
        })),
        atRiskCount: atRiskMembers.length,
        expiringSubscriptions: expiringSubscriptions.map((sub) => ({
          id: sub.id,
          memberId: sub.member.id,
          memberName: `${sub.member.firstName} ${sub.member.lastName}`,
          planName: sub.plan.name,
          expiresAt: sub.currentPeriodEnd,
          daysUntilExpiry: Math.ceil((new Date(sub.currentPeriodEnd).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
          autoRenew: sub.cancelAtPeriodEnd === false,
        })),
        expiringCount: expiringSubscriptions.length,
        progression: memberProgression,
      },

      // Today's Schedule
      today: {
        classes: todaysClasses,
        totalBookings: todaysClasses.reduce((sum, c) => sum + c.booked, 0),
        newMembers: newMembers48h.map((m) => ({
          id: m.id,
          name: `${m.firstName} ${m.lastName}`,
          email: m.email,
          joinedAt: m.createdAt,
        })),
      },

      // Traffic Patterns
      traffic: {
        totalVisits30Days: totalVisits,
        peakHours: topHours,
        busiestDays: topDays,
      },

      // Health & Alerts
      health,
      alerts: alerts.slice(0, 5),

      // Staff info for role checking
      staffRole: staff.role,
    };

    return apiSuccess(response);
  } catch (error) {
    console.error('Dashboard summary error:', error);
    return apiError({ code: 'INTERNAL_ERROR', message: 'Failed to load dashboard data' }, 500);
  }
}
