'use client';

import { Activity, Calendar, TrendingUp, Clock } from 'lucide-react';

interface MemberStatsCardsProps {
  stats: {
    totalCheckIns: number;
    checkInsThisMonth: number;
    totalBookings: number;
    upcomingBookings: number;
  };
  summary?: {
    avgWeeklyVisits: number;
    streakDays: number;
    mostActiveDay: string | null;
    lastVisit: Date | null;
  };
}

export function MemberStatsCards({ stats, summary }: MemberStatsCardsProps) {
  const cards = [
    {
      label: 'Total Check-ins',
      value: stats.totalCheckIns,
      icon: Activity,
      color: 'text-indigo-600 bg-indigo-50',
    },
    {
      label: 'This Month',
      value: stats.checkInsThisMonth,
      icon: Calendar,
      color: 'text-green-600 bg-green-50',
    },
    {
      label: 'Avg Weekly Visits',
      value: summary?.avgWeeklyVisits ?? '-',
      icon: TrendingUp,
      color: 'text-amber-600 bg-amber-50',
    },
    {
      label: 'Current Streak',
      value: summary?.streakDays ? `${summary.streakDays} days` : '-',
      icon: Clock,
      color: 'text-rose-600 bg-rose-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-lg border border-slate-200 p-4"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${card.color}`}>
              <card.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="text-sm text-slate-500">{card.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
