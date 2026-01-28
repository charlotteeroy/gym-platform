'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { InvoicesChartData } from '../types';
import { billingChartColors, chartTheme, formatCurrency, formatCurrencyFull } from '@/components/charts/chart-config';

interface InvoicesChartProps {
  data: InvoicesChartData;
  height?: number;
}

const STATUS_COLORS: Record<string, string> = {
  PAID: billingChartColors.completed,
  SENT: billingChartColors.pending,
  DRAFT: billingChartColors.draft,
  OVERDUE: billingChartColors.overdue,
  CANCELLED: billingChartColors.cancelled,
};

const STATUS_LABELS: Record<string, string> = {
  PAID: 'Paid',
  SENT: 'Sent',
  DRAFT: 'Draft',
  OVERDUE: 'Overdue',
  CANCELLED: 'Cancelled',
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
          {STATUS_LABELS[entry.name] || entry.name}: {formatCurrencyFull(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function InvoicesChart({ data, height = 300 }: InvoicesChartProps) {
  if (!data || data.timeSeries.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-slate-50 rounded-xl">
        <p className="text-slate-500">No invoice data for selected period</p>
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
          <p className="text-xs text-emerald-600 uppercase tracking-wide">Paid</p>
          <p className="text-2xl font-bold text-emerald-700">{formatCurrency(data.totals.paid)}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4">
          <p className="text-xs text-amber-600 uppercase tracking-wide">Outstanding</p>
          <p className="text-2xl font-bold text-amber-700">{formatCurrency(data.totals.outstanding)}</p>
        </div>
        <div className="bg-orange-50 rounded-xl p-4">
          <p className="text-xs text-orange-600 uppercase tracking-wide">Overdue</p>
          <p className="text-2xl font-bold text-orange-700">{formatCurrency(data.totals.overdue)}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stacked Bar Chart - Invoice Status Over Time */}
        <div className="lg:col-span-2">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Invoice Volume Over Time</h4>
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              data={data.timeSeries}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
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
                <Bar
                  key={status}
                  dataKey={status}
                  name={status}
                  stackId="1"
                  fill={STATUS_COLORS[status]}
                  radius={status === statuses[statuses.length - 1] ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Status Distribution */}
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-3">Status Distribution</h4>
          {data.byStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={height}>
              <PieChart>
                <Pie
                  data={data.byStatus}
                  dataKey="total"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  label={({ status, percent }: { status?: string; percent?: number }) =>
                    `${STATUS_LABELS[status || ''] || status || ''} ${((percent || 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {data.byStatus.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STATUS_COLORS[entry.status] || billingChartColors.draft}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => formatCurrencyFull(Number(value))}
                  labelFormatter={(label) => STATUS_LABELS[String(label)] || String(label)}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-500">No status data</p>
            </div>
          )}
        </div>
      </div>

      {/* Aging Buckets */}
      {data.agingBuckets.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-3">Aging Buckets</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {data.agingBuckets.map((bucket) => (
              <div
                key={bucket.bucket}
                className="flex flex-col p-3 bg-slate-50 rounded-xl"
              >
                <p className="text-xs text-slate-500">{bucket.bucket}</p>
                <p className="font-semibold text-slate-900">{formatCurrency(bucket.amount)}</p>
                <p className="text-xs text-slate-400">{bucket.count} invoices</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
