import Link from 'next/link';

interface TodayOverviewWidgetProps {
  todayName: string;
  stats: {
    classesToday: number;
    checkInsToday: number;
  };
  totalSpotsBooked: number;
  totalCapacity: number;
  predictedTraffic: number;
  todaysPeakHours: {
    hour: number;
    label: string;
    count: number;
    historicalAvg: number;
  }[];
  lastWeekStats?: {
    classesLastWeek: number;
    checkInsLastWeek: number;
    spotsBookedLastWeek: number;
    predictedTrafficLastWeek: number;
  };
}

function ComparisonBadge({ current, previous, label }: { current: number; previous: number; label?: string }) {
  const diff = current - previous;
  if (diff === 0) return null;
  const isPositive = diff > 0;
  return (
    <span className={`text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-amber-600'}`}>
      {isPositive ? '+' : ''}{diff} vs last {label || 'week'}
    </span>
  );
}

export default function TodayOverviewWidget({
  todayName,
  stats,
  totalSpotsBooked,
  totalCapacity,
  predictedTraffic,
  todaysPeakHours,
  lastWeekStats,
}: TodayOverviewWidgetProps) {
  return (
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
          <div className="flex items-center justify-between">
            <p className="text-xs text-indigo-600 group-hover:text-indigo-700">View schedule →</p>
            {lastWeekStats && (
              <ComparisonBadge current={stats.classesToday} previous={lastWeekStats.classesLastWeek} />
            )}
          </div>
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
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${totalCapacity > 0 ? Math.min((totalSpotsBooked / totalCapacity) * 100, 100) : 0}%` }}
              />
            </div>
            {lastWeekStats && (
              <ComparisonBadge current={totalSpotsBooked} previous={lastWeekStats.spotsBookedLastWeek} />
            )}
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
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              <span className="font-medium text-amber-600">{stats.checkInsToday}</span> so far
            </p>
            {lastWeekStats && (
              <ComparisonBadge current={predictedTraffic} previous={lastWeekStats.predictedTrafficLastWeek} />
            )}
          </div>
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
            {todaysPeakHours.length >= 2 && (
              <>Also busy: <span className="font-medium text-blue-600">
                {todaysPeakHours[1]?.label}
                {todaysPeakHours[2]?.label && `, ${todaysPeakHours[2].label}`}
              </span></>
            )}
          </p>
        </Link>
      </div>
    </div>
  );
}
