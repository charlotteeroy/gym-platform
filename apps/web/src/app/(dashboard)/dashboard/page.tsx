import { getSession } from '@/lib/auth';
import { prisma } from '@gym/database';
import { getGymHealth, getAlerts, getAtRiskMembers, getDashboardLayout } from '@gym/core';
import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/header';
import DashboardShell from '@/components/dashboard/DashboardShell';

async function getDashboardData() {
  const session = await getSession();
  if (!session) return null;

  const staff = await prisma.staff.findFirst({
    where: { userId: session.user.id },
    include: { gym: true },
  });

  if (!staff) return null;

  const gymId = staff.gymId;
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Previous period calculations for trends
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  const prevWeekStart = new Date(startOfWeek.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prevWeekEnd = new Date(startOfWeek.getTime() - 1);

  const isOwnerOrAdmin = ['OWNER', 'ADMIN'].includes(staff.role);

  const [
    health,
    alerts,
    atRiskMembers,
    totalMembers,
    activeMembers,
    newThisMonth,
    checkInsToday,
    classesToday,
    checkIns30Days,
    checkInsTodayDetailed,
    // Revenue data (only for owners/admins)
    revenueToday,
    revenueThisWeek,
    revenueThisMonth,
    revenuePrevWeek,
    revenuePrevMonth,
    failedPayments,
    // Expiring subscriptions
    expiringSubscriptions,
    // Today's classes with capacity
    todaysClasses,
  ] = await Promise.all([
    getGymHealth(gymId),
    getAlerts(gymId),
    getAtRiskMembers(gymId, 5),
    prisma.member.count({ where: { gymId } }),
    prisma.member.count({ where: { gymId, status: 'ACTIVE' } }),
    prisma.member.count({ where: { gymId, createdAt: { gte: startOfMonth } } }),
    prisma.checkIn.count({ where: { gymId, checkedInAt: { gte: startOfDay, lt: endOfDay } } }),
    prisma.classSession.count({ where: { gymId, startTime: { gte: startOfDay, lt: endOfDay }, status: 'SCHEDULED' } }),
    prisma.checkIn.findMany({ where: { gymId, checkedInAt: { gte: thirtyDaysAgo } }, select: { checkedInAt: true } }),
    prisma.checkIn.findMany({ where: { gymId, checkedInAt: { gte: startOfDay, lt: endOfDay } }, select: { checkedInAt: true } }),
    // Revenue queries
    isOwnerOrAdmin ? prisma.payment.aggregate({
      where: { gymId, status: 'COMPLETED', createdAt: { gte: startOfDay, lt: endOfDay } },
      _sum: { amount: true },
    }) : null,
    isOwnerOrAdmin ? prisma.payment.aggregate({
      where: { gymId, status: 'COMPLETED', createdAt: { gte: startOfWeek } },
      _sum: { amount: true },
    }) : null,
    isOwnerOrAdmin ? prisma.payment.aggregate({
      where: { gymId, status: 'COMPLETED', createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }) : null,
    isOwnerOrAdmin ? prisma.payment.aggregate({
      where: { gymId, status: 'COMPLETED', createdAt: { gte: prevWeekStart, lt: prevWeekEnd } },
      _sum: { amount: true },
    }) : null,
    isOwnerOrAdmin ? prisma.payment.aggregate({
      where: { gymId, status: 'COMPLETED', createdAt: { gte: prevMonthStart, lt: prevMonthEnd } },
      _sum: { amount: true },
    }) : null,
    isOwnerOrAdmin ? prisma.payment.findMany({
      where: { gymId, status: 'FAILED' },
      include: { member: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 3,
    }) : null,
    // Expiring subscriptions
    prisma.subscription.findMany({
      where: {
        member: { gymId },
        status: 'ACTIVE',
        currentPeriodEnd: { gte: now, lt: sevenDaysFromNow },
      },
      include: {
        member: { select: { id: true, firstName: true, lastName: true } },
        plan: { select: { name: true } },
      },
      orderBy: { currentPeriodEnd: 'asc' },
      take: 5,
    }),
    // Today's classes with booking counts
    prisma.classSession.findMany({
      where: { gymId, startTime: { gte: startOfDay, lt: endOfDay }, status: 'SCHEDULED' },
      include: {
        class: {
          select: {
            name: true,
            capacity: true,
            instructor: { select: { firstName: true, lastName: true } },
          },
        },
        _count: { select: { bookings: true } },
      },
      orderBy: { startTime: 'asc' },
    }),
  ]);

  // Calculate revenue data
  const revenue = isOwnerOrAdmin ? {
    today: Number(revenueToday?._sum.amount || 0),
    thisWeek: Number(revenueThisWeek?._sum.amount || 0),
    thisMonth: Number(revenueThisMonth?._sum.amount || 0),
    prevWeek: Number(revenuePrevWeek?._sum.amount || 0),
    prevMonth: Number(revenuePrevMonth?._sum.amount || 0),
    weekTrend: revenuePrevWeek?._sum.amount
      ? Math.round(((Number(revenueThisWeek?._sum.amount || 0) - Number(revenuePrevWeek._sum.amount)) / Number(revenuePrevWeek._sum.amount)) * 100)
      : 0,
    monthTrend: revenuePrevMonth?._sum.amount
      ? Math.round(((Number(revenueThisMonth?._sum.amount || 0) - Number(revenuePrevMonth._sum.amount)) / Number(revenuePrevMonth._sum.amount)) * 100)
      : 0,
    failedPayments: failedPayments || [],
    failedTotal: (failedPayments || []).reduce((sum, p) => sum + Number(p.amount), 0),
  } : null;

  // Calculate total spots booked today
  const totalSpotsBooked = todaysClasses.reduce((sum, session) => sum + session._count.bookings, 0);
  const totalCapacity = todaysClasses.reduce((sum, session) => sum + (session.class.capacity || 20), 0);

  // Calculate predicted traffic based on historical data for this day of week
  const todayDayOfWeek = now.getDay();
  const sameDayCheckIns = checkIns30Days.filter(c => c.checkedInAt.getDay() === todayDayOfWeek);
  const weeksOfData = 4;
  const avgTrafficForDay = sameDayCheckIns.length > 0
    ? Math.round(sameDayCheckIns.length / weeksOfData)
    : Math.round(checkIns30Days.length / 30);

  // Calculate today's hourly distribution for peak hours
  const todayHourlyVisits: Record<number, number> = {};
  for (let i = 0; i < 24; i++) todayHourlyVisits[i] = 0;
  checkInsTodayDetailed.forEach((checkIn) => {
    const hour = checkIn.checkedInAt.getHours();
    todayHourlyVisits[hour]++;
  });

  // Get historical peak hours for this day of week
  const sameDayHourlyPattern: Record<number, number> = {};
  for (let i = 0; i < 24; i++) sameDayHourlyPattern[i] = 0;
  sameDayCheckIns.forEach((checkIn) => {
    const hour = checkIn.checkedInAt.getHours();
    sameDayHourlyPattern[hour]++;
  });

  // Calculate traffic data
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

  // Today's peak hours
  const todayTotalCheckIns = Object.values(todayHourlyVisits).reduce((a, b) => a + b, 0);
  const todaysPeakHours = Object.entries(todayHourlyVisits)
    .map(([hour, count]) => ({
      hour: parseInt(hour),
      label: formatHour(parseInt(hour)),
      count,
      historicalAvg: Math.round(sameDayHourlyPattern[parseInt(hour)] / 4),
    }))
    .sort((a, b) => {
      if (todayTotalCheckIns > 5) return b.count - a.count;
      return b.historicalAvg - a.historicalAvg;
    })
    .slice(0, 3);

  const todayName = dayNames[now.getDay()] || 'Today';

  // Last week comparison: same day of week, 7 days ago
  const lastWeekStart = new Date(startOfDay.getTime() - 7 * 24 * 60 * 60 * 1000);
  const lastWeekEnd = new Date(lastWeekStart.getTime() + 24 * 60 * 60 * 1000);

  const [lastWeekCheckIns, lastWeekClasses, lastWeekSessions] = await Promise.all([
    prisma.checkIn.count({
      where: { gymId, checkedInAt: { gte: lastWeekStart, lt: lastWeekEnd } },
    }),
    prisma.classSession.count({
      where: { gymId, startTime: { gte: lastWeekStart, lt: lastWeekEnd }, status: 'SCHEDULED' },
    }),
    prisma.classSession.findMany({
      where: { gymId, startTime: { gte: lastWeekStart, lt: lastWeekEnd }, status: 'SCHEDULED' },
      include: {
        class: { select: { capacity: true } },
        _count: { select: { bookings: true } },
      },
    }),
  ]);

  const lastWeekSpotsBooked = lastWeekSessions.reduce((sum, s) => sum + s._count.bookings, 0);
  // Predicted traffic from last week's actual data (same day)
  const lastWeekCheckInsForDay = checkIns30Days.filter(
    (c) => c.checkedInAt >= lastWeekStart && c.checkedInAt < lastWeekEnd
  );
  const predictedTrafficLastWeek = lastWeekCheckInsForDay.length;

  const layout = await getDashboardLayout(staff.id);

  return {
    gym: staff.gym,
    staff,
    health,
    alerts,
    atRiskMembers,
    stats: { totalMembers, activeMembers, newThisMonth, checkInsToday, classesToday },
    revenue,
    expiringSubscriptions,
    todaysClasses,
    totalSpotsBooked,
    totalCapacity,
    predictedTraffic: avgTrafficForDay,
    todayName,
    todaysPeakHours,
    topHours,
    topDays,
    totalVisits,
    layout,
    lastWeekStats: {
      classesLastWeek: lastWeekClasses,
      checkInsLastWeek: lastWeekCheckIns,
      spotsBookedLastWeek: lastWeekSpotsBooked,
      predictedTrafficLastWeek,
    },
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (!data) {
    redirect('/login');
  }

  const { gym, staff } = data;

  // Serialize non-JSON-safe types (Date, Decimal) for the client component
  const serializedAlerts = data.alerts.map((a) => ({
    ...a,
    createdAt: a.createdAt.toISOString(),
  }));

  const serializedAtRiskMembers = data.atRiskMembers.map((m) => ({
    id: m.id,
    firstName: m.firstName,
    lastName: m.lastName,
    daysSinceLastActivity: m.daysSinceLastActivity,
  }));

  const serializedExpiringSubscriptions = data.expiringSubscriptions.map((s) => ({
    id: s.id,
    member: s.member,
    plan: s.plan,
    currentPeriodEnd: s.currentPeriodEnd.toISOString(),
  }));

  const serializedTodaysClasses = data.todaysClasses.map((c) => ({
    id: c.id,
    startTime: c.startTime.toISOString(),
    class: c.class,
    _count: c._count,
  }));

  const serializedRevenue = data.revenue
    ? {
        today: data.revenue.today,
        thisWeek: data.revenue.thisWeek,
        thisMonth: data.revenue.thisMonth,
        weekTrend: data.revenue.weekTrend,
        monthTrend: data.revenue.monthTrend,
        failedPayments: data.revenue.failedPayments.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          member: p.member,
        })),
        failedTotal: data.revenue.failedTotal,
      }
    : null;

  return (
    <>
      <Header
        title={`Good ${getTimeOfDay()}, ${gym.name}`}
        description="Here's what's happening at your gym"
      />
      <DashboardShell
        gymId={gym.id}
        staffRole={staff.role}
        initialLayout={data.layout}
        health={data.health}
        alerts={serializedAlerts}
        atRiskMembers={serializedAtRiskMembers}
        stats={data.stats}
        revenue={serializedRevenue}
        expiringSubscriptions={serializedExpiringSubscriptions}
        todaysClasses={serializedTodaysClasses}
        totalSpotsBooked={data.totalSpotsBooked}
        totalCapacity={data.totalCapacity}
        predictedTraffic={data.predictedTraffic}
        todayName={data.todayName}
        todaysPeakHours={data.todaysPeakHours}
        topHours={data.topHours}
        topDays={data.topDays}
        totalVisits={data.totalVisits}
        lastWeekStats={data.lastWeekStats}
      />
    </>
  );
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}
