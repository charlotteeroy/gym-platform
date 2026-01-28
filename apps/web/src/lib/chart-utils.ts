import { TimeGrouping, DateRangePreset, TimeSeriesDataPoint } from '@/components/billing/types';

/**
 * Get date range from preset
 */
export function getDateRangeFromPreset(
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string
): { startDate: Date; endDate: Date } {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setHours(23, 59, 59, 999);

  let startDate: Date;

  switch (preset) {
    case '7d':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 90);
      break;
    case 'ytd':
      startDate = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom':
      startDate = customStart ? new Date(customStart) : new Date(now.setDate(now.getDate() - 30));
      if (customEnd) {
        return { startDate, endDate: new Date(customEnd) };
      }
      break;
    default:
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 30);
  }

  startDate.setHours(0, 0, 0, 0);
  return { startDate, endDate };
}

/**
 * Filter data by date range
 */
export function filterByDateRange<T>(
  data: T[],
  dateField: keyof T,
  startDate: Date,
  endDate: Date
): T[] {
  return data.filter((item) => {
    const itemDate = new Date(item[dateField] as string);
    return itemDate >= startDate && itemDate <= endDate;
  });
}

/**
 * Get period label based on grouping
 */
function getPeriodKey(date: Date, grouping: TimeGrouping): string {
  switch (grouping) {
    case 'daily':
      return date.toISOString().split('T')[0];
    case 'weekly': {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return weekStart.toISOString().split('T')[0];
    }
    case 'monthly':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    default:
      return date.toISOString().split('T')[0];
  }
}

/**
 * Format period label for display
 */
function formatPeriodLabel(periodKey: string, grouping: TimeGrouping): string {
  const date = new Date(periodKey);
  switch (grouping) {
    case 'daily':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'weekly':
      return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    case 'monthly':
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    default:
      return periodKey;
  }
}

/**
 * Aggregate data by time period
 */
export function aggregateByTimePeriod<T>(
  data: T[],
  dateField: keyof T,
  valueField: keyof T,
  grouping: TimeGrouping,
  startDate: Date,
  endDate: Date
): TimeSeriesDataPoint[] {
  // Create buckets for all periods in range
  const buckets = new Map<string, number>();
  const current = new Date(startDate);

  while (current <= endDate) {
    const key = getPeriodKey(current, grouping);
    buckets.set(key, 0);

    // Advance to next period
    switch (grouping) {
      case 'daily':
        current.setDate(current.getDate() + 1);
        break;
      case 'weekly':
        current.setDate(current.getDate() + 7);
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }

  // Aggregate data into buckets
  data.forEach((item) => {
    const itemDate = new Date(item[dateField] as string);
    const key = getPeriodKey(itemDate, grouping);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) || 0) + Number(item[valueField]));
    }
  });

  // Convert to time series
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({
      date,
      label: formatPeriodLabel(date, grouping),
      value,
    }));
}

/**
 * Aggregate with multiple value fields (e.g., by status)
 */
export function aggregateByTimePeriodMulti<T>(
  data: T[],
  dateField: keyof T,
  valueField: keyof T,
  groupField: keyof T,
  grouping: TimeGrouping,
  startDate: Date,
  endDate: Date
): TimeSeriesDataPoint[] {
  // Create buckets for all periods
  const buckets = new Map<string, Record<string, number>>();
  const allGroups = new Set<string>();
  const current = new Date(startDate);

  while (current <= endDate) {
    const key = getPeriodKey(current, grouping);
    buckets.set(key, {});

    switch (grouping) {
      case 'daily':
        current.setDate(current.getDate() + 1);
        break;
      case 'weekly':
        current.setDate(current.getDate() + 7);
        break;
      case 'monthly':
        current.setMonth(current.getMonth() + 1);
        break;
    }
  }

  // Aggregate data
  data.forEach((item) => {
    const itemDate = new Date(item[dateField] as string);
    const key = getPeriodKey(itemDate, grouping);
    const group = String(item[groupField]);
    allGroups.add(group);

    if (buckets.has(key)) {
      const bucket = buckets.get(key)!;
      bucket[group] = (bucket[group] || 0) + Number(item[valueField]);
    }
  });

  // Convert to time series with all groups
  return Array.from(buckets.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, values]) => {
      const point: TimeSeriesDataPoint = {
        date,
        label: formatPeriodLabel(date, grouping),
      };
      // Ensure all groups are present
      allGroups.forEach((group) => {
        point[group] = values[group] || 0;
      });
      return point;
    });
}

/**
 * Group by field and sum values
 */
export function groupByField<T>(
  data: T[],
  groupField: keyof T,
  valueField: keyof T
): { key: string; value: number; count: number }[] {
  const groups = new Map<string, { value: number; count: number }>();

  data.forEach((item) => {
    const key = String(item[groupField] || 'Unknown');
    const current = groups.get(key) || { value: 0, count: 0 };
    groups.set(key, {
      value: current.value + Number(item[valueField]),
      count: current.count + 1,
    });
  });

  return Array.from(groups.entries())
    .map(([key, { value, count }]) => ({ key, value, count }))
    .sort((a, b) => b.value - a.value);
}

/**
 * Calculate trend (percentage change)
 */
export function calculateTrend(
  current: number,
  previous: number
): { percentage: number; direction: 'up' | 'down' | 'flat' } {
  if (previous === 0) {
    return { percentage: current > 0 ? 100 : 0, direction: current > 0 ? 'up' : 'flat' };
  }
  const percentage = ((current - previous) / previous) * 100;
  return {
    percentage: Math.abs(percentage),
    direction: percentage > 1 ? 'up' : percentage < -1 ? 'down' : 'flat',
  };
}
