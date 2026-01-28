'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { PayoutsChartData } from '../types';
import { billingChartColors, chartTheme, formatCurrency, formatCurrencyFull } from '@/components/charts/chart-config';

interface PayoutsChartProps {
  data: PayoutsChartData;
  height?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  freelancers: billingChartColors.freelancers,
  refunds: billingChartColors.refunds,
  commissions: billingChartColors.commissions,
};

const CATEGORY_LABELS: Record<string, string> = {
  freelancers: 'Freelancers',
  refunds: 'Refunds',
  commissions: 'Commissions',
};

const TYPE_COLORS: Record<string, string> = {
  gym: billingChartColors.card,
  instructor: billingChartColors.completed,
};

const TYPE_LABELS: Record<string, string> = {
  gym: 'Gym',
  instructor: 'Instructor',
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className="bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-lg"
      style={chartTheme.tooltip}
    >
      <p className="text-sm font-medium text-slate-900 mb-1">{label}</p>
      {payload.map((entry, index) => (
        <p key={index} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {formatCurrencyFull(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function PayoutsChart({ data, height = 300 }: PayoutsChartProps) {
  if (!data || data.timeSeries.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-slate-50 rounded-xl">
        <p className="text-slate-500">No payout data for selected period</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total Payouts</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.totals.total)}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4">
          <p className="text-xs text-emerald-600 uppercase tracking-wide">Paid</p>
          <p className="text-2xl font-bold text-emerald-700">{formatCurrency(data.totals.paid)}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4">
          <p className="text-xs text-amber-600 uppercase tracking-wide">Pending</p>
          <p className="text-2xl font-bold text-amber-700">{formatCurrency(data.totals.pending)}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart - Payouts Over Time */}
        <div className="lg:col-span-2">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Payout Volume Over Time</h4>
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart
              data={data.timeSeries}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradient-payouts" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={billingChartColors.completed} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={billingChartColors.completed} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.axis.stroke} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={{ stroke: chartTheme.axis.stroke }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="value"
                name="Payouts"
                stroke={billingChartColors.completed}
                fill="url(#gradient-payouts)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - By Category */}
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-3">By Category</h4>
          {data.byCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={height}>
              <PieChart>
                <Pie
                  data={data.byCategory}
                  dataKey="amount"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  label={({ category, percent }: { category?: string; percent?: number }) =>
                    `${CATEGORY_LABELS[category || ''] || category || ''} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {data.byCategory.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CATEGORY_COLORS[entry.category] || billingChartColors.other}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrencyFull(Number(value))}
                  labelFormatter={(label) => CATEGORY_LABELS[String(label)] || String(label)}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-500">No category data</p>
            </div>
          )}
        </div>
      </div>

      {/* By Recipient Type */}
      {data.byRecipientType.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-3">By Recipient Type</h4>
          <div className="grid grid-cols-2 gap-4">
            {data.byRecipientType.map((item) => (
              <div
                key={item.type}
                className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl"
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: TYPE_COLORS[item.type] || billingChartColors.other }}
                />
                <div className="flex-1">
                  <p className="text-xs text-slate-500">
                    {TYPE_LABELS[item.type] || item.type}
                  </p>
                  <p className="text-xl font-semibold text-slate-900">{formatCurrency(item.amount)}</p>
                  <p className="text-xs text-slate-400">{item.count} payouts</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
