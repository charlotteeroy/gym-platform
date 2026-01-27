'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Users,
  Calendar,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  UserPlus,
  UserMinus,
  Zap,
  Calculator,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { ForecastCards, ChurnRiskPanel, RevenueChart, ScenarioModal } from '@/components/admin';
import { ExportButton } from '@/components/ui/export-button';
import { type ExportColumn } from '@/lib/export';

interface BillingStats {
  mrr: number;
  periodRevenue: number;
  comparisonRevenue: number;
  outstanding: number;
  expectedNextMonth: number;
  activeSubscriptions: number;
  newInPeriod: number;
  churnedInPeriod: number;
  avgRevenuePerMember: number;
  failedPaymentsCount: number;
  overdueInvoicesCount: number;
  upcomingRenewalsCount: number;
  upcomingRenewalsValue: number;
}

interface RevenueBreakdown {
  memberships: number;
  classPacks: number;
  personalTraining: number;
  dropIns: number;
  retail: number;
  other: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
}

interface RecentTransaction {
  id: string;
  type: 'payment' | 'invoice' | 'refund';
  amount: number;
  status: string;
  description: string;
  date: string;
  member?: {
    firstName: string;
    lastName: string;
  } | null;
}

// Forecast types
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

interface ChurnRiskMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  riskScore: number;
  riskFactors: string[];
  subscriptionValue: number;
  lastActivity: string | null;
  daysSinceActivity: number;
  subscriptionEnds: string;
  cancelAtPeriodEnd: boolean;
}

interface ChurnMetrics {
  atRiskCount: number;
  atRiskRevenue: number;
  scheduledCancellations: number;
  scheduledCancellationRevenue: number;
  churnRateThisMonth: number;
  churnRateTrend: 'up' | 'down' | 'stable';
  historicalChurnRate: number;
}

interface ForecastData {
  currentMRR: number;
  normalizedMRR: number;
  activeSubscriptions: number;
  avgSubscriptionValue: number;
  forecasts: RevenueForecast[];
  churn: ChurnMetrics;
  atRiskMembers: ChurnRiskMember[];
  history: {
    months: string[];
    actualRevenue: number[];
  };
  renewalsByWeek: {
    week: string;
    count: number;
    revenue: number;
  }[];
}

// Date filtering types and helpers
type DatePreset = 'today' | 'this_week' | 'this_month' | 'this_quarter' | 'this_year' | 'last_month' | 'last_year' | 'custom';

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'Week' },
  { value: 'this_month', label: 'Month' },
  { value: 'this_quarter', label: 'Quarter' },
  { value: 'this_year', label: 'Year' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'custom', label: 'Custom' },
];

function getDateRange(preset: DatePreset, customStart?: string, customEnd?: string): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case 'today':
      return { start: today, end: now };
    case 'this_week': {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return { start: weekStart, end: now };
    }
    case 'this_month':
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
    case 'this_quarter': {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      return { start: new Date(now.getFullYear(), qMonth, 1), end: now };
    }
    case 'this_year':
      return { start: new Date(now.getFullYear(), 0, 1), end: now };
    case 'last_month':
      return {
        start: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        end: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59),
      };
    case 'last_year':
      return {
        start: new Date(now.getFullYear() - 1, 0, 1),
        end: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59),
      };
    case 'custom':
      return {
        start: customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1),
        end: customEnd ? new Date(customEnd + 'T23:59:59') : now,
      };
  }
}

function getComparisonRange(range: { start: Date; end: Date }): { start: Date; end: Date } {
  const duration = range.end.getTime() - range.start.getTime();
  return {
    start: new Date(range.start.getTime() - duration - 1),
    end: new Date(range.start.getTime() - 1),
  };
}

function getPeriodLabel(preset: DatePreset): string {
  switch (preset) {
    case 'today': return "Today's";
    case 'this_week': return "This Week's";
    case 'this_month': return "This Month's";
    case 'this_quarter': return "This Quarter's";
    case 'this_year': return "This Year's";
    case 'last_month': return "Last Month's";
    case 'last_year': return "Last Year's";
    case 'custom': return "Period";
  }
}

