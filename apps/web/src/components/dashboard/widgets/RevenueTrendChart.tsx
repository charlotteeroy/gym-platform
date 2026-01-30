'use client';

import { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
} from 'recharts';

type Range = '30d' | '90d' | '6m' | '12m' | 'ytd' | 'all';

interface RevenueTrendData {
  points: { date: string; pt: number; classes: number; openGym: number; yoy?: number }[];
  momChange: number;
  yoyChange: number;
}

interface RevenueTrendChartProps {
  gymId: string;
}

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '6m', label: '6m' },
  { value: '12m', label: '12m' },
  { value: 'ytd', label: 'YTD' },
  { value: 'all', label: 'All' },
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);

export default function RevenueTrendChart({ gymId }: RevenueTrendChartProps) {
  const [range, setRange] = useState<Range>('30d');
  const [showYoY, setShowYoY] = useState(false);
  const [data, setData] = useState<RevenueTrendData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/dashboard/revenue-trend?range=${range}&yoy=${showYoY}`)
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
  }, [range, showYoY]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="animate-pulse space-y-4">
          <div className="flex gap-4">
            <div className="h-20 w-40 bg-slate-200 rounded-xl" />
            <div className="h-20 w-40 bg-slate-200 rounded-xl" />
          </div>
          <div className="flex gap-2">
            {RANGE_OPTIONS.map((o) => (
              <div key={o.value} className="h-8 w-12 bg-slate-200 rounded-lg" />
            ))}
          </div>
          <div className="h-[350px] bg-slate-200 rounded-xl" />
        </div>
      </div>
    );
  }

  const momChange = data?.momChange ?? 0;
  const yoyChange = data?.yoyChange ?? 0;
  const hasYoYData = data?.points?.some((p) => p.yoy !== undefined) ?? false;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h3 className="font-semibold text-slate-800 mb-4">Revenue Trend</h3>

      {/* KPI Cards */}
      <div className="flex gap-4 mb-4">
        <div className="bg-slate-50 rounded-xl p-4 flex-1">
          <p className="text-sm text-slate-500 mb-1">MoM Change</p>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-slate-900">
              {Math.abs(momChange).toFixed(1)}%
            </span>
            <span
              className={`text-sm font-medium ${
                momChange >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {momChange >= 0 ? '↑' : '↓'}
            </span>
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-4 flex-1">
          <p className="text-sm text-slate-500 mb-1">YoY Change</p>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-slate-900">
              {Math.abs(yoyChange).toFixed(1)}%
            </span>
            <span
              className={`text-sm font-medium ${
                yoyChange >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {yoyChange >= 0 ? '↑' : '↓'}
            </span>
          </div>
        </div>
      </div>

      {/* Range selector + YoY toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setRange(opt.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                range === opt.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
          <span>Compare YoY</span>
          <button
            role="switch"
            aria-checked={showYoY}
            onClick={() => setShowYoY((v) => !v)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
              showYoY ? 'bg-indigo-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition transform ${
                showYoY ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={350}>
        <AreaChart data={data?.points ?? []} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => formatCurrency(v)}
            tick={{ fontSize: 12, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            width={70}
          />
          <Tooltip
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((value: number, name: string) => [formatCurrency(value), name]) as any}
            contentStyle={{
              borderRadius: '0.75rem',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
          />
          <Area
            type="monotone"
            dataKey="pt"
            name="PT"
            stackId="1"
            stroke="#8b5cf6"
            fill="#8b5cf6"
            fillOpacity={0.6}
          />
          <Area
            type="monotone"
            dataKey="classes"
            name="Classes"
            stackId="1"
            stroke="#6366f1"
            fill="#6366f1"
            fillOpacity={0.6}
          />
          <Area
            type="monotone"
            dataKey="openGym"
            name="Open Gym"
            stackId="1"
            stroke="#10b981"
            fill="#10b981"
            fillOpacity={0.6}
          />
          {showYoY && hasYoYData && (
            <Line
              type="monotone"
              dataKey="yoy"
              name="Last Year"
              stroke="#64748b"
              strokeDasharray="5 5"
              dot={false}
              strokeWidth={2}
            />
          )}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
