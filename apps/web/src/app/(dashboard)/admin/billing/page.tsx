'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  FileText,
  AlertTriangle,
  Wallet,
  ArrowRight,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Users,
  Calendar,
  Download,
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

interface BillingStats {
  mrr: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  outstanding: number;
  expectedNextMonth: number;
  activeSubscriptions: number;
  newSubscriptionsThisMonth: number;
  churnedThisMonth: number;
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

export default function BillingOverviewPage() {
  const [stats, setStats] = useState<BillingStats | null>(null);
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueBreakdown | null>(null);
  const [monthlyRevenue, setMonthlyRevenue] = useState<MonthlyRevenue[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Forecast state
  const [forecastData, setForecastData] = useState<ForecastData | null>(null);
  const [isForecastLoading, setIsForecastLoading] = useState(true);
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);

  useEffect(() => {
    fetchBillingData();
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

  const fetchBillingData = async () => {
    try {
      setIsLoading(true);
      console.log('[Billing] Starting to fetch billing data...');

      const [paymentsRes, invoicesRes, membersRes, payoutsRes] = await Promise.all([
        fetch('/api/admin/payments'),
        fetch('/api/admin/invoices'),
        fetch('/api/members'),
        fetch('/api/admin/payouts'),
      ]);
      console.log('[Billing] Fetch responses received');

      const [paymentsData, invoicesData, membersData, payoutsData] = await Promise.all([
        paymentsRes.json(),
        invoicesRes.json(),
        membersRes.json(),
        payoutsRes.json(),
      ]);
      console.log('[Billing] JSON parsed:', {
        payments: paymentsData.success,
        invoices: invoicesData.success,
        members: membersData.success,
        payouts: payoutsData.success
      });

      const payments = paymentsData.success ? paymentsData.data.payments : [];
      const invoices = invoicesData.success ? invoicesData.data.invoices : [];
      const members = membersData.success ? (membersData.data.members || membersData.data) : [];

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      // Calculate metrics
      const completedPayments = payments.filter((p: { status: string }) => p.status === 'COMPLETED');
      const thisMonthPayments = completedPayments.filter((p: { createdAt: string }) =>
        new Date(p.createdAt) >= thisMonthStart
      );
      const lastMonthPayments = completedPayments.filter((p: { createdAt: string }) =>
        new Date(p.createdAt) >= lastMonthStart && new Date(p.createdAt) <= lastMonthEnd
      );

      const thisMonthRevenue = thisMonthPayments.reduce((sum: number, p: { amount: number }) =>
        sum + Number(p.amount), 0
      );
      const lastMonthRevenue = lastMonthPayments.reduce((sum: number, p: { amount: number }) =>
        sum + Number(p.amount), 0
      );

      // Active subscriptions (members with ACTIVE status)
      const activeMembers = members.filter((m: { status: string }) => m.status === 'ACTIVE');
      const activeSubscriptions = activeMembers.length;

      // New this month
      const newThisMonth = members.filter((m: { joinedAt: string }) =>
        new Date(m.joinedAt) >= thisMonthStart
      ).length;

      // Churned (simplified - cancelled members)
      const churnedThisMonth = members.filter((m: { status: string; updatedAt: string }) =>
        m.status === 'CANCELLED' && new Date(m.updatedAt) >= thisMonthStart
      ).length;

      // Failed payments
      const failedPaymentsCount = payments.filter((p: { status: string }) => p.status === 'FAILED').length;

      // Overdue invoices
      const overdueInvoicesCount = invoices.filter((i: { status: string; dueDate: string }) =>
        (i.status === 'SENT' || i.status === 'OVERDUE') && new Date(i.dueDate) < now
      ).length;

      // Outstanding amount
      const outstanding = invoices
        .filter((i: { status: string }) => ['SENT', 'OVERDUE'].includes(i.status))
        .reduce((sum: number, i: { total: number }) => sum + Number(i.total), 0) +
        payments
          .filter((p: { status: string }) => p.status === 'FAILED')
          .reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0);

      // MRR (simplified - this month's recurring revenue)
      const mrr = thisMonthRevenue;

      // Expected next month (simplified projection)
      const expectedNextMonth = mrr * (1 + (newThisMonth - churnedThisMonth) * 0.05);

      // Avg revenue per member
      const avgRevenuePerMember = activeSubscriptions > 0 ? thisMonthRevenue / activeSubscriptions : 0;

      // Upcoming renewals (next 7 days - simplified)
      const upcomingRenewalsCount = Math.floor(activeSubscriptions * 0.25);
      const upcomingRenewalsValue = upcomingRenewalsCount * avgRevenuePerMember;

      setStats({
        mrr,
        thisMonthRevenue,
        lastMonthRevenue,
        outstanding,
        expectedNextMonth,
        activeSubscriptions,
        newSubscriptionsThisMonth: newThisMonth,
        churnedThisMonth,
        avgRevenuePerMember,
        failedPaymentsCount,
        overdueInvoicesCount,
        upcomingRenewalsCount,
        upcomingRenewalsValue,
      });

      // Revenue breakdown (simulated - in production would come from payment categories)
      const totalRevenue = thisMonthRevenue || 100;
      setRevenueBreakdown({
        memberships: totalRevenue * 0.65,
        classPacks: totalRevenue * 0.15,
        personalTraining: totalRevenue * 0.12,
        dropIns: totalRevenue * 0.05,
        retail: totalRevenue * 0.02,
        other: totalRevenue * 0.01,
      });

      // Monthly revenue trend (last 6 months)
      const monthlyData: MonthlyRevenue[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const monthPayments = completedPayments.filter((p: { createdAt: string }) => {
          const date = new Date(p.createdAt);
          return date >= monthDate && date <= monthEnd;
        });
        monthlyData.push({
          month: monthDate.toLocaleDateString('en-US', { month: 'short' }),
          revenue: monthPayments.reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0),
        });
      }
      setMonthlyRevenue(monthlyData);

      // Recent transactions
      const transactions: RecentTransaction[] = payments.slice(0, 5).map((p: {
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
      setRecentTransactions(transactions);

    } catch (error) {
      console.error('Failed to fetch billing data:', error);
    } finally {
      console.log('[Billing] Setting isLoading to false');
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const revenueChange = stats && stats.lastMonthRevenue > 0
    ? ((stats.thisMonthRevenue - stats.lastMonthRevenue) / stats.lastMonthRevenue * 100)
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

  if (isLoading) {
    return (
      <>
        <Header title="Billing" description="Financial overview and management" />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Billing" description="Financial overview and management" />

      <div className="p-4 md:p-6 space-y-6">
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
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.thisMonthRevenue || 0)}</p>
            <p className="text-sm text-slate-500 mt-1">This Month's Revenue</p>
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
              <span className="text-xs text-slate-500">New This Month</span>
            </div>
            <p className="text-xl font-bold text-emerald-600">+{stats?.newSubscriptionsThisMonth || 0}</p>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <UserMinus className="w-4 h-4 text-red-500" />
              <span className="text-xs text-slate-500">Churned</span>
            </div>
            <p className="text-xl font-bold text-red-600">-{stats?.churnedThisMonth || 0}</p>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <button
            onClick={() => alert('Export functionality would generate a report here')}
            className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow group text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                  <Download className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Export Report</p>
                  <p className="text-sm text-slate-500">Download CSV/PDF</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
            </div>
          </button>

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

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">Recent Transactions</h2>
            <Link href="/admin/billing/transactions">
              <Button variant="ghost" className="text-sm text-slate-600 hover:text-slate-900">
                View All
                <ArrowRight className="ml-1 w-4 h-4" />
              </Button>
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="rounded-2xl bg-slate-100 p-4 mb-3">
                <CreditCard className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-sm text-slate-500">No transactions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentTransactions.map((transaction) => (
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
              fetchBillingData();
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
            newSignupsPerMonth: stats?.newSubscriptionsThisMonth || 0,
          }}
          baselineProjection90Day={
            forecastData.forecasts.find((f) => f.period === '90day')?.projectedRevenue || 0
          }
        />
      )}
    </>
  );
}
