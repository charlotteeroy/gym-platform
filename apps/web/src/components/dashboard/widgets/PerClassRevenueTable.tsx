'use client';

import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

type Range = '30d' | '90d' | '6m' | '12m';
type SortBy = 'name' | 'sessions' | 'revenue' | 'avgPerSession' | 'trend' | 'amPm';

interface ClassRevenueRow {
  name: string;
  sessions: number;
  revenue: number;
  avgPerSession: number;
  trendPercent: number;
  amSessions: number;
  pmSessions: number;
}

interface TimeSlot {
  label: string;
  revenue: number;
  sessions: number;
}

interface ClassRevenueData {
  rows: ClassRevenueRow[];
  totals: {
    sessions: number;
    revenue: number;
    avgPerSession: number;
  };
  timeSlots?: TimeSlot[];
}

interface PerClassRevenueTableProps {
  gymId: string;
}

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '6m', label: '6m' },
  { value: '12m', label: '12m' },
];

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);

const tooltipStyle = {
  borderRadius: '0.75rem',
  border: 'none',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
};

export default function PerClassRevenueTable({ gymId }: PerClassRevenueTableProps) {
  const [range, setRange] = useState<Range>('30d');
  const [sortBy, setSortBy] = useState<SortBy>('revenue');
  const [data, setData] = useState<ClassRevenueData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/dashboard/class-revenue?range=${range}&sortBy=${sortBy}`)
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
  }, [range, sortBy]);

  const handleSort = (col: SortBy) => {
    setSortBy(col);
  };

  const sortArrow = (col: SortBy) =>
    sortBy === col ? ' \u2193' : '';

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="animate-pulse space-y-3">
          <div className="flex gap-2 mb-4">
            {RANGE_OPTIONS.map((o) => (
              <div key={o.value} className="h-8 w-12 bg-slate-200 rounded-lg" />
            ))}
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-200 rounded" />
          ))}
        </div>
      </div>
    );
  }

  const rows = data?.rows ?? [];
  const totals = data?.totals;
  const timeSlots = data?.timeSlots ?? [];

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800">Per-Class Revenue</h3>
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
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {([
                ['name', 'Class Name'],
                ['sessions', 'Sessions'],
                ['revenue', 'Revenue'],
                ['avgPerSession', 'Avg/Session'],
                ['trend', 'Trend %'],
                ['amPm', 'AM/PM Split'],
              ] as [SortBy, string][]).map(([col, label]) => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="text-left py-3 px-2 text-slate-500 font-medium cursor-pointer hover:text-slate-700 select-none"
                >
                  {label}{sortArrow(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const total = row.amSessions + row.pmSessions;
              const amPct = total > 0 ? (row.amSessions / total) * 100 : 50;
              const pmPct = total > 0 ? (row.pmSessions / total) * 100 : 50;

              return (
                <tr key={row.name} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-2 font-medium text-slate-800">{row.name}</td>
                  <td className="py-3 px-2 text-slate-600">{row.sessions}</td>
                  <td className="py-3 px-2 font-medium text-slate-800">
                    {formatCurrency(row.revenue)}
                  </td>
                  <td className="py-3 px-2 text-slate-600">
                    {formatCurrency(row.avgPerSession)}
                  </td>
                  <td className="py-3 px-2">
                    <span
                      className={`font-medium ${
                        row.trendPercent >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {row.trendPercent >= 0 ? '\u2191' : '\u2193'}{' '}
                      {Math.abs(row.trendPercent).toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-3 w-24 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-400"
                          style={{ width: `${amPct}%` }}
                        />
                        <div
                          className="bg-orange-400"
                          style={{ width: `${pmPct}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">
                        {row.amSessions}AM / {row.pmSessions}PM
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {totals && (
            <tfoot>
              <tr className="border-t-2 border-slate-300 font-semibold text-slate-800">
                <td className="py-3 px-2">Total</td>
                <td className="py-3 px-2">{totals.sessions}</td>
                <td className="py-3 px-2">{formatCurrency(totals.revenue)}</td>
                <td className="py-3 px-2">{formatCurrency(totals.avgPerSession)}</td>
                <td className="py-3 px-2" />
                <td className="py-3 px-2" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Time-Slot Revenue Chart */}
      {timeSlots.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-200">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Revenue by Time Slot</h4>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={timeSlots} margin={{ top: 5, right: 5, bottom: 5, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#475569' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatCurrency(v)}
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip
                formatter={((value: number, name: string) => [
                  name === 'revenue' ? formatCurrency(value) : value,
                  name === 'revenue' ? 'Revenue' : 'Sessions',
                ]) as any}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
