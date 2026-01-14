import { getSession } from '@/lib/auth';
import { prisma } from '@gym/database';
import { getGymHealth, getAlerts, getAtRiskMembers, type Alert, type GymHealthScore } from '@gym/core';
import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/header';
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
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

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
  ]: [GymHealthScore, Alert[], Awaited<ReturnType<typeof getAtRiskMembers>>, number, number, number, number, number, { checkedInAt: Date }[]] = await Promise.all([
    getGymHealth(gymId),
    getAlerts(gymId),
    getAtRiskMembers(gymId, 5),
    prisma.member.count({ where: { gymId } }),
    prisma.member.count({ where: { gymId, status: 'ACTIVE' } }),
    prisma.member.count({ where: { gymId, createdAt: { gte: startOfMonth } } }),
    prisma.checkIn.count({ where: { gymId, checkedInAt: { gte: startOfDay, lt: endOfDay } } }),
    prisma.classSession.count({ where: { gymId, startTime: { gte: startOfDay, lt: endOfDay }, status: 'SCHEDULED' } }),
    prisma.checkIn.findMany({ where: { gymId, checkedInAt: { gte: thirtyDaysAgo } }, select: { checkedInAt: true } }),
  ]);

  return {
    gym: staff.gym,
    staff,
    health,
    alerts,
    atRiskMembers,
    stats: { totalMembers, activeMembers, newThisMonth, checkInsToday, classesToday },
    checkIns30Days,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (!data) {
    redirect('/login');
  }

  const { gym, health, alerts, atRiskMembers, stats, checkIns30Days } = data;

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

  return (
    <>
      <Header
        title={`Good ${getTimeOfDay()}, ${gym.name}`}
        description="Here's what's happening at your gym"
      />

      <div className="p-4 md:p-6 space-y-6">
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

        {/* Gym Health Score */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Gym Health</h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              health.status === 'healthy' ? 'bg-emerald-100 text-emerald-700' :
              health.status === 'warning' ? 'bg-amber-100 text-amber-700' :
              'bg-red-100 text-red-700'
            }`}>
              {health.status === 'healthy' ? 'Healthy' : health.status === 'warning' ? 'Needs Attention' : 'Critical'}
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative w-24 h-24">
              <svg className="w-24 h-24 transform -rotate-90">
                <circle cx="48" cy="48" r="40" stroke="#e2e8f0" strokeWidth="8" fill="none" />
                <circle
                  cx="48" cy="48" r="40"
                  stroke={health.status === 'healthy' ? '#10b981' : health.status === 'warning' ? '#f59e0b' : '#ef4444'}
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${health.score * 2.51} 251`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-slate-900">{health.score}</span>
              </div>
            </div>
            <div className="flex-1 grid grid-cols-2 gap-3">
              {[
                { name: 'Member Retention', value: health.factors.memberRetention },
                { name: 'Subscriptions', value: health.factors.subscriptionHealth },
                { name: 'Class Engagement', value: health.factors.classEngagement },
                { name: 'Revenue Stability', value: health.factors.revenueStability },
              ].map((factor) => (
                <div key={factor.name} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    factor.value >= 75 ? 'bg-emerald-500' :
                    factor.value >= 50 ? 'bg-amber-500' : 'bg-red-500'
                  }`} />
                  <span className="text-sm text-slate-600">{factor.name}</span>
                  <span className="text-xs text-slate-400 ml-auto">{factor.value}%</span>
                </div>
              ))}
            </div>
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

        {/* At Risk Members */}
        {atRiskMembers.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Members Needing Attention</h3>
              <Link href="/members?activityLevel=declining" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                View all
              </Link>
            </div>
            <div className="space-y-3">
              {atRiskMembers.map((member) => (
                <Link
                  key={member.id}
                  href={`/members/${member.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-medium text-sm">
                    {member.firstName[0]}{member.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{member.firstName} {member.lastName}</p>
                    <p className="text-sm text-slate-500 truncate">{member.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-600">{member.daysSinceLastActivity}d ago</p>
                    <p className="text-xs text-slate-400">last activity</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

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
