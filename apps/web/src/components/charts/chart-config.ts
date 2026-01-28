export const chartColors = {
  primary: '#6366f1',
  secondary: '#22c55e',
  accent: '#f59e0b',
  danger: '#ef4444',
  muted: '#94a3b8',
  background: '#f8fafc',
  grid: '#e2e8f0',
};

// Billing-specific colors
export const billingChartColors = {
  completed: '#10b981',   // emerald - completed/paid
  pending: '#f59e0b',     // amber - pending
  failed: '#ef4444',      // red - failed
  refunded: '#8b5cf6',    // violet - refunded
  draft: '#94a3b8',       // slate - draft
  overdue: '#f97316',     // orange - overdue
  cancelled: '#6b7280',   // gray - cancelled

  // Payment methods
  card: '#6366f1',        // indigo
  cash: '#22c55e',        // green
  bankTransfer: '#06b6d4', // cyan
  other: '#94a3b8',       // slate

  // Categories
  freelancers: '#8b5cf6', // violet
  refunds: '#f59e0b',     // amber
  commissions: '#06b6d4', // cyan

  // Expenses
  rent: '#ef4444',        // red
  utilities: '#f59e0b',   // amber
  equipment: '#6366f1',   // indigo
  maintenance: '#8b5cf6', // violet
  marketing: '#ec4899',   // pink
  payroll: '#06b6d4',     // cyan
  supplies: '#22c55e',    // green
  insurance: '#f97316',   // orange
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

export const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
};

export const formatCurrencyFull = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`;
};
