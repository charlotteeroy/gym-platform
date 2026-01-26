import { getSession } from '@/lib/auth';
import { prisma } from '@gym/database';
import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/header';
import Link from 'next/link';

async function getTrafficData() {
  const session = await getSession();
  if (!session) return null;

  const staff = await prisma.staff.findFirst({
    where: { userId: session.user.id },
    include: { gym: true },
  });

  if (!staff) return null;

  const gymId = staff.gymId;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const [checkIns30Days, checkInsToday] = await Promise.all([
    prisma.checkIn.findMany({
      where: { gymId, checkedInAt: { gte: thirtyDaysAgo } },
      select: { checkedInAt: true },
    }),
    prisma.checkIn.findMany({
      where: { gymId, checkedInAt: { gte: startOfDay, lt: endOfDay } },
      select: { checkedInAt: true },
    }),
  ]);

  return {
    gym: staff.gym,
    checkIns30Days,
    checkInsToday,
  };
}

export default async function TrafficPage() {
  const data = await getTrafficData();

  if (!data) {
    redirect('/login');
  }

  const { gym, checkIns30Days, checkInsToday } = data;
  const now = new Date();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayIndex = now.getDay();

  const formatHour = (hour: number) => {
    if (hour === 0) return '12am';
    if (hour === 12) return '12pm';
    if (hour < 12) return `${hour}am`;
    return `${hour - 12}pm`;
  };

  // Initialize hourly data for each day
  const weeklyHourlyData: Record<string, Record<number, number>> = {};
  dayNames.forEach(day => {
    weeklyHourlyData[day] = {};
    for (let i = 0; i < 24; i++) weeklyHourlyData[day][i] = 0;
  });

  // Populate with check-in data
  checkIns30Days.forEach((checkIn) => {
    const day = dayNames[checkIn.checkedInAt.getDay()];
    const hour = checkIn.checkedInAt.getHours();
    if (day && weeklyHourlyData[day]) {
      weeklyHourlyData[day][hour]++;
    }
  });

  // Calculate peak hours for each day
  const peakHoursByDay = dayNames.map(day => {
    const hourData = Object.entries(weeklyHourlyData[day])
      .map(([hour, count]) => ({ hour: parseInt(hour), count: Math.round(count / 4) })) // avg over 4 weeks
      .sort((a, b) => b.count - a.count);

    const total = hourData.reduce((sum, h) => sum + h.count, 0);

    return {
      day,
      isToday: dayNames[todayIndex] === day,
      peakHours: hourData.slice(0, 3),
      totalVisits: total,
      hourlyData: hourData.sort((a, b) => a.hour - b.hour),
    };
  });

  // Sort to show today first, then rest of week
  const sortedDays = [
    ...peakHoursByDay.filter(d => d.isToday),
    ...peakHoursByDay.filter(d => !d.isToday),
  ];

  // Today's detailed hourly breakdown
  const todayHourly: Record<number, number> = {};
  for (let i = 0; i < 24; i++) todayHourly[i] = 0;
  checkInsToday.forEach((checkIn) => {
    const hour = checkIn.checkedInAt.getHours();
    todayHourly[hour]++;
  });

  const todayHourlyData = Object.entries(todayHourly)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }))
    .sort((a, b) => a.hour - b.hour);

  const maxTodayCount = Math.max(...todayHourlyData.map(h => h.count), 1);
  const currentHour = now.getHours();

  return (
    <>
      <Header
        title="Traffic Patterns"
        description="Understand when your gym is busiest"
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Back link */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>

        {/* Today's Traffic */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Today's Traffic
            </h3>
            <span className="text-sm font-medium text-indigo-600">
              {checkInsToday.length} check-ins so far
            </span>
          </div>

          {/* Hourly bar chart */}
          <div className="space-y-2">
            {todayHourlyData
              .filter(h => h.hour >= 5 && h.hour <= 22) // Show 5am-10pm
              .map((hourData) => {
                const isPast = hourData.hour < currentHour;
                const isCurrent = hourData.hour === currentHour;

                return (
                  <div key={hourData.hour} className="flex items-center gap-3">
                    <span className={`w-12 text-sm font-medium ${isCurrent ? 'text-indigo-600' : 'text-slate-500'}`}>
                      {formatHour(hourData.hour)}
                    </span>
                    <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isCurrent ? 'bg-indigo-500' : isPast ? 'bg-slate-400' : 'bg-slate-200'
                        }`}
                        style={{ width: `${(hourData.count / maxTodayCount) * 100}%` }}
                      />
                      {hourData.count > 0 && (
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-600">
                          {hourData.count}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Weekly Peak Hours */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Peak Hours by Day
          </h3>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedDays.map((dayData) => (
              <div
                key={dayData.day}
                className={`rounded-xl p-4 ${
                  dayData.isToday
                    ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200'
                    : 'bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`font-semibold ${dayData.isToday ? 'text-indigo-700' : 'text-slate-700'}`}>
                    {dayData.day}
                    {dayData.isToday && <span className="ml-2 text-xs font-normal text-indigo-500">(Today)</span>}
                  </h4>
                  <span className="text-sm text-slate-500">~{dayData.totalVisits} avg</span>
                </div>

                <div className="space-y-2">
                  {dayData.peakHours.slice(0, 3).map((peak, index) => (
                    <div key={peak.hour} className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0
                          ? dayData.isToday ? 'bg-indigo-500 text-white' : 'bg-amber-500 text-white'
                          : index === 1
                          ? 'bg-slate-200 text-slate-600'
                          : 'bg-slate-100 text-slate-500'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium text-slate-700">{formatHour(peak.hour)}</span>
                      <span className="text-sm text-slate-400 ml-auto">~{peak.count} visits</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Heatmap */}
        <div className="bg-white rounded-2xl shadow-sm p-6 overflow-x-auto">
          <h3 className="font-semibold text-slate-800 mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Weekly Heatmap
          </h3>

          <div className="min-w-[600px]">
            {/* Header row - hours */}
            <div className="flex gap-1 mb-2">
              <div className="w-20" />
              {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map(hour => (
                <div key={hour} className="flex-1 text-center text-xs text-slate-400">
                  {formatHour(hour)}
                </div>
              ))}
            </div>

            {/* Day rows */}
            {dayNames.map((day) => {
              const dayData = weeklyHourlyData[day];
              const maxForDay = Math.max(...Object.values(dayData), 1);

              return (
                <div key={day} className="flex gap-1 mb-1 items-center">
                  <div className={`w-20 text-sm font-medium truncate ${
                    dayNames[todayIndex] === day ? 'text-indigo-600' : 'text-slate-600'
                  }`}>
                    {day.slice(0, 3)}
                  </div>
                  {[6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21].map(hour => {
                    const count = Math.round(dayData[hour] / 4); // avg over 4 weeks
                    const intensity = count / Math.max(maxForDay / 4, 1);

                    return (
                      <div
                        key={hour}
                        className="flex-1 h-8 rounded transition-colors cursor-default"
                        style={{
                          backgroundColor: intensity > 0.7
                            ? '#10b981' // emerald-500
                            : intensity > 0.4
                            ? '#34d399' // emerald-400
                            : intensity > 0.1
                            ? '#a7f3d0' // emerald-200
                            : '#f1f5f9' // slate-100
                        }}
                        title={`${day} ${formatHour(hour)}: ~${count} avg visits`}
                      />
                    );
                  })}
                </div>
              );
            })}

            {/* Legend */}
            <div className="flex items-center justify-end gap-4 mt-4 text-xs text-slate-500">
              <span>Less busy</span>
              <div className="flex gap-1">
                <div className="w-4 h-4 rounded bg-slate-100" />
                <div className="w-4 h-4 rounded bg-emerald-200" />
                <div className="w-4 h-4 rounded bg-emerald-400" />
                <div className="w-4 h-4 rounded bg-emerald-500" />
              </div>
              <span>More busy</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
