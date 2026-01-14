'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { chartColors, formatDate } from './chart-config';

interface DailyActivity {
  date: string;
  checkIns: number;
  bookings: number;
}

interface ActivityLineChartProps {
  data: DailyActivity[];
  height?: number;
}

export function ActivityLineChart({ data, height = 300 }: ActivityLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] bg-slate-50 rounded-lg">
        <p className="text-slate-500">No activity data available</p>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            tick={{ fontSize: 11, fill: chartColors.muted }}
            axisLine={{ stroke: chartColors.grid }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: chartColors.muted }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: `1px solid ${chartColors.grid}`,
              borderRadius: 8,
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
            }}
            labelFormatter={(label) => formatDate(label as string)}
          />
          <Legend
            wrapperStyle={{ paddingTop: 10 }}
            iconType="circle"
            iconSize={8}
          />
          <Line
            type="monotone"
            dataKey="checkIns"
            name="Check-ins"
            stroke={chartColors.primary}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: chartColors.primary }}
          />
          <Line
            type="monotone"
            dataKey="bookings"
            name="Bookings"
            stroke={chartColors.secondary}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: chartColors.secondary }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
