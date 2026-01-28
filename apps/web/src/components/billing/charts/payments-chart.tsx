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
  Legend,
} from 'recharts';
import { PaymentsChartData } from '../types';
import { billingChartColors, chartTheme, formatCurrency, formatCurrencyFull } from '@/components/charts/chart-config';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PaymentsChartProps {
  data: PaymentsChartData;
  height?: number;
}

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: billingChartColors.completed,
  PENDING: billingChartColors.pending,
  FAILED: billingChartColors.failed,
  REFUNDED: billingChartColors.refunded,
};

const METHOD_COLORS: Record<string, string> = {
  CARD: billingChartColors.card,
  CASH: billingChartColors.cash,
  BANK_TRANSFER: billingChartColors.bankTransfer,
  OTHER: billingChartColors.other,
};

const METHOD_LABELS: Record<string, string> = {
  CARD: 'Card',
  CASH: 'Cash',
  BANK_TRANSFER: 'Bank Transfer',
  OTHER: 'Other',
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

export function PaymentsChart({ data, height = 300 }: PaymentsChartProps) {
  if (!data || data.timeSeries.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-slate-50 rounded-xl">
        <p className="text-slate-500">No payment data for selected period</p>
      </div>
    );
  }

  // Get unique statuses from data
  const statuses = Object.keys(STATUS_COLORS).filter((status) =>
    data.timeSeries.some((d) => (d[status] as number) > 0)
  );

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.totals.total)}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4">
          <p className="text-xs text-emerald-600 uppercase tracking-wide">Completed</p>
          <p className="text-2xl font-bold text-emerald-700">{formatCurrency(data.totals.completed)}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4">
          <p className="text-xs text-amber-600 uppercase tracking-wide">Pending</p>
          <p className="text-2xl font-bold text-amber-700">{formatCurrency(data.totals.pending)}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4">
          <p className="text-xs text-red-600 uppercase tracking-wide">Failed</p>
          <p className="text-2xl font-bold text-red-700">{formatCurrency(data.totals.failed)}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart - Revenue Over Time */}
        <div className="lg:col-span-2">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Payment Volume Over Time</h4>
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart
              data={data.timeSeries}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                {statuses.map((status) => (
                  <linearGradient key={status} id={`gradient-${status}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={STATUS_COLORS[status]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={STATUS_COLORS[status]} stopOpacity={0} />
                  </linearGradient>
                ))}
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
              {statuses.map((status) => (
                <Area
                  key={status}
                  type="monotone"
                  dataKey={status}
                  name={status.charAt(0) + status.slice(1).toLowerCase()}
                  stackId="1"
                  stroke={STATUS_COLORS[status]}
                  fill={`url(#gradient-${status})`}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - By Payment Method */}
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-3">By Payment Method</h4>
          {data.byMethod.length > 0 ? (
            <ResponsiveContainer width="100%" height={height}>
              <PieChart>
                <Pie
                  data={data.byMethod}
                  dataKey="amount"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  label={({ method, percent }: { method?: string; percent?: number }) =>
                    `${METHOD_LABELS[method || ''] || method || ''} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {data.byMethod.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={METHOD_COLORS[entry.method] || billingChartColors.other}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrencyFull(Number(value))}
                  labelFormatter={(label) => METHOD_LABELS[String(label)] || String(label)}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-500">No method data</p>
            </div>
          )}
        </div>
      </div>

      {/* Status Breakdown Table */}
      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-3">Status Breakdown</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.byStatus.map((item) => (
            <div
              key={item.status}
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[item.status] || billingChartColors.other }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500">
                  {item.status.charAt(0) + item.status.slice(1).toLowerCase()}
                </p>
                <p className="font-semibold text-slate-900">{formatCurrency(item.amount)}</p>
                <p className="text-xs text-slate-400">{item.count} payments</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
