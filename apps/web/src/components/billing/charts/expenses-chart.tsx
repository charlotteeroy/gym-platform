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
} from 'recharts';
import { ExpensesChartData } from '../types';
import { billingChartColors, chartTheme, formatCurrency, formatCurrencyFull } from '@/components/charts/chart-config';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ExpensesChartProps {
  data: ExpensesChartData;
  height?: number;
  categoryColors?: Record<string, string>;
}

const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  RENT: billingChartColors.rent,
  UTILITIES: billingChartColors.utilities,
  EQUIPMENT: billingChartColors.equipment,
  MAINTENANCE: billingChartColors.maintenance,
  MARKETING: billingChartColors.marketing,
  PAYROLL: billingChartColors.payroll,
  SUPPLIES: billingChartColors.supplies,
  INSURANCE: billingChartColors.insurance,
  OTHER: billingChartColors.other,
};

const CATEGORY_LABELS: Record<string, string> = {
  RENT: 'Rent',
  UTILITIES: 'Utilities',
  EQUIPMENT: 'Equipment',
  MAINTENANCE: 'Maintenance',
  MARKETING: 'Marketing',
  PAYROLL: 'Payroll',
  SUPPLIES: 'Supplies',
  INSURANCE: 'Insurance',
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
          {CATEGORY_LABELS[entry.name] || entry.name}: {formatCurrencyFull(entry.value)}
        </p>
      ))}
    </div>
  );
}

export function ExpensesChart({ data, height = 300, categoryColors = DEFAULT_CATEGORY_COLORS }: ExpensesChartProps) {
  if (!data || data.timeSeries.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-slate-50 rounded-xl">
        <p className="text-slate-500">No expense data for selected period</p>
      </div>
    );
  }

  // Calculate month-over-month trend
  const trend = data.totals.lastMonth > 0
    ? ((data.totals.thisMonth - data.totals.lastMonth) / data.totals.lastMonth) * 100
    : 0;
  const trendDirection = trend > 1 ? 'up' : trend < -1 ? 'down' : 'flat';

  // Get unique categories from data
  const categories = Object.keys(categoryColors).filter((cat) =>
    data.timeSeries.some((d) => (d[cat] as number) > 0)
  );

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Total Expenses</p>
          <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.totals.total)}</p>
        </div>
        <div className="bg-violet-50 rounded-xl p-4">
          <p className="text-xs text-violet-600 uppercase tracking-wide">This Month</p>
          <p className="text-2xl font-bold text-violet-700">{formatCurrency(data.totals.thisMonth)}</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">vs Last Month</p>
              <p className="text-2xl font-bold text-slate-900">
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
              </p>
            </div>
            <div className={`p-2 rounded-lg ${
              trendDirection === 'up' ? 'bg-red-100' : trendDirection === 'down' ? 'bg-emerald-100' : 'bg-slate-100'
            }`}>
              {trendDirection === 'up' && <TrendingUp className="w-5 h-5 text-red-600" />}
              {trendDirection === 'down' && <TrendingDown className="w-5 h-5 text-emerald-600" />}
              {trendDirection === 'flat' && <Minus className="w-5 h-5 text-slate-600" />}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Area Chart - Expenses Over Time */}
        <div className="lg:col-span-2">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Expense Trends</h4>
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart
              data={data.timeSeries}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                {categories.map((cat) => (
                  <linearGradient key={cat} id={`gradient-expense-${cat}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={categoryColors[cat]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={categoryColors[cat]} stopOpacity={0} />
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
              {categories.map((cat) => (
                <Area
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  name={cat}
                  stackId="1"
                  stroke={categoryColors[cat]}
                  fill={`url(#gradient-expense-${cat})`}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart - Category Breakdown */}
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
                      fill={categoryColors[entry.category] || categoryColors.OTHER}
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

      {/* Category Breakdown */}
      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-3">Category Breakdown</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.byCategory.map((item) => (
            <div
              key={item.category}
              className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: categoryColors[item.category] || categoryColors.OTHER }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500">
                  {CATEGORY_LABELS[item.category] || item.category}
                </p>
                <p className="font-semibold text-slate-900">{formatCurrency(item.amount)}</p>
                <p className="text-xs text-slate-400">{item.count} expenses</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
