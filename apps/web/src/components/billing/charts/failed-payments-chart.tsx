'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { FailedPaymentsChartData } from '../types';
import { billingChartColors, chartTheme, formatCurrency, formatCurrencyFull, formatPercent } from '@/components/charts/chart-config';
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface FailedPaymentsChartProps {
  data: FailedPaymentsChartData;
  height?: number;
}

const STAGE_COLORS: Record<string, string> = {
  'Failed': billingChartColors.failed,
  'Retrying': billingChartColors.pending,
  'Recovered': billingChartColors.completed,
  'Written Off': billingChartColors.cancelled,
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
          {entry.name}: {typeof entry.value === 'number' && entry.name.includes('Amount')
            ? formatCurrencyFull(entry.value)
            : entry.value}
        </p>
      ))}
    </div>
  );
}

export function FailedPaymentsChart({ data, height = 300 }: FailedPaymentsChartProps) {
  if (!data || data.timeSeries.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-slate-50 rounded-xl">
        <p className="text-slate-500">No failed payment data for selected period</p>
      </div>
    );
  }

  const recoveryRate = data.totals.recoveryRate;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total Failed</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.totals.total)}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4">
          <p className="text-xs text-emerald-600 uppercase tracking-wide">Recovered</p>
          <p className="text-2xl font-bold text-emerald-700">{formatCurrency(data.totals.recovered)}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4">
          <p className="text-xs text-amber-600 uppercase tracking-wide">Pending</p>
          <p className="text-2xl font-bold text-amber-700">{formatCurrency(data.totals.pending)}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4">
          <p className="text-xs text-red-600 uppercase tracking-wide">Written Off</p>
          <p className="text-2xl font-bold text-red-700">{formatCurrency(data.totals.writtenOff)}</p>
        </div>
        <div className={`rounded-xl p-4 ${recoveryRate >= 50 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs uppercase tracking-wide ${recoveryRate >= 50 ? 'text-emerald-600' : 'text-amber-600'}`}>
                Recovery Rate
              </p>
              <p className={`text-2xl font-bold ${recoveryRate >= 50 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {formatPercent(recoveryRate)}
              </p>
            </div>
            {recoveryRate >= 50
              ? <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              : <AlertTriangle className="w-6 h-6 text-amber-600" />
            }
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart - Failed Payments Over Time */}
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-3">Failed Payments Trend</h4>
          <ResponsiveContainer width="100%" height={height}>
            <LineChart
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
              <Line
                type="monotone"
                dataKey="value"
                name="Amount"
                stroke={billingChartColors.failed}
                strokeWidth={2}
                dot={{ fill: billingChartColors.failed, strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: billingChartColors.failed }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Bar Chart - By Failure Reason */}
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-3">By Failure Reason</h4>
          {data.byReason.length > 0 ? (
            <ResponsiveContainer width="100%" height={height}>
              <BarChart
                data={data.byReason.slice(0, 5)}
                layout="vertical"
                margin={{ top: 10, right: 10, left: 80, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.axis.stroke} horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={{ stroke: chartTheme.axis.stroke }}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <YAxis
                  type="category"
                  dataKey="reason"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  width={75}
                />
                <Tooltip
                  formatter={(value) => formatCurrencyFull(Number(value))}
                />
                <Bar
                  dataKey="amount"
                  name="Amount"
                  fill={billingChartColors.failed}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] bg-slate-50 rounded-xl">
              <p className="text-sm text-slate-500">No reason data</p>
            </div>
          )}
        </div>
      </div>

      {/* Recovery Funnel */}
      {data.recoveryFunnel.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-3">Recovery Funnel</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {data.recoveryFunnel.map((stage, index) => (
              <div
                key={stage.stage}
                className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl relative"
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: STAGE_COLORS[stage.stage] || billingChartColors.other }}
                />
                <div className="flex-1">
                  <p className="text-xs text-slate-500">{stage.stage}</p>
                  <p className="text-xl font-semibold text-slate-900">{formatCurrency(stage.amount)}</p>
                  <p className="text-xs text-slate-400">{stage.count} payments</p>
                </div>
                {index < data.recoveryFunnel.length - 1 && (
                  <div className="hidden md:block absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 text-slate-300">
                    →
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
