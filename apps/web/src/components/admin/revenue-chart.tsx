'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { BarChart3, TrendingUp } from 'lucide-react';

interface HistoricalData {
  months: string[];
  actualRevenue: number[];
}

interface RevenueChartProps {
  history: HistoricalData;
  forecasts: {
    period: string;
    projectedRevenue: number;
    confidenceLow: number;
    confidenceHigh: number;
  }[];
  isLoading?: boolean;
}

type TimeRange = '6M' | '12M' | 'YTD';

export function RevenueChart({ history, forecasts, isLoading }: RevenueChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('6M');

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}k`;
    }
    return `$${value}`;
  };

  const formatFullCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Build chart data combining historical and forecast
  const buildChartData = () => {
    const data: {
      month: string;
      actual?: number;
      projected?: number;
      confidenceLow?: number;
      confidenceHigh?: number;
      isForecast: boolean;
    }[] = [];

    // Add historical data
    history.months.forEach((month, index) => {
      data.push({
        month,
        actual: history.actualRevenue[index],
        isForecast: false,
      });
    });

    // Get current month name for reference
    const lastActualMonth = history.months[history.months.length - 1];
    const lastActualValue = history.actualRevenue[history.actualRevenue.length - 1];

    // Add forecast data
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonthIndex = monthNames.indexOf(lastActualMonth);

    forecasts.forEach((forecast, index) => {
      const forecastMonthIndex = (currentMonthIndex + index + 1) % 12;
      const monthName = monthNames[forecastMonthIndex];

      data.push({
        month: monthName,
        projected: forecast.projectedRevenue,
        confidenceLow: forecast.confidenceLow,
        confidenceHigh: forecast.confidenceHigh,
        isForecast: true,
      });
    });

    // Connect last actual to first forecast
    if (data.length > history.months.length && lastActualValue) {
      const firstForecastIndex = history.months.length;
      if (data[firstForecastIndex]) {
        data[firstForecastIndex - 1] = {
          ...data[firstForecastIndex - 1],
          projected: lastActualValue,
        };
      }
    }

    return data;
  };

  const chartData = buildChartData();

  // Filter data based on time range
  const getFilteredData = () => {
    switch (timeRange) {
      case '6M':
        return chartData.slice(-9); // Last 6 months + 3 months forecast
      case '12M':
        return chartData;
      case 'YTD':
        // For simplicity, return all data
        return chartData;
      default:
        return chartData;
    }
  };

  const filteredData = getFilteredData();

  // Custom tooltip
  interface ChartDataPayload {
    isForecast: boolean;
    confidenceLow?: number;
    confidenceHigh?: number;
    actual?: number;
    projected?: number;
    month: string;
  }

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string; payload: ChartDataPayload }>;
    label?: string;
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    const isForecasted = data.isForecast;

    return (
      <div className="bg-white rounded-lg shadow-lg border border-slate-200 p-3 min-w-[160px]">
        <p className="text-sm font-medium text-slate-700 mb-2">{label}</p>
        {payload.map((entry) => {
          if (entry.dataKey === 'actual' && entry.value) {
            return (
              <div key="actual" className="flex items-center justify-between gap-4">
                <span className="text-xs text-slate-500">Revenue</span>
                <span className="text-sm font-semibold text-indigo-600">
                  {formatFullCurrency(entry.value)}
                </span>
              </div>
            );
          }
          if (entry.dataKey === 'projected' && entry.value && isForecasted) {
            return (
              <div key="projected" className="flex items-center justify-between gap-4">
                <span className="text-xs text-slate-500">Projected</span>
                <span className="text-sm font-semibold text-emerald-600">
                  {formatFullCurrency(entry.value)}
                </span>
              </div>
            );
          }
          return null;
        })}
        {isForecasted && data.confidenceLow && data.confidenceHigh && (
          <div className="mt-1 pt-1 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              Range: {formatFullCurrency(data.confidenceLow)} - {formatFullCurrency(data.confidenceHigh)}
            </p>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-slate-200 rounded w-1/3 animate-pulse" />
          <div className="h-8 bg-slate-200 rounded w-24 animate-pulse" />
        </div>
        <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-500" />
          <div>
            <h3 className="font-semibold text-slate-900">Revenue Trend & Forecast</h3>
            <p className="text-xs text-slate-500">Historical data with 90-day projection</p>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center bg-slate-100 rounded-lg p-1">
          {(['6M', '12M', 'YTD'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                timeRange === range
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="p-5">
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorConfidence" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748b' }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickFormatter={formatCurrency}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Confidence Band (Background) */}
            <Area
              type="monotone"
              dataKey="confidenceHigh"
              stroke="none"
              fill="url(#colorConfidence)"
              fillOpacity={1}
            />
            <Area
              type="monotone"
              dataKey="confidenceLow"
              stroke="none"
              fill="#fff"
              fillOpacity={1}
            />

            {/* Actual Revenue */}
            <Area
              type="monotone"
              dataKey="actual"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#colorActual)"
              fillOpacity={1}
              dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
            />

            {/* Projected Revenue */}
            <Area
              type="monotone"
              dataKey="projected"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="url(#colorProjected)"
              fillOpacity={1}
              dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
              activeDot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
            />

            {/* Reference line for "Now" */}
            {history.months.length > 0 && (
              <ReferenceLine
                x={history.months[history.months.length - 1]}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                label={{
                  value: 'Now',
                  position: 'top',
                  fill: '#64748b',
                  fontSize: 11,
                }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-indigo-500" />
            <span className="text-xs text-slate-600">Actual Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-600">Projected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-3 rounded bg-emerald-500/10 border border-emerald-500/20" />
            <span className="text-xs text-slate-600">Confidence Band</span>
          </div>
        </div>
      </div>
    </div>
  );
}
