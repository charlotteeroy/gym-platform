'use client';

import { TrendingUp, TrendingDown, Minus, Target, AlertCircle } from 'lucide-react';

interface RevenueForecast {
  period: '30day' | '60day' | '90day';
  projectedRevenue: number;
  confidenceLow: number;
  confidenceHigh: number;
  expectedChurn: number;
  expectedChurnRevenue: number;
  scheduledCancellations: number;
  renewals: number;
  growthRate: number;
}

interface ForecastCardsProps {
  currentMRR: number;
  normalizedMRR: number;
  forecasts: RevenueForecast[];
  isLoading?: boolean;
}

export function ForecastCards({ currentMRR, normalizedMRR, forecasts, isLoading }: ForecastCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getPeriodLabel = (period: string) => {
    switch (period) {
      case '30day': return '30-Day';
      case '60day': return '60-Day';
      case '90day': return '90-Day';
      default: return period;
    }
  };

  const getTrendIcon = (growthRate: number) => {
    if (growthRate > 0.5) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (growthRate < -0.5) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const getTrendColor = (growthRate: number) => {
    if (growthRate > 0.5) return 'text-emerald-600';
    if (growthRate < -0.5) return 'text-red-600';
    return 'text-slate-500';
  };

  // Calculate overall confidence based on variance
  const getConfidenceLevel = (forecast: RevenueForecast) => {
    const variance = (forecast.confidenceHigh - forecast.confidenceLow) / forecast.projectedRevenue;
    if (variance < 0.1) return { level: 'High', color: 'text-emerald-600 bg-emerald-100' };
    if (variance < 0.2) return { level: 'Medium', color: 'text-amber-600 bg-amber-100' };
    return { level: 'Low', color: 'text-red-600 bg-red-100' };
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-500" />
          Revenue Forecast
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 animate-pulse">
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-4" />
              <div className="h-8 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-500" />
          Revenue Forecast
        </h3>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <AlertCircle className="w-4 h-4" />
          <span>Based on current trends and scheduled changes</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Current MRR Card */}
        <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-5 shadow-sm text-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-indigo-100">Current MRR</span>
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
          </div>
          <p className="text-2xl font-bold">{formatCurrency(currentMRR)}</p>
          {normalizedMRR !== currentMRR && (
            <p className="text-sm text-indigo-100 mt-1">
              Normalized: {formatCurrency(normalizedMRR)}
            </p>
          )}
          <p className="text-xs text-indigo-200 mt-2">Monthly Recurring Revenue</p>
        </div>

        {/* Forecast Cards */}
        {forecasts.map((forecast) => {
          const confidence = getConfidenceLevel(forecast);
          return (
            <div
              key={forecast.period}
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 hover:border-indigo-200 transition-colors"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-500">
                  {getPeriodLabel(forecast.period)} Forecast
                </span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${confidence.color}`}>
                  {confidence.level}
                </span>
              </div>

              <div className="flex items-baseline gap-2 mb-1">
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(forecast.projectedRevenue)}
                </p>
                <div className="flex items-center gap-1">
                  {getTrendIcon(forecast.growthRate)}
                  <span className={`text-xs font-medium ${getTrendColor(forecast.growthRate)}`}>
                    {formatPercent(forecast.growthRate)}
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-500 mb-3">
                Range: {formatCurrency(forecast.confidenceLow)} - {formatCurrency(forecast.confidenceHigh)}
              </p>

              <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-slate-400">Renewals</p>
                  <p className="text-sm font-medium text-slate-700">{forecast.renewals}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Est. Churn</p>
                  <p className="text-sm font-medium text-red-600">-{forecast.expectedChurn}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
