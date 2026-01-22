'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowRight,
  Loader2,
  Calendar,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface PnLReport {
  period: { startDate: string; endDate: string };
  revenue: {
    subscriptions: number;
    oneTimePayments: number;
    otherIncome: number;
    total: number;
  };
  expenses: {
    payroll: number;
    operational: number;
    refunds: number;
    total: number;
  };
  netIncome: number;
  margin: number;
}

interface CashFlowReport {
  period: { startDate: string; endDate: string };
  inflows: {
    subscriptionPayments: number;
    oneTimePayments: number;
    total: number;
  };
  outflows: {
    payroll: number;
    expenses: number;
    refunds: number;
    total: number;
  };
  netCashFlow: number;
  byPeriod: Array<{
    period: string;
    inflow: number;
    outflow: number;
    net: number;
  }>;
}

interface RevenueBreakdown {
  period: { startDate: string; endDate: string };
  bySource: Array<{
    source: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  byPlan: Array<{
    planName: string;
    amount: number;
    percentage: number;
    subscriberCount: number;
  }>;
  trends: Array<{
    period: string;
    subscriptions: number;
    oneTime: number;
    total: number;
  }>;
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [pnlReport, setPnlReport] = useState<PnLReport | null>(null);
  const [cashFlowReport, setCashFlowReport] = useState<CashFlowReport | null>(null);
  const [revenueBreakdown, setRevenueBreakdown] = useState<RevenueBreakdown | null>(null);

  // Date filters
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const [startDate, setStartDate] = useState(firstOfMonth.toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(lastOfMonth.toISOString().split('T')[0]);

  useEffect(() => {
    fetchReports();
  }, [startDate, endDate]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      const [pnlRes, cashFlowRes, revenueRes] = await Promise.all([
        fetch(`/api/admin/reports/pnl?${params}`),
        fetch(`/api/admin/reports/cash-flow?${params}`),
        fetch(`/api/admin/reports/revenue-breakdown?${params}`),
      ]);

      const [pnlData, cashFlowData, revenueData] = await Promise.all([
        pnlRes.json(),
        cashFlowRes.json(),
        revenueRes.json(),
      ]);

      if (pnlData.success) setPnlReport(pnlData.data);
      if (cashFlowData.success) setCashFlowReport(cashFlowData.data);
      if (revenueData.success) setRevenueBreakdown(revenueData.data);
    } catch (error) {
      console.error('Failed to fetch reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const formatMonth = (period: string) => {
    const [year, month] = period.split('-');
    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  // Calculate max value for cash flow chart
  const maxCashFlowValue = cashFlowReport
    ? Math.max(...cashFlowReport.byPeriod.flatMap((p) => [p.inflow, p.outflow]))
    : 0;

  return (
    <>
      <Header title="Financial Reports" />

      <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Financial Reports</h1>
              <p className="text-sm text-slate-500">
                P&L, cash flow, and revenue analysis
              </p>
            </div>
            <Link href="/admin/billing">
              <Button variant="outline">Back to Accounting</Button>
            </Link>
          </div>

          {/* Date Filters */}
          <div className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Period:</span>
            </div>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-40"
            />
            <span className="text-slate-400">to</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-40"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const start = new Date(now.getFullYear(), now.getMonth(), 1);
                  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                  setStartDate(start.toISOString().split('T')[0]);
                  setEndDate(end.toISOString().split('T')[0]);
                }}
              >
                This Month
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
                  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                  setStartDate(start.toISOString().split('T')[0]);
                  setEndDate(end.toISOString().split('T')[0]);
                }}
              >
                Last 3 Months
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const start = new Date(now.getFullYear(), 0, 1);
                  const end = new Date(now.getFullYear(), 11, 31);
                  setStartDate(start.toISOString().split('T')[0]);
                  setEndDate(end.toISOString().split('T')[0]);
                }}
              >
                This Year
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="space-y-6">
              {/* P&L Overview */}
              {pnlReport && (
                <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 p-4">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                      <BarChart3 className="h-5 w-5" />
                      Profit & Loss Statement
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="grid gap-6 md:grid-cols-3">
                      {/* Revenue */}
                      <div>
                        <h3 className="text-sm font-medium text-slate-500">Revenue</h3>
                        <p className="mt-1 text-3xl font-bold text-emerald-600">
                          {formatCurrency(pnlReport.revenue.total)}
                        </p>
                        <div className="mt-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Subscriptions</span>
                            <span className="font-medium">{formatCurrency(pnlReport.revenue.subscriptions)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">One-time</span>
                            <span className="font-medium">{formatCurrency(pnlReport.revenue.oneTimePayments)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Expenses */}
                      <div>
                        <h3 className="text-sm font-medium text-slate-500">Expenses</h3>
                        <p className="mt-1 text-3xl font-bold text-red-600">
                          {formatCurrency(pnlReport.expenses.total)}
                        </p>
                        <div className="mt-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Payroll</span>
                            <span className="font-medium">{formatCurrency(pnlReport.expenses.payroll)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Operating</span>
                            <span className="font-medium">{formatCurrency(pnlReport.expenses.operational)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600">Refunds</span>
                            <span className="font-medium">{formatCurrency(pnlReport.expenses.refunds)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Net Income */}
                      <div className="rounded-lg bg-slate-50 p-4">
                        <h3 className="text-sm font-medium text-slate-500">Net Income</h3>
                        <p
                          className={`mt-1 text-3xl font-bold ${
                            pnlReport.netIncome >= 0 ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {formatCurrency(pnlReport.netIncome)}
                        </p>
                        <div className="mt-4 flex items-center gap-2">
                          <span className="text-sm text-slate-600">Margin:</span>
                          <span
                            className={`inline-flex items-center gap-1 text-sm font-medium ${
                              pnlReport.margin >= 0 ? 'text-emerald-600' : 'text-red-600'
                            }`}
                          >
                            {pnlReport.margin >= 0 ? (
                              <ArrowUpRight className="h-4 w-4" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4" />
                            )}
                            {formatPercent(pnlReport.margin)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cash Flow */}
              {cashFlowReport && (
                <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 p-4">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                      <TrendingUp className="h-5 w-5" />
                      Cash Flow
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="mb-6 grid gap-4 sm:grid-cols-3">
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                        <p className="text-sm text-emerald-600">Total Inflow</p>
                        <p className="text-2xl font-bold text-emerald-700">
                          {formatCurrency(cashFlowReport.inflows.total)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                        <p className="text-sm text-red-600">Total Outflow</p>
                        <p className="text-2xl font-bold text-red-700">
                          {formatCurrency(cashFlowReport.outflows.total)}
                        </p>
                      </div>
                      <div
                        className={`rounded-lg border p-4 ${
                          cashFlowReport.netCashFlow >= 0
                            ? 'border-blue-200 bg-blue-50'
                            : 'border-amber-200 bg-amber-50'
                        }`}
                      >
                        <p
                          className={`text-sm ${
                            cashFlowReport.netCashFlow >= 0 ? 'text-blue-600' : 'text-amber-600'
                          }`}
                        >
                          Net Cash Flow
                        </p>
                        <p
                          className={`text-2xl font-bold ${
                            cashFlowReport.netCashFlow >= 0 ? 'text-blue-700' : 'text-amber-700'
                          }`}
                        >
                          {formatCurrency(cashFlowReport.netCashFlow)}
                        </p>
                      </div>
                    </div>

                    {/* Simple chart */}
                    {cashFlowReport.byPeriod.length > 0 && (
                      <div>
                        <h3 className="mb-4 text-sm font-medium text-slate-700">Monthly Breakdown</h3>
                        <div className="space-y-3">
                          {cashFlowReport.byPeriod.map((period) => (
                            <div key={period.period} className="flex items-center gap-4">
                              <span className="w-20 text-sm text-slate-600">{formatMonth(period.period)}</span>
                              <div className="flex flex-1 items-center gap-2">
                                <div className="flex-1">
                                  <div
                                    className="h-4 rounded-full bg-emerald-500"
                                    style={{
                                      width: `${maxCashFlowValue > 0 ? (period.inflow / maxCashFlowValue) * 100 : 0}%`,
                                    }}
                                  />
                                </div>
                                <span className="w-24 text-right text-sm text-emerald-600">
                                  +{formatCurrency(period.inflow)}
                                </span>
                              </div>
                              <div className="flex flex-1 items-center gap-2">
                                <div className="flex-1">
                                  <div
                                    className="h-4 rounded-full bg-red-500"
                                    style={{
                                      width: `${maxCashFlowValue > 0 ? (period.outflow / maxCashFlowValue) * 100 : 0}%`,
                                    }}
                                  />
                                </div>
                                <span className="w-24 text-right text-sm text-red-600">
                                  -{formatCurrency(period.outflow)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-emerald-500" />
                            <span className="text-slate-600">Inflow</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full bg-red-500" />
                            <span className="text-slate-600">Outflow</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Revenue Breakdown */}
              {revenueBreakdown && (
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* By Source */}
                  <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 p-4">
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                        <PieChart className="h-5 w-5" />
                        Revenue by Source
                      </h2>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4">
                        {revenueBreakdown.bySource.map((source) => (
                          <div key={source.source}>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-700">{source.source}</span>
                              <span className="text-sm text-slate-500">{source.percentage.toFixed(1)}%</span>
                            </div>
                            <div className="mt-1 flex items-center gap-3">
                              <div className="h-2 flex-1 rounded-full bg-slate-100">
                                <div
                                  className="h-2 rounded-full bg-blue-500"
                                  style={{ width: `${source.percentage}%` }}
                                />
                              </div>
                              <span className="w-24 text-right text-sm font-semibold text-slate-900">
                                {formatCurrency(source.amount)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">{source.count} transactions</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* By Plan */}
                  <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 p-4">
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                        <DollarSign className="h-5 w-5" />
                        Revenue by Plan
                      </h2>
                    </div>
                    <div className="p-6">
                      {revenueBreakdown.byPlan.length === 0 ? (
                        <p className="text-sm text-slate-500">No plan data available</p>
                      ) : (
                        <div className="space-y-4">
                          {revenueBreakdown.byPlan.map((plan) => (
                            <div key={plan.planName}>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-slate-700">{plan.planName}</span>
                                <span className="text-sm text-slate-500">{plan.percentage.toFixed(1)}%</span>
                              </div>
                              <div className="mt-1 flex items-center gap-3">
                                <div className="h-2 flex-1 rounded-full bg-slate-100">
                                  <div
                                    className="h-2 rounded-full bg-emerald-500"
                                    style={{ width: `${plan.percentage}%` }}
                                  />
                                </div>
                                <span className="w-24 text-right text-sm font-semibold text-slate-900">
                                  {formatCurrency(plan.amount)}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-slate-500">{plan.subscriberCount} active subscribers</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Revenue Trend */}
              {revenueBreakdown && revenueBreakdown.trends.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 p-4">
                    <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                      <TrendingUp className="h-5 w-5" />
                      Revenue Trend
                    </h2>
                  </div>
                  <div className="p-6">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-slate-200">
                            <th className="pb-3 text-left text-sm font-medium text-slate-500">Period</th>
                            <th className="pb-3 text-right text-sm font-medium text-slate-500">Subscriptions</th>
                            <th className="pb-3 text-right text-sm font-medium text-slate-500">One-Time</th>
                            <th className="pb-3 text-right text-sm font-medium text-slate-500">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {revenueBreakdown.trends.map((trend) => (
                            <tr key={trend.period}>
                              <td className="py-3 text-sm text-slate-900">{formatMonth(trend.period)}</td>
                              <td className="py-3 text-right text-sm text-slate-600">
                                {formatCurrency(trend.subscriptions)}
                              </td>
                              <td className="py-3 text-right text-sm text-slate-600">
                                {formatCurrency(trend.oneTime)}
                              </td>
                              <td className="py-3 text-right text-sm font-semibold text-slate-900">
                                {formatCurrency(trend.total)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
