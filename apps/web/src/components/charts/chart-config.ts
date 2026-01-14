export const chartColors = {
  primary: '#6366f1',
  secondary: '#22c55e',
  accent: '#f59e0b',
  danger: '#ef4444',
  muted: '#94a3b8',
  background: '#f8fafc',
  grid: '#e2e8f0',
};

export const chartTheme = {
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 12,
  axis: {
    stroke: chartColors.grid,
    strokeWidth: 1,
  },
  tooltip: {
    backgroundColor: 'white',
    borderColor: chartColors.grid,
    borderRadius: 8,
    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  },
};

export const formatHour = (hour: number): string => {
  if (hour === 0) return '12am';
  if (hour === 12) return '12pm';
  if (hour < 12) return `${hour}am`;
  return `${hour - 12}pm`;
};

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
