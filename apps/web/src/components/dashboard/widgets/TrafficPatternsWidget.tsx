'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface TrafficPatternsWidgetProps {
  topHours: {
    hour: number;
    label: string;
    count: number;
    percentage: number;
  }[];
  topDays: {
    day: string;
    count: number;
    percentage: number;
  }[];
  totalVisits: number;
}

const tooltipStyle = {
  borderRadius: '0.75rem',
  border: 'none',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
};

const AMBER_SHADES = ['#f59e0b', '#fbbf24', '#fcd34d'];
const BLUE_SHADES = ['#3b82f6', '#60a5fa', '#93c5fd'];

export default function TrafficPatternsWidget({ topHours, topDays, totalVisits }: TrafficPatternsWidgetProps) {
  if (totalVisits === 0) return null;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Peak Hours */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Peak Hours
          </h3>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={topHours} layout="vertical" margin={{ top: 0, right: 5, bottom: 0, left: 5 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 13, fontWeight: 600, fill: '#1e293b' }}
                axisLine={false}
                tickLine={false}
                width={50}
              />
              <Tooltip
                formatter={((value: number) => [`${value}%`, 'Traffic']) as any}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="percentage" radius={[0, 6, 6, 0]} barSize={24}>
                {topHours.map((_entry, index) => (
                  <Cell key={index} fill={AMBER_SHADES[index] || AMBER_SHADES[2]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-400 mt-3">Based on {totalVisits} check-ins (30 days)</p>
        </div>
      </div>

      {/* Peak Days */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Busiest Days
          </h3>
        </div>
        <div className="p-5">
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={topDays} layout="vertical" margin={{ top: 0, right: 5, bottom: 0, left: 5 }}>
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="day"
                tick={{ fontSize: 13, fontWeight: 600, fill: '#1e293b' }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip
                formatter={((value: number) => [`${value}%`, 'Traffic']) as any}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="percentage" radius={[0, 6, 6, 0]} barSize={24}>
                {topDays.map((_entry, index) => (
                  <Cell key={index} fill={BLUE_SHADES[index] || BLUE_SHADES[2]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-slate-400 mt-3">{topDays[0]?.day || 'Monday'} sees the most traffic</p>
        </div>
      </div>
    </div>
  );
}
