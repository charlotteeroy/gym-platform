'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from 'recharts';

interface KeyStatsWidgetProps {
  stats: {
    totalMembers: number;
    activeMembers: number;
    checkInsToday: number;
    classesToday: number;
  };
}

interface TrendData {
  members: { day: string; value: number }[];
  active: { day: string; value: number }[];
  checkIns: { day: string; value: number }[];
  classes: { day: string; value: number }[];
}

function Sparkline({ data, color }: { data: { day: string; value: number }[]; color: string }) {
  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          fill={color}
          fillOpacity={0.15}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function KeyStatsWidget({ stats }: KeyStatsWidgetProps) {
  const [trends, setTrends] = useState<TrendData | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard/key-stats-trend')
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success) {
          setTrends(json.data);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const cards = [
    {
      value: stats.totalMembers,
      label: 'Total Members',
      color: '#6366f1',
      bgColor: 'bg-indigo-100',
      trendKey: 'members' as const,
      icon: (
        <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
    },
    {
      value: stats.activeMembers,
      label: 'Active Members',
      color: '#10b981',
      bgColor: 'bg-emerald-100',
      trendKey: 'active' as const,
      icon: (
        <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      value: stats.checkInsToday,
      label: 'Check-ins Today',
      color: '#f59e0b',
      bgColor: 'bg-amber-100',
      trendKey: 'checkIns' as const,
      icon: (
        <svg className="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
        </svg>
      ),
    },
    {
      value: stats.classesToday,
      label: 'Classes Today',
      color: '#8b5cf6',
      bgColor: 'bg-purple-100',
      trendKey: 'classes' as const,
      icon: (
        <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-2xl p-5 shadow-sm border-0">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl ${card.bgColor} flex items-center justify-center`}>
              {card.icon}
            </div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{card.value}</p>
              <p className="text-sm text-slate-500">{card.label}</p>
            </div>
          </div>
          {trends && trends[card.trendKey] && (
            <div className="mt-3">
              <Sparkline data={trends[card.trendKey]} color={card.color} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
