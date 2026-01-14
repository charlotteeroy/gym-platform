'use client';

import { chartColors, formatHour } from './chart-config';

interface HourData {
  hour: number;
  count: number;
}

interface HourHeatmapProps {
  data: HourData[];
}

export function HourHeatmap({ data }: HourHeatmapProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[120px] bg-slate-50 rounded-lg">
        <p className="text-slate-500">No hourly data available</p>
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count));

  const getIntensity = (count: number): string => {
    if (count === 0) return 'bg-slate-100';
    if (maxCount === 0) return 'bg-slate-100';

    const ratio = count / maxCount;
    if (ratio < 0.25) return 'bg-indigo-100';
    if (ratio < 0.5) return 'bg-indigo-200';
    if (ratio < 0.75) return 'bg-indigo-400';
    return 'bg-indigo-600';
  };

  const getTextColor = (count: number): string => {
    if (count === 0) return 'text-slate-400';
    if (maxCount === 0) return 'text-slate-400';

    const ratio = count / maxCount;
    if (ratio < 0.5) return 'text-slate-700';
    return 'text-white';
  };

  // Group hours into morning, afternoon, evening, night
  const periods = [
    { name: 'Night', hours: data.filter((d) => d.hour >= 0 && d.hour < 6) },
    { name: 'Morning', hours: data.filter((d) => d.hour >= 6 && d.hour < 12) },
    { name: 'Afternoon', hours: data.filter((d) => d.hour >= 12 && d.hour < 18) },
    { name: 'Evening', hours: data.filter((d) => d.hour >= 18 && d.hour < 24) },
  ];

  return (
    <div className="space-y-4">
      {periods.map((period) => (
        <div key={period.name}>
          <p className="text-xs font-medium text-slate-500 mb-2">{period.name}</p>
          <div className="grid grid-cols-6 gap-1">
            {period.hours.map((hourData) => (
              <div
                key={hourData.hour}
                className={`
                  relative rounded p-2 text-center transition-colors
                  ${getIntensity(hourData.count)}
                  ${getTextColor(hourData.count)}
                `}
                title={`${formatHour(hourData.hour)}: ${hourData.count} visits`}
              >
                <div className="text-xs font-medium">{formatHour(hourData.hour)}</div>
                <div className="text-lg font-bold">{hourData.count}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Legend */}
      <div className="flex items-center gap-2 pt-2">
        <span className="text-xs text-slate-500">Less</span>
        <div className="flex gap-0.5">
          <div className="w-4 h-4 rounded bg-slate-100" />
          <div className="w-4 h-4 rounded bg-indigo-100" />
          <div className="w-4 h-4 rounded bg-indigo-200" />
          <div className="w-4 h-4 rounded bg-indigo-400" />
          <div className="w-4 h-4 rounded bg-indigo-600" />
        </div>
        <span className="text-xs text-slate-500">More</span>
      </div>
    </div>
  );
}
