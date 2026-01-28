'use client';

import { ChartFilterState, DateRangePreset, TimeGrouping, ChartControlsProps } from './types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from 'lucide-react';

const DATE_PRESETS: { value: DateRangePreset; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: 'ytd', label: 'YTD' },
  { value: 'custom', label: 'Custom' },
];

const GROUPING_OPTIONS: { value: TimeGrouping; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export function ChartControls({
  filterState,
  onFilterChange,
  showGrouping = true,
}: ChartControlsProps) {
  const handleDateRangeChange = (preset: DateRangePreset) => {
    onFilterChange({
      ...filterState,
      dateRange: preset,
    });
  };

  const handleGroupingChange = (grouping: TimeGrouping) => {
    onFilterChange({
      ...filterState,
      grouping,
    });
  };

  const handleCustomDateChange = (field: 'customStartDate' | 'customEndDate', value: string) => {
    onFilterChange({
      ...filterState,
      dateRange: 'custom',
      [field]: value,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Date Range Presets */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.value}
            onClick={() => handleDateRangeChange(preset.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterState.dateRange === preset.value
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom Date Range */}
      {filterState.dateRange === 'custom' && (
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <Input
            type="date"
            value={filterState.customStartDate || ''}
            onChange={(e) => handleCustomDateChange('customStartDate', e.target.value)}
            className="w-32 h-8 text-xs rounded-lg"
          />
          <span className="text-slate-400">to</span>
          <Input
            type="date"
            value={filterState.customEndDate || ''}
            onChange={(e) => handleCustomDateChange('customEndDate', e.target.value)}
            className="w-32 h-8 text-xs rounded-lg"
          />
        </div>
      )}

      {/* Grouping Options */}
      {showGrouping && (
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1 ml-auto">
          {GROUPING_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleGroupingChange(option.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterState.grouping === option.value
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
