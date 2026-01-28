// Billing chart types and interfaces

export type TimeGrouping = 'daily' | 'weekly' | 'monthly';
export type DateRangePreset = '7d' | '30d' | '90d' | 'ytd' | 'custom';

export interface ChartFilterState {
  dateRange: DateRangePreset;
  customStartDate?: string;
  customEndDate?: string;
  grouping: TimeGrouping;
}

export interface BillingChartPanelProps {
  title: string;
  description?: string;
  isVisible: boolean;
  onToggle: () => void;
  filterState: ChartFilterState;
  onFilterChange: (state: ChartFilterState) => void;
  children: React.ReactNode;
  isLoading?: boolean;
}

export interface ChartControlsProps {
  filterState: ChartFilterState;
  onFilterChange: (state: ChartFilterState) => void;
  showGrouping?: boolean;
}

// Generic time series data point
export interface TimeSeriesDataPoint {
  date: string;
  label: string;
  [key: string]: string | number;
}

// Payments chart data
export interface PaymentsChartData {
  timeSeries: TimeSeriesDataPoint[];
  byStatus: { status: string; amount: number; count: number }[];
  byMethod: { method: string; amount: number; count: number }[];
  totals: {
    total: number;
    completed: number;
    pending: number;
    failed: number;
  };
}

// Invoices chart data
export interface InvoicesChartData {
  timeSeries: TimeSeriesDataPoint[];
  byStatus: { status: string; total: number; count: number }[];
  agingBuckets: { bucket: string; amount: number; count: number }[];
  totals: {
    total: number;
    paid: number;
    outstanding: number;
    overdue: number;
  };
}

// Payouts chart data
export interface PayoutsChartData {
  timeSeries: TimeSeriesDataPoint[];
  byCategory: { category: string; amount: number; count: number }[];
  byRecipientType: { type: string; amount: number; count: number }[];
  totals: {
    total: number;
    paid: number;
    pending: number;
  };
}

// Expenses chart data
export interface ExpensesChartData {
  timeSeries: TimeSeriesDataPoint[];
  byCategory: { category: string; amount: number; count: number }[];
  byVendor: { vendor: string; amount: number }[];
  totals: {
    total: number;
    thisMonth: number;
    lastMonth: number;
  };
}

// Failed payments chart data
export interface FailedPaymentsChartData {
  timeSeries: TimeSeriesDataPoint[];
  byReason: { reason: string; count: number; amount: number }[];
  recoveryFunnel: { stage: string; count: number; amount: number }[];
  totals: {
    total: number;
    recovered: number;
    pending: number;
    writtenOff: number;
    recoveryRate: number;
  };
}

// Payroll chart data
export interface PayrollChartData {
  timeSeries: TimeSeriesDataPoint[];
  byStaffRole: { role: string; amount: number; count: number }[];
  breakdown: { type: string; amount: number }[];
  totals: {
    total: number;
    base: number;
    commissions: number;
    bonuses: number;
    deductions: number;
  };
}