// Synthetic data generation
function generateSyntheticData() {
  const now = new Date();
  const firstNames = ['Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Ethan', 'Sophia', 'Mason', 'Isabella', 'Logan', 'Mia', 'Lucas', 'Charlotte', 'James', 'Amelia', 'Benjamin', 'Harper', 'Elijah', 'Evelyn', 'Aiden', 'Luna', 'Jackson', 'Chloe', 'Sebastian', 'Layla', 'Daniel', 'Ella', 'Henry', 'Grace', 'Alexander', 'Zoe', 'Owen', 'Nora', 'Jack', 'Lily'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];
  const planNames = ['Basic Monthly', 'Premium Monthly', 'VIP Monthly', 'Basic Annual', 'Premium Annual', '10-Class Pack', 'Drop-in'];
  const planAmounts = [29.99, 59.99, 99.99, 299.99, 599.99, 120, 15];

  const seededRandom = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  // Generate members
  const members = Array.from({ length: 35 }, (_, i) => {
    const r = seededRandom(i + 1);
    const monthsAgo = Math.floor(r * 18);
    const joinDate = new Date(now.getFullYear(), now.getMonth() - monthsAgo, Math.floor(seededRandom(i + 100) * 28) + 1);
    const statuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE', 'CANCELLED'];
    const status = statuses[Math.floor(seededRandom(i + 200) * statuses.length)];
    const cancelledRecently = status === 'CANCELLED' && monthsAgo < 2;

    return {
      id: `member-${i + 1}`,
      firstName: firstNames[i % firstNames.length],
      lastName: lastNames[i % lastNames.length],
      email: `${firstNames[i % firstNames.length].toLowerCase()}.${lastNames[i % lastNames.length].toLowerCase()}@email.com`,
      status,
      joinedAt: joinDate.toISOString(),
      updatedAt: cancelledRecently
        ? new Date(now.getFullYear(), now.getMonth(), Math.floor(seededRandom(i + 300) * 20) + 1).toISOString()
        : joinDate.toISOString(),
    };
  });

  // Generate payments spread across the last 12 months
  const payments: any[] = [];
  let paymentId = 1;
  for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
    const paymentsInMonth = 12 + Math.floor(seededRandom(monthOffset + 500) * 8);
    for (let j = 0; j < paymentsInMonth; j++) {
      const r = seededRandom(paymentId + 1000);
      const planIdx = Math.floor(seededRandom(paymentId + 2000) * planNames.length);
      const memberIdx = Math.floor(seededRandom(paymentId + 3000) * members.length);
      const day = Math.floor(r * 28) + 1;
      const date = new Date(now.getFullYear(), now.getMonth() - monthOffset, day);
      if (date > now) { paymentId++; continue; }

      const statusRoll = seededRandom(paymentId + 4000);
      let status = 'COMPLETED';
      if (statusRoll > 0.92) status = 'FAILED';
      else if (statusRoll > 0.87) status = 'PENDING';
      else if (statusRoll > 0.85) status = 'REFUNDED';

      // Add slight variation to amounts
      const baseAmount = planAmounts[planIdx];
      const amount = Math.round((baseAmount + (seededRandom(paymentId + 5000) - 0.5) * 5) * 100) / 100;

      payments.push({
        id: `payment-${paymentId}`,
        amount,
        status,
        description: `${planNames[planIdx]} — ${members[memberIdx].firstName} ${members[memberIdx].lastName}`,
        createdAt: date.toISOString(),
        member: {
          firstName: members[memberIdx].firstName,
          lastName: members[memberIdx].lastName,
        },
      });
      paymentId++;
    }
  }

  // Generate invoices
  const invoices = Array.from({ length: 40 }, (_, i) => {
    const r = seededRandom(i + 6000);
    const monthsAgo = Math.floor(r * 6);
    const day = Math.floor(seededRandom(i + 7000) * 28) + 1;
    const date = new Date(now.getFullYear(), now.getMonth() - monthsAgo, day);
    const dueDate = new Date(date);
    dueDate.setDate(dueDate.getDate() + 30);

    const statusRoll = seededRandom(i + 8000);
    let status = 'PAID';
    if (statusRoll > 0.85) status = 'OVERDUE';
    else if (statusRoll > 0.75) status = 'SENT';
    else if (statusRoll > 0.7) status = 'DRAFT';

    const planIdx = Math.floor(seededRandom(i + 9000) * planAmounts.length);
    const total = planAmounts[planIdx];

    return {
      id: `invoice-${i + 1}`,
      status,
      total,
      dueDate: dueDate.toISOString(),
      createdAt: date.toISOString(),
    };
  });

  return { payments, invoices, members };
}

