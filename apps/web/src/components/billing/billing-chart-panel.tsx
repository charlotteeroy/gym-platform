'use client';

import { BillingChartPanelProps } from './types';
import { ChartControls } from './chart-controls';
import { X, Loader2 } from 'lucide-react';

export function BillingChartPanel({
  title,
  description,
  isVisible,
  onToggle,
  filterState,
  onFilterChange,
  children,
  isLoading = false,
}: BillingChartPanelProps) {
  if (!isVisible) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-semibold text-slate-900">{title}</h3>
            {description && (
              <p className="text-sm text-slate-500 mt-0.5">{description}</p>
            )}
          </div>
          <button
            onClick={onToggle}
            className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Controls */}
        <div className="mt-3">
          <ChartControls
            filterState={filterState}
            onFilterChange={onFilterChange}
          />
        </div>
      </div>

      {/* Chart Content */}
      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
