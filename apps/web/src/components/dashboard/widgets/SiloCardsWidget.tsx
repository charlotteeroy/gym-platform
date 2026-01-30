'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface SiloCard {
  name: string;
  revenue: number;
  trendPercent: number;
  primaryMetric: string;
  secondaryMetric: string;
  sparkline: { value: number }[];
}

interface SiloCardsWidgetProps {
  gymId: string;
}

const SILO_THEMES: Record<string, { color: string; fill: string; stroke: string; bg: string; badge: string }> = {
  PT: {
    color: 'text-violet-600',
    fill: '#8b5cf6',
    stroke: '#8b5cf6',
    bg: 'bg-violet-50',
    badge: 'bg-violet-100 text-violet-700',
  },
  Classes: {
    color: 'text-indigo-600',
    fill: '#6366f1',
    stroke: '#6366f1',
    bg: 'bg-indigo-50',
    badge: 'bg-indigo-100 text-indigo-700',
  },
  'Open Gym': {
    color: 'text-emerald-600',
    fill: '#10b981',
    stroke: '#10b981',
    bg: 'bg-emerald-50',
    badge: 'bg-emerald-100 text-emerald-700',
  },
};

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);

export default function SiloCardsWidget({ gymId }: SiloCardsWidgetProps) {
  const [data, setData] = useState<SiloCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/dashboard/silos')
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success) {
          setData(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white rounded-xl p-5 animate-pulse">
            <div className="h-4 w-20 bg-slate-200 rounded mb-3" />
            <div className="h-7 w-28 bg-slate-200 rounded mb-2" />
            <div className="h-3 w-36 bg-slate-200 rounded mb-1" />
            <div className="h-3 w-32 bg-slate-200 rounded mb-3" />
            <div className="h-[60px] bg-slate-200 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {data.map((silo) => {
        const theme = SILO_THEMES[silo.name] ?? SILO_THEMES['PT'];
        const trendUp = silo.trendPercent >= 0;

        return (
          <div
            key={silo.name}
            className="bg-white rounded-xl p-5 hover:shadow-md transition"
          >
            <span className={`text-xs font-semibold uppercase tracking-wide ${theme.color}`}>
              {silo.name}
            </span>

            <div className="flex items-center gap-2 mt-1 mb-2">
              <span className="text-2xl font-bold text-slate-900">
                {formatCurrency(silo.revenue)}
              </span>
              <span
                className={`text-sm font-medium ${
                  trendUp ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {trendUp ? '↑' : '↓'} {Math.abs(silo.trendPercent).toFixed(1)}%
              </span>
            </div>

            <p className="text-sm text-slate-600">{silo.primaryMetric}</p>
            <p className="text-xs text-slate-400 mb-3">{silo.secondaryMetric}</p>

            <ResponsiveContainer width="100%" height={60}>
              <AreaChart data={silo.sparkline} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={theme.stroke}
                  fill={theme.fill}
                  fillOpacity={0.2}
                  strokeWidth={2}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}