export default function BillingOverviewPage() {
  // Raw data (fetched once)
  const [rawPayments, setRawPayments] = useState<any[]>([]);
  const [rawInvoices, setRawInvoices] = useState<any[]>([]);
  const [rawMembers, setRawMembers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Forecast state
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [isForecastLoading, setIsForecastLoading] = useState(true);
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);

  // Date filtering
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    fetchRawData();
    fetchForecastData();
  }, []);

  const fetchForecastData = async () => {
    try {
      setIsForecastLoading(true);
      const response = await fetch('/api/admin/billing/forecast');
      const data = await response.json();

      if (data.success) {
        setForecastData(data.data);
      } else {
        console.error('Forecast API error:', data.error);
      }
    } catch (error) {
      console.error('Failed to fetch forecast data:', error);
    } finally {
      setIsForecastLoading(false);
    }
  };

  const fetchRawData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const fetchWithFallback = async (url: string, fallback: unknown) => {
        try {
          const res = await fetch(url);
          const data = await res.json();
          return data.success ? data.data : fallback;
        } catch {
          return fallback;
        }
      };

      const [paymentsData, invoicesData, membersData] = await Promise.all([
        fetchWithFallback('/api/admin/payments', { payments: [] }),
        fetchWithFallback('/api/admin/invoices', { invoices: [] }),
        fetchWithFallback('/api/members', { items: [] }),
      ]);

      const apiPayments = paymentsData.payments || [];
      const apiInvoices = invoicesData.invoices || [];
      const apiMembers = membersData.items || membersData.members || [];

      // Merge with synthetic data for richer demonstration
      const synthetic = generateSyntheticData();
      setRawPayments([...apiPayments, ...synthetic.payments]);
      setRawInvoices([...apiInvoices, ...synthetic.invoices]);
      setRawMembers([...apiMembers, ...synthetic.members]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
    } finally {
      setIsLoading(false);
    }
  };

  // Computed date ranges
  const dateRange = useMemo(
    () => getDateRange(datePreset, customStart, customEnd),
    [datePreset, customStart, customEnd]
  );
  const comparisonRange = useMemo(() => getComparisonRange(dateRange), [dateRange]);

  // Compute stats from raw data + date range
  const stats = useMemo<BillingStats | null>(() => {
    if (isLoading) return null;

    const now = new Date();
    const completedPayments = rawPayments.filter((p: { status: string }) => p.status === 'COMPLETED');

    const periodPayments = completedPayments.filter((p: { createdAt: string }) => {
      const d = new Date(p.createdAt);
      return d >= dateRange.start && d <= dateRange.end;
    });

    const compPayments = completedPayments.filter((p: { createdAt: string }) => {
      const d = new Date(p.createdAt);
      return d >= comparisonRange.start && d <= comparisonRange.end;
    });

    const periodRevenue = periodPayments.reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0);
    const comparisonRevenue = compPayments.reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0);

    const activeMembers = rawMembers.filter((m: { status: string }) => m.status === 'ACTIVE');
    const activeSubscriptions = activeMembers.length;

    const newInPeriod = rawMembers.filter((m: { joinedAt: string }) => {
      const d = new Date(m.joinedAt);
      return d >= dateRange.start && d <= dateRange.end;
    }).length;

    const churnedInPeriod = rawMembers.filter((m: { status: string; updatedAt: string }) =>
      m.status === 'CANCELLED' && new Date(m.updatedAt) >= dateRange.start && new Date(m.updatedAt) <= dateRange.end
    ).length;

    const failedPaymentsCount = rawPayments.filter((p: { status: string }) => p.status === 'FAILED').length;

    const overdueInvoicesCount = rawInvoices.filter((i: { status: string; dueDate: string }) =>
      (i.status === 'SENT' || i.status === 'OVERDUE') && new Date(i.dueDate) < now
    ).length;

    const outstanding = rawInvoices
      .filter((i: { status: string }) => ['SENT', 'OVERDUE'].includes(i.status))
      .reduce((sum: number, i: { total: number }) => sum + Number(i.total), 0) +
      rawPayments
        .filter((p: { status: string }) => p.status === 'FAILED')
        .reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0);

    const mrr = periodRevenue;
    const expectedNextMonth = mrr * (1 + (newInPeriod - churnedInPeriod) * 0.05);
    const avgRevenuePerMember = activeSubscriptions > 0 ? periodRevenue / activeSubscriptions : 0;
    const upcomingRenewalsCount = Math.floor(activeSubscriptions * 0.25);
    const upcomingRenewalsValue = upcomingRenewalsCount * avgRevenuePerMember;

    return {
      mrr,
      periodRevenue,
      comparisonRevenue,
      outstanding,
      expectedNextMonth,
      activeSubscriptions,
      newInPeriod,
      churnedInPeriod,
      avgRevenuePerMember,
      failedPaymentsCount,
      overdueInvoicesCount,
      upcomingRenewalsCount,
      upcomingRenewalsValue,
    };
  }, [rawPayments, rawInvoices, rawMembers, dateRange, comparisonRange, isLoading]);

  // Revenue breakdown (simulated percentages)
  const revenueBreakdown = useMemo<RevenueBreakdown | null>(() => {
    if (!stats) return null;
    const total = stats.periodRevenue || 100;
    return {
      memberships: total * 0.65,
      classPacks: total * 0.15,
      personalTraining: total * 0.12,
      dropIns: total * 0.05,
      retail: total * 0.02,
      other: total * 0.01,
    };
  }, [stats]);

  // Monthly revenue trend (always last 6 months)
  const monthlyRevenue = useMemo<MonthlyRevenue[]>(() => {
    const completedPayments = rawPayments.filter((p: { status: string }) => p.status === 'COMPLETED');
    const now = new Date();
    const data: MonthlyRevenue[] = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      const monthPayments = completedPayments.filter((p: { createdAt: string }) => {
        const d = new Date(p.createdAt);
        return d >= monthDate && d <= monthEnd;
      });
      data.push({
        month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
        revenue: monthPayments.reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0),
      });
    }
    return data;
  }, [rawPayments]);

  // Transactions filtered by selected period
  const periodTransactions = useMemo<RecentTransaction[]>(() => {
    return rawPayments
      .filter((p: { createdAt: string }) => {
        const d = new Date(p.createdAt);
        return d >= dateRange.start && d <= dateRange.end;
      })
      .map((p: {
        id: string;
        amount: number;
        status: string;
        description: string | null;
        createdAt: string;
        member: { firstName: string; lastName: string } | null;
      }) => ({
        id: p.id,
        type: 'payment' as const,
        amount: Number(p.amount),
        status: p.status,
        description: p.description || 'Payment',
        date: p.createdAt,
        member: p.member,
      }));
  }, [rawPayments, dateRange]);

  const displayTransactions = periodTransactions.slice(0, 10);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const revenueChange = stats && stats.comparisonRevenue > 0
    ? ((stats.periodRevenue - stats.comparisonRevenue) / stats.comparisonRevenue * 100)
    : 0;

  const maxRevenue = Math.max(...monthlyRevenue.map(m => m.revenue), 1);

  const breakdownItems = revenueBreakdown ? [
    { name: 'Memberships', value: revenueBreakdown.memberships, color: 'bg-indigo-500' },
    { name: 'Class Packs', value: revenueBreakdown.classPacks, color: 'bg-emerald-500' },
    { name: 'Personal Training', value: revenueBreakdown.personalTraining, color: 'bg-amber-500' },
    { name: 'Drop-ins', value: revenueBreakdown.dropIns, color: 'bg-pink-500' },
    { name: 'Retail', value: revenueBreakdown.retail, color: 'bg-cyan-500' },
    { name: 'Other', value: revenueBreakdown.other, color: 'bg-slate-400' },
  ] : [];

  const totalBreakdown = breakdownItems.reduce((sum, item) => sum + item.value, 0);

  // Export columns for transactions
  const transactionExportColumns: ExportColumn[] = [
    { header: 'Date', accessor: (t) => formatDate(t.date) },
    { header: 'Description', accessor: (t) => t.description },
    { header: 'Member', accessor: (t) => t.member ? `${t.member.firstName} ${t.member.lastName}` : '' },
    { header: 'Status', accessor: (t) => t.status },
    { header: 'Amount', accessor: (t) => formatCurrency(t.amount), align: 'right' },
  ];

  const periodLabel = getPeriodLabel(datePreset);

  if (isLoading) {
    return (
      <>
        <Header title="Accounting" description="Financial overview and management" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header title="Accounting" description="Financial overview and management" />
        <div className="p-6">
          <div className="bg-red-50 text-red-600 p-4 rounded-xl">
            {error}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Accounting" description="Financial overview and management" />

      <div className="p-4 md:p-6 space-y-6">
        {/* Date Filter Bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400 mr-1" />
              {DATE_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setDatePreset(preset.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    datePreset === preset.value
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {datePreset === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                  <span className="text-slate-400 text-sm">to</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  />
                </div>
              )}
              <ExportButton
                data={periodTransactions}
                columns={transactionExportColumns}
                filename="accounting-report"
                pdfTitle={`Accounting Report — ${periodLabel} Revenue`}
                pdfSummary={[
                  { label: 'Period Revenue', value: formatCurrency(stats?.periodRevenue || 0) },
                  { label: 'Transactions', value: `${periodTransactions.length}` },
                  { label: 'Outstanding', value: formatCurrency(stats?.outstanding || 0) },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Primary Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="text-xs font-medium text-slate-500">MRR</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.mrr || 0)}</p>
            <p className="text-sm text-slate-500 mt-1">Monthly Recurring Revenue</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600" />
              </div>
              {revenueChange !== 0 && (
                <span className={`flex items-center gap-1 text-xs font-medium ${revenueChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {revenueChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(revenueChange).toFixed(1)}%
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.periodRevenue || 0)}</p>
            <p className="text-sm text-slate-500 mt-1">{periodLabel} Revenue</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              {stats && (stats.failedPaymentsCount > 0 || stats.overdueInvoicesCount > 0) && (
                <span className="text-xs font-medium text-red-600">Action needed</span>
              )}
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.outstanding || 0)}</p>
            <p className="text-sm text-slate-500 mt-1">Outstanding</p>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.expectedNextMonth || 0)}</p>
            <p className="text-sm text-slate-500 mt-1">Expected Next Month</p>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500">Active Subscriptions</span>
            </div>
            <p className="text-xl font-bold text-slate-900">{stats?.activeSubscriptions || 0}</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="w-4 h-4 text-emerald-500" />
              <span className="text-xs text-slate-500">New in Period</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">+{stats?.newInPeriod || 0}</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <UserMinus className="w-4 h-4 text-red-500" />
              <span className="text-xs text-slate-500">Churned</span>
            </div>
            <p className="text-xl font-bold text-red-600">-{stats?.churnedInPeriod || 0}</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500">Avg Revenue/Member</span>
            </div>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(stats?.avgRevenuePerMember || 0)}</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-slate-500">Renewals This Week</span>
            </div>
            <p className="text-xl font-bold text-slate-900">
              {stats?.upcomingRenewalsCount || 0}
              <span className="text-sm font-normal text-slate-500 ml-1">
                ({formatCurrency(stats?.upcomingRenewalsValue || 0)})
              </span>
            </p>
          </div>
        </div>

        {/* Revenue Forecast Section */}
        <ForecastCards
          currentMRR={forecastData?.currentMRR || 0}
          normalizedMRR={forecastData?.normalizedMRR || 0}
          forecasts={forecastData?.forecasts || []}
          isLoading={isForecastLoading}
        />

        {/* What-If Analysis Button */}
        {forecastData && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setIsScenarioModalOpen(true)}
              className="rounded-xl text-slate-600 border-slate-200 hover:border-indigo-200 hover:text-indigo-600"
            >
              <Calculator className="w-4 h-4 mr-2" />
              What-If Analysis
            </Button>
          </div>
        )}

        {/* Revenue Chart with Forecast */}
        {forecastData && (
          <RevenueChart
            history={forecastData.history}
            forecasts={forecastData.forecasts}
            isLoading={isForecastLoading}
          />
        )}

        {/* Churn Risk Panel */}
        {forecastData && (
          <ChurnRiskPanel
            churn={forecastData.churn}
            atRiskMembers={forecastData.atRiskMembers}
            isLoading={isForecastLoading}
          />
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend Chart */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Revenue Trend</h3>
              <BarChart3 className="w-5 h-5 text-slate-400" />
            </div>
            <div className="h-48 flex items-end gap-2">
              {monthlyRevenue.map((month, index) => (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-slate-100 rounded-t-lg relative" style={{ height: '160px' }}>
                    <div
                      className="absolute bottom-0 w-full bg-indigo-500 rounded-t-lg transition-all"
                      style={{ height: `${(month.revenue / maxRevenue) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-500">{month.month}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue Breakdown */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900">Revenue Breakdown</h3>
              <PieChart className="w-5 h-5 text-slate-400" />
            </div>
            <div className="space-y-3">
              {breakdownItems.map((item, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-600">{item.name}</span>
                      <span className="text-sm font-medium text-slate-900">{formatCurrency(item.value)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full`}
                        style={{ width: `${totalBreakdown > 0 ? (item.value / totalBreakdown) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Alert Banner */}
        {stats && (stats.failedPaymentsCount > 0 || stats.overdueInvoicesCount > 0) && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-medium text-red-900">Action Required</p>
                <p className="text-sm text-red-700">
                  {stats.failedPaymentsCount > 0 && `${stats.failedPaymentsCount} failed payment${stats.failedPaymentsCount > 1 ? 's' : ''}`}
                  {stats.failedPaymentsCount > 0 && stats.overdueInvoicesCount > 0 && ' and '}
                  {stats.overdueInvoicesCount > 0 && `${stats.overdueInvoicesCount} overdue invoice${stats.overdueInvoicesCount > 1 ? 's' : ''}`}
                </p>
              </div>
            </div>
            <Link href="/admin/billing/failed-overdue">
              <Button variant="outline" className="border-red-200 text-red-700 hover:bg-red-100 rounded-xl">
                View Issues
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/admin/billing/failed-overdue" className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center group-hover:bg-red-200 transition-colors">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">View Overdue</p>
                  <p className="text-sm text-slate-500">Failed & overdue items</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
            </div>
          </Link>

          <Link href="/admin/billing/transactions" className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                  <CreditCard className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">View All Transactions</p>
                  <p className="text-sm text-slate-500">Full payment history</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
            </div>
          </Link>
        </div>

        {/* Period Transactions */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900">Transactions</h2>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                {periodTransactions.length}
              </span>
            </div>
            <Link href="/admin/billing/transactions">
              <Button variant="ghost" className="text-sm text-slate-600 hover:text-slate-900">
                View All
                <ArrowRight className="ml-1 w-4 h-4" />
              </Button>
            </Link>
          </div>

          {displayTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="rounded-2xl bg-slate-100 p-4 mb-3">
                <CreditCard className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">No transactions in this period</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {displayTransactions.map((transaction) => (
                <div key={transaction.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    transaction.status === 'COMPLETED' ? 'bg-emerald-100' :
                    transaction.status === 'PENDING' ? 'bg-amber-100' :
                    transaction.status === 'FAILED' ? 'bg-red-100' :
                    'bg-slate-100'
                  }`}>
                    {transaction.status === 'COMPLETED' ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> :
                     transaction.status === 'PENDING' ? <Clock className="w-5 h-5 text-amber-600" /> :
                     transaction.status === 'FAILED' ? <XCircle className="w-5 h-5 text-red-600" /> :
                     <DollarSign className="w-5 h-5 text-slate-600" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">{transaction.description}</p>
                    {transaction.member && (
                      <p className="text-sm text-slate-500">
                        {transaction.member.firstName} {transaction.member.lastName}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{formatCurrency(transaction.amount)}</p>
                    <p className="text-xs text-slate-500">{formatDate(transaction.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Refresh */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => {
              fetchRawData();
              fetchForecastData();
            }}
            className="rounded-xl text-slate-600"
          >
            <RefreshCw className="mr-2 w-4 h-4" />
            Refresh Data
          </Button>
        </div>
      </div>

      {/* Scenario Modal */}
      {forecastData && (
        <ScenarioModal
          isOpen={isScenarioModalOpen}
          onClose={() => setIsScenarioModalOpen(false)}
          currentMetrics={{
            currentMRR: forecastData.currentMRR,
            activeSubscriptions: forecastData.activeSubscriptions,
            avgRevenuePerMember: forecastData.avgSubscriptionValue,
            churnRateThisMonth: forecastData.churn.churnRateThisMonth,
            newSignupsPerMonth: stats?.newInPeriod || 0,
          }}
          baselineProjection90Day={
            forecastData.forecasts.find((f) => f.period === '90day')?.projectedRevenue || 0
          }
        />
      )}
    </>
  );
}
