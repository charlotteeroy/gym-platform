'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface RevenueSummaryWidgetProps {
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    weekTrend: number;
    monthTrend: number;
    failedPayments: any[];
    failedTotal: number;
  };
  gymId: string;
}

interface SiloBreakdown {
  pt: number;
  classes: number;
  openGym: number;
  other: number;
  total: number;
}

const SILO_COLORS: Record<string, string> = {
  PT: '#8b5cf6',
  Classes: '#6366f1',
  'Open Gym': '#10b981',
  Other: '#64748b',
};

const tooltipStyle = {
  borderRadius: '0.75rem',
  border: 'none',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
};

export default function RevenueSummaryWidget({ revenue, gymId }: RevenueSummaryWidgetProps) {
  const [breakdown, setBreakdown] = useState<SiloBreakdown | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard/revenue-breakdown')
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success) {
          setBreakdown(json.data);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [gymId]);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);

  const pieData = breakdown
    ? [
        { name: 'PT', value: breakdown.pt },
        { name: 'Classes', value: breakdown.classes },
        { name: 'Open Gym', value: breakdown.openGym },
        { name: 'Other', value: breakdown.other },
      ].filter((d) => d.value > 0)
    : [];

  return (
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
                {revenue.weekTrend > 0 ? '\u2191' : '\u2193'} {Math.abs(revenue.weekTrend)}%
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
                {revenue.monthTrend > 0 ? '\u2191' : '\u2193'} {Math.abs(revenue.monthTrend)}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Revenue Source Donut Chart */}
      {pieData.length > 0 && (
        <div className="mb-4 pt-4 border-t border-slate-100">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">Revenue by Source (This Month)</h4>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={SILO_COLORS[entry.name] || '#64748b'} />
                ))}
              </Pie>
              <Tooltip
                formatter={((value: number) => [formatCurrency(value), '']) as any}
                contentStyle={tooltipStyle}
              />
              <Legend
                formatter={(value: string) => (
                  <span className="text-xs text-slate-600">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

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
  );
}
