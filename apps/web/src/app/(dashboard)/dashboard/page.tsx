import { getSession } from '@/lib/auth';
import { prisma } from '@gym/database';
import { getGymHealth, getAlerts, getAtRiskMembers, type Alert, type GymHealthScore } from '@gym/core';
import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { TopOpportunities } from '@/components/dashboard/opportunities-widget';
import Link from 'next/link';

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
  const weeksOfData = 4; // Approximate 4 weeks in 30 days
  const avgTrafficForDay = sameDayCheckIns.length > 0
    ? Math.round(sameDayCheckIns.length / weeksOfData)
    : Math.round(checkIns30Days.length / 30); // Fallback to daily average

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

  return {
    gym: staff.gym,
    staff,
    health,
    alerts,
    atRiskMembers,
    stats: { totalMembers, activeMembers, newThisMonth, checkInsToday, classesToday },
    checkIns30Days,
    checkInsTodayDetailed,
    todayHourlyVisits,
    sameDayHourlyPattern,
    revenue,
    expiringSubscriptions,
    todaysClasses,
    totalSpotsBooked,
    totalCapacity,
    predictedTraffic: avgTrafficForDay,
    isOwnerOrAdmin,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (!data) {
    redirect('/login');
  }

  const {
    gym,
    health,
    alerts,
    atRiskMembers,
    stats,
    checkIns30Days,
    todayHourlyVisits,
    sameDayHourlyPattern,
    revenue,
    expiringSubscriptions,
    todaysClasses,
    totalSpotsBooked,
    totalCapacity,
    predictedTraffic,
    isOwnerOrAdmin,
  } = data;

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

  // Calculate today's peak hours (based on actual check-ins + historical pattern)
  const todayTotalCheckIns = Object.values(todayHourlyVisits).reduce((a, b) => a + b, 0);
  const todaysPeakHours = Object.entries(todayHourlyVisits)
    .map(([hour, count]) => ({
      hour: parseInt(hour),
      label: formatHour(parseInt(hour)),
      count,
      historicalAvg: Math.round(sameDayHourlyPattern[parseInt(hour)] / 4), // avg over 4 weeks
    }))
    .sort((a, b) => {
      // If we have today's data, sort by actual count, otherwise by historical
      if (todayTotalCheckIns > 5) return b.count - a.count;
      return b.historicalAvg - a.historicalAvg;
    })
    .slice(0, 3);

  // Get day name for today
  const todayName = dayNames[new Date().getDay()];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

  return (
    <>
      <Header
        title={`Good ${getTimeOfDay()}, ${gym.name}`}
        description="Here's what's happening at your gym"
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Gym Health Score - Prominent */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Business Health</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              health.status === 'healthy' ? 'bg-emerald-100 text-emerald-700' :
              health.status === 'warning' ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {health.status === 'healthy' ? 'Healthy' : health.status === 'warning' ? 'Needs Attention' : 'Critical'}
            </span>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative w-28 h-28">
              <svg className="w-28 h-28 transform -rotate-90">
                <circle cx="56" cy="56" r="48" stroke="#e2e8f0" strokeWidth="10" fill="none" />
                <circle
                  cx="56" cy="56" r="48"
                  stroke={health.status === 'healthy' ? '#10b981' : health.status === 'warning' ? '#f59e0b' : '#ef4444'}
                  strokeWidth="10"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${health.score * 3.02} 302`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-slate-900">{health.score}</span>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-4">
              {[
                { name: 'Member Retention', value: health.factors.memberRetention },
                { name: 'Subscriptions', value: health.factors.subscriptionHealth },
                { name: 'Class Engagement', value: health.factors.classEngagement },
                { name: 'Revenue Stability', value: health.factors.revenueStability },
              ].map((factor) => (
                <div key={factor.name} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${
                    factor.value >= 75 ? 'bg-emerald-500' :
                    factor.value >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm text-slate-600">{factor.name}</span>
                  <span className="text-sm font-semibold text-slate-900 ml-auto">{factor.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Your Day Section */}
        <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 rounded-2xl shadow-sm p-6 border border-indigo-100/50">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Your {todayName}
            </h3>
            <span className="text-sm text-slate-500">
              {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Classes Today */}
            <Link
              href="/dashboard/classes"
              className="bg-white rounded-xl p-4 hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">{stats.classesToday}</p>
                  <p className="text-xs text-slate-500">Classes</p>
                </div>
              </div>
              <p className="text-xs text-indigo-600 group-hover:text-indigo-700">View schedule →</p>
            </Link>

            {/* Spots Booked */}
            <Link
              href="/dashboard/classes"
              className="bg-white rounded-xl p-4 hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    {totalSpotsBooked}
                    <span className="text-sm font-normal text-slate-400">/{totalCapacity}</span>
                  </p>
                  <p className="text-xs text-slate-500">Spots Booked</p>
                </div>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${totalCapacity > 0 ? Math.min((totalSpotsBooked / totalCapacity) * 100, 100) : 0}%` }}
                />
              </div>
            </Link>

            {/* Predicted Traffic */}
            <Link
              href="/dashboard/traffic"
              className="bg-white rounded-xl p-4 hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900">
                    ~{predictedTraffic}
                  </p>
                  <p className="text-xs text-slate-500">Expected Visits</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                <span className="font-medium text-amber-600">{stats.checkInsToday}</span> so far today
              </p>
            </Link>

            {/* Peak Hours Today */}
            <Link
              href="/dashboard/traffic"
              className="bg-white rounded-xl p-4 hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer group"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">
                    {todaysPeakHours[0]?.label || '-'}
                  </p>
                  <p className="text-xs text-slate-500">Peak Hour</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                {todaysPeakHours.length > 1 && (
                  <>Also busy: <span className="font-medium text-blue-600">{todaysPeakHours[1]?.label}, {todaysPeakHours[2]?.label}</span></>
                )}
              </p>
            </Link>
          </div>
        </div>

        {/* Key Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{stats.totalMembers}</p>
                <p className="text-sm text-slate-500">Total Members</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{stats.activeMembers}</p>
                <p className="text-sm text-slate-500">Active Members</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{stats.checkInsToday}</p>
                <p className="text-sm text-slate-500">Check-ins Today</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border-0">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{stats.classesToday}</p>
                <p className="text-sm text-slate-500">Classes Today</p>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Section - Owner/Admin Only */}
        {isOwnerOrAdmin && revenue && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Revenue
              </h3>
              <Link href="/admin/billing" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                View details
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-500 mb-1">Today</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(revenue.today)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-500 mb-1">This Week</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(revenue.thisWeek)}</p>
                  {revenue.weekTrend !== 0 && (
                    <span className={`text-sm font-medium ${revenue.weekTrend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {revenue.weekTrend > 0 ? '↑' : '↓'} {Math.abs(revenue.weekTrend)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-500 mb-1">This Month</p>
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(revenue.thisMonth)}</p>
                  {revenue.monthTrend !== 0 && (
                    <span className={`text-sm font-medium ${revenue.monthTrend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      {revenue.monthTrend > 0 ? '↑' : '↓'} {Math.abs(revenue.monthTrend)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
            {revenue.failedPayments.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-red-800">
                    {revenue.failedPayments.length} failed payment{revenue.failedPayments.length > 1 ? 's' : ''} ({formatCurrency(revenue.failedTotal)})
                  </p>
                  <Link href="/admin/billing/payments?status=FAILED" className="text-sm text-red-600 hover:text-red-700 font-medium">
                    View all
                  </Link>
                </div>
                <div className="space-y-2">
                  {revenue.failedPayments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between text-sm">
                      <span className="text-red-700">
                        {payment.member?.firstName} {payment.member?.lastName}
                      </span>
                      <span className="font-medium text-red-800">{formatCurrency(Number(payment.amount))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Member Retention Section */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* At Risk Members */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                At-Risk Members
              </h3>
              <Link href="/members?activityLevel=declining" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                View all
              </Link>
            </div>
            {atRiskMembers.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No at-risk members</p>
            ) : (
              <div className="space-y-3">
                {atRiskMembers.map((member) => (
                  <Link
                    key={member.id}
                    href={`/members/${member.id}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-medium text-sm">
                      {member.firstName[0]}{member.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm">{member.firstName} {member.lastName}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-red-600">{member.daysSinceLastActivity}d</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Expiring Subscriptions */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Expiring This Week
              </h3>
              <Link href="/subscriptions" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                View all
              </Link>
            </div>
            {expiringSubscriptions.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-4">No subscriptions expiring soon</p>
            ) : (
              <div className="space-y-3">
                {expiringSubscriptions.map((sub) => {
                  const daysUntil = Math.ceil((new Date(sub.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <Link
                      key={sub.id}
                      href={`/members/${sub.member.id}`}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center text-purple-600 font-medium text-sm">
                        {sub.member.firstName[0]}{sub.member.lastName[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm">{sub.member.firstName} {sub.member.lastName}</p>
                        <p className="text-xs text-slate-500">{sub.plan.name}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${daysUntil <= 2 ? 'text-red-600' : 'text-amber-600'}`}>
                          {daysUntil}d
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Alerts</h3>
            <div className="space-y-3">
              {alerts.slice(0, 3).map((alert, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-xl ${
                    alert.severity === 'critical' ? 'bg-red-50' :
                    alert.severity === 'warning' ? 'bg-amber-50' : 'bg-blue-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    alert.severity === 'critical' ? 'bg-red-100' :
                    alert.severity === 'warning' ? 'bg-amber-100' : 'bg-blue-100'
                  }`}>
                    <svg className={`w-4 h-4 ${
                      alert.severity === 'critical' ? 'text-red-600' :
                      alert.severity === 'warning' ? 'text-amber-600' : 'text-blue-600'
                    }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{alert.title}</p>
                    <p className="text-sm text-slate-600">{alert.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today's Classes */}
        {todaysClasses.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                Today's Classes
              </h3>
              <Link href="/planning" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                View schedule
              </Link>
            </div>
            <div className="space-y-3">
              {todaysClasses.slice(0, 5).map((session) => {
                const capacity = session.class.capacity || 20;
                const booked = session._count.bookings;
                const percentage = Math.round((booked / capacity) * 100);
                const isFull = booked >= capacity;

                return (
                  <div key={session.id} className="flex items-center gap-4 p-3 rounded-xl bg-slate-50">
                    <div className="text-center min-w-[60px]">
                      <p className="text-sm font-bold text-slate-900">
                        {new Date(session.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900">{session.class.name}</p>
                      <p className="text-sm text-slate-500">
                        {session.class.instructor ? `${session.class.instructor.firstName} ${session.class.instructor.lastName}` : 'TBA'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${isFull ? 'text-red-600' : percentage >= 80 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {booked}/{capacity}
                      </p>
                      <div className="w-16 h-1.5 bg-slate-200 rounded-full mt-1">
                        <div
                          className={`h-full rounded-full ${isFull ? 'bg-red-500' : percentage >= 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Traffic Patterns */}
        {totalVisits > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Peak Hours */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Peak Hours
                </h3>
              </div>
              <div className="p-5">
                <div className="space-y-4">
                  {topHours.map((hour, index) => (
                    <div key={hour.hour} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-amber-500 text-white' :
                        index === 1 ? 'bg-slate-200 text-slate-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-900">{hour.label}</span>
                          <span className="text-sm font-bold text-amber-600">{hour.percentage}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-amber-400' : 'bg-amber-300'
                            }`}
                            style={{ width: `${Math.max(hour.percentage * 2, 8)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-4">Based on {totalVisits} check-ins (30 days)</p>
              </div>
            </div>

            {/* Peak Days */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Busiest Days
                </h3>
              </div>
              <div className="p-5">
                <div className="space-y-4">
                  {topDays.map((dayData, index) => (
                    <div key={dayData.day} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-blue-500 text-white' :
                        index === 1 ? 'bg-slate-200 text-slate-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-900">{dayData.day}</span>
                          <span className="text-sm font-bold text-blue-600">{dayData.percentage}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-blue-400' : 'bg-blue-300'
                            }`}
                            style={{ width: `${Math.max(dayData.percentage * 2, 8)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-4">{topDays[0]?.day} sees the most traffic</p>
              </div>
            </div>
          </div>
        )}

        {/* Top Opportunities */}
        <TopOpportunities gymId={gym.id} />

        {/* Recent Activity */}
        <RecentActivity gymId={gym.id} />
      </div>
    </>
  );
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

async function RecentActivity({ gymId }: { gymId: string }) {
  const recentBookings = await prisma.booking.findMany({
    where: { member: { gymId } },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      member: true,
      session: { include: { class: true } },
    },
  });

  if (recentBookings.length === 0) return null;

  const formatTimeAgo = (date: Date): string => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h3 className="font-semibold text-slate-800 mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {recentBookings.map((booking) => (
          <div key={booking.id} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm">
                  <span className="font-medium text-slate-900">{booking.member.firstName}</span>
                  <span className="text-slate-500"> booked </span>
                  <span className="font-medium text-slate-900">{booking.session.class.name}</span>
                </p>
              </div>
            </div>
            <span className="text-xs text-slate-400">{formatTimeAgo(booking.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
