'use client';

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/header';
import { TopOpportunitiesClient } from '@/components/dashboard/opportunities-widget-client';
import Link from 'next/link';
import {
  Users,
  UserCheck,
  UserPlus,
  DoorOpen,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  RefreshCw,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  DollarSign,
  CreditCard,
  FileText,
  Loader2,
} from 'lucide-react';

interface DashboardData {
  metrics: {
    totalMembers: number;
    activeMembers: number;
    newThisMonth: number;
    checkInsToday: number;
    classesToday: number;
  };
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    weekTrend: number;
    monthTrend: number;
    failedPayments: {
      count: number;
      total: number;
      items: Array<{
        id: string;
        amount: number;
        memberName: string;
        memberId: string;
        date: string;
      }>;
    };
    overdueInvoices: {
      count: number;
      total: number;
      items: Array<{
        id: string;
        invoiceNumber: string;
        amount: number;
        memberName: string;
        memberId: string;
        dueDate: string;
        daysOverdue: number;
      }>;
    };
  } | null;
  retention: {
    atRiskMembers: Array<{
      id: string;
      name: string;
      email: string;
      daysSinceLastActivity: number;
      reason: string;
    }>;
    atRiskCount: number;
    expiringSubscriptions: Array<{
      id: string;
      memberId: string;
      memberName: string;
      planName: string;
      expiresAt: string;
      daysUntilExpiry: number;
      autoRenew: boolean;
    }>;
    expiringCount: number;
    progression: {
      movedUp: number;
      movedDown: number;
      maintained: number;
      summary: {
        platinum: number;
        gold: number;
        silver: number;
        bronze: number;
        inactive: number;
      };
      topProgressions: Array<{
        memberId: string;
        memberName: string;
        currentTier: string;
        previousTier: string;
        currentVisits: number;
      }>;
    };
  };
  today: {
    classes: Array<{
      id: string;
      time: string;
      name: string;
      instructor: string;
      booked: number;
      capacity: number;
      percentFull: number;
    }>;
    totalBookings: number;
    newMembers: Array<{
      id: string;
      name: string;
      email: string;
      joinedAt: string;
    }>;
  };
  traffic: {
    totalVisits30Days: number;
    peakHours: Array<{ hour: number; label: string; count: number; percentage: number }>;
    busiestDays: Array<{ day: string; count: number; percentage: number }>;
  };
  health: {
    score: number;
    status: 'healthy' | 'warning' | 'critical';
    factors: {
      memberRetention: number;
      subscriptionHealth: number;
      classEngagement: number;
      revenueStability: number;
    };
  };
  alerts: Array<{
    title: string;
    description: string;
    severity: 'info' | 'warning' | 'critical';
  }>;
  staffRole: string;
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/dashboard/summary');
      const result = await response.json();
      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error?.message || 'Failed to load dashboard');
      }
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl">
          {error || 'Failed to load dashboard'}
        </div>
      </div>
    );
  }

  const canSeeRevenue = ['OWNER', 'ADMIN'].includes(data.staffRole);

  return (
    <>
      <Header
        title={`Good ${getTimeOfDay()}!`}
        description="Here's your gym at a glance"
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* Business Health Score - Full Width */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              {/* Health Score Circle */}
              <div className="relative w-20 h-20 flex-shrink-0">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r="34" stroke="#e2e8f0" strokeWidth="6" fill="none" />
                  <circle
                    cx="40" cy="40" r="34"
                    stroke={data.health.status === 'healthy' ? '#10b981' : data.health.status === 'warning' ? '#f59e0b' : '#ef4444'}
                    strokeWidth="6"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${data.health.score * 2.14} 214`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-slate-900">{data.health.score}</span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-semibold text-slate-900">Business Health</h2>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    data.health.status === 'healthy' ? 'bg-emerald-100 text-emerald-700' :
                    data.health.status === 'warning' ? 'bg-amber-100 text-amber-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {data.health.status === 'healthy' ? 'Healthy' : data.health.status === 'warning' ? 'Needs Attention' : 'Critical'}
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  {data.metrics.classesToday} classes today • {data.today.totalBookings} spots booked
                  {data.retention.atRiskCount > 0 && ` • ${data.retention.atRiskCount} members need attention`}
                </p>
              </div>
            </div>

            {/* Health Factors */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { name: 'Retention', value: data.health.factors.memberRetention },
                { name: 'Subscriptions', value: data.health.factors.subscriptionHealth },
                { name: 'Classes', value: data.health.factors.classEngagement },
                { name: 'Revenue', value: data.health.factors.revenueStability },
              ].map((factor) => (
                <div key={factor.name} className="text-center">
                  <div className={`text-lg font-bold ${
                    factor.value >= 75 ? 'text-emerald-600' :
                    factor.value >= 50 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {factor.value}%
                  </div>
                  <div className="text-xs text-slate-500">{factor.name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Key Metrics & Revenue Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Key Metrics */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Key Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <MetricCard
                icon={<Users className="w-5 h-5 text-indigo-600" />}
                iconBg="bg-indigo-100"
                value={data.metrics.totalMembers}
                label="Total Members"
              />
              <MetricCard
                icon={<UserCheck className="w-5 h-5 text-emerald-600" />}
                iconBg="bg-emerald-100"
                value={data.metrics.activeMembers}
                label="Active Members"
              />
              <MetricCard
                icon={<UserPlus className="w-5 h-5 text-blue-600" />}
                iconBg="bg-blue-100"
                value={data.metrics.newThisMonth}
                label="New This Month"
              />
              <MetricCard
                icon={<DoorOpen className="w-5 h-5 text-amber-600" />}
                iconBg="bg-amber-100"
                value={data.metrics.checkInsToday}
                label="Check-ins Today"
              />
            </div>
          </div>

          {/* Revenue Section (Owner/Admin only) */}
          {canSeeRevenue && data.revenue && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Revenue</h3>
                <Link href="/admin/billing" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                  View All <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="space-y-4">
                {/* Revenue Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.revenue.today)}</p>
                    <p className="text-xs text-slate-500">Today</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.revenue.thisWeek)}</p>
                      <TrendIndicator value={data.revenue.weekTrend} />
                    </div>
                    <p className="text-xs text-slate-500">This Week</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.revenue.thisMonth)}</p>
                      <TrendIndicator value={data.revenue.monthTrend} />
                    </div>
                    <p className="text-xs text-slate-500">This Month</p>
                  </div>
                </div>

                {/* Alerts */}
                {(data.revenue.failedPayments.count > 0 || data.revenue.overdueInvoices.count > 0) && (
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    {data.revenue.failedPayments.count > 0 && (
                      <Link
                        href="/admin/billing/payments?tab=failed"
                        className="flex items-center justify-between p-3 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-red-600" />
                          <span className="text-sm font-medium text-red-700">
                            {data.revenue.failedPayments.count} failed payment{data.revenue.failedPayments.count > 1 ? 's' : ''}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-red-700">
                          {formatCurrency(data.revenue.failedPayments.total)}
                        </span>
                      </Link>
                    )}
                    {data.revenue.overdueInvoices.count > 0 && (
                      <Link
                        href="/admin/billing/invoices?status=OVERDUE"
                        className="flex items-center justify-between p-3 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-700">
                            {data.revenue.overdueInvoices.count} overdue invoice{data.revenue.overdueInvoices.count > 1 ? 's' : ''}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-amber-700">
                          {formatCurrency(data.revenue.overdueInvoices.total)}
                        </span>
                      </Link>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Traffic Patterns (show if not admin) */}
          {!canSeeRevenue && (
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h3 className="font-semibold text-slate-800 mb-4">Traffic Patterns</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500 mb-2">Peak Hours</p>
                  <div className="space-y-2">
                    {data.traffic.peakHours.map((hour, i) => (
                      <div key={hour.hour} className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>{i + 1}</span>
                        <span className="text-sm font-medium text-slate-700">{hour.label}</span>
                        <span className="text-xs text-slate-400 ml-auto">{hour.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-2">Busiest Days</p>
                  <div className="space-y-2">
                    {data.traffic.busiestDays.map((day, i) => (
                      <div key={day.day} className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          i === 0 ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>{i + 1}</span>
                        <span className="text-sm font-medium text-slate-700">{day.day}</span>
                        <span className="text-xs text-slate-400 ml-auto">{day.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Retention & Traffic Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Member Retention */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Member Retention</h3>
              <Link href="/members?activityLevel=declining" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                View All <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Tier Progression Summary */}
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-emerald-600">{data.retention.progression.movedUp}</p>
                  <p className="text-xs text-slate-500">Moved up</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                  <ArrowDownRight className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-red-600">{data.retention.progression.movedDown}</p>
                  <p className="text-xs text-slate-500">Moved down</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                  <Minus className="w-4 h-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-600">{data.retention.progression.maintained}</p>
                  <p className="text-xs text-slate-500">Maintained</p>
                </div>
              </div>
            </div>

            {/* Tier Distribution */}
            <div className="flex items-center gap-1 mb-4">
              {data.retention.progression.summary.platinum > 0 && (
                <div
                  className="h-2 rounded-full bg-purple-500"
                  style={{ width: `${(data.retention.progression.summary.platinum / data.metrics.activeMembers) * 100}%` }}
                  title={`Platinum: ${data.retention.progression.summary.platinum}`}
                />
              )}
              {data.retention.progression.summary.gold > 0 && (
                <div
                  className="h-2 rounded-full bg-amber-500"
                  style={{ width: `${(data.retention.progression.summary.gold / data.metrics.activeMembers) * 100}%` }}
                  title={`Gold: ${data.retention.progression.summary.gold}`}
                />
              )}
              {data.retention.progression.summary.silver > 0 && (
                <div
                  className="h-2 rounded-full bg-slate-400"
                  style={{ width: `${(data.retention.progression.summary.silver / data.metrics.activeMembers) * 100}%` }}
                  title={`Silver: ${data.retention.progression.summary.silver}`}
                />
              )}
              {data.retention.progression.summary.bronze > 0 && (
                <div
                  className="h-2 rounded-full bg-orange-400"
                  style={{ width: `${(data.retention.progression.summary.bronze / data.metrics.activeMembers) * 100}%` }}
                  title={`Bronze: ${data.retention.progression.summary.bronze}`}
                />
              )}
              {data.retention.progression.summary.inactive > 0 && (
                <div
                  className="h-2 rounded-full bg-red-400"
                  style={{ width: `${(data.retention.progression.summary.inactive / data.metrics.activeMembers) * 100}%` }}
                  title={`Inactive: ${data.retention.progression.summary.inactive}`}
                />
              )}
            </div>

            {/* At-Risk Members */}
            {data.retention.atRiskCount > 0 && (
              <div className="bg-amber-50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-700">
                    {data.retention.atRiskCount} member{data.retention.atRiskCount > 1 ? 's' : ''} need attention
                  </span>
                </div>
                <div className="space-y-2">
                  {data.retention.atRiskMembers.slice(0, 3).map((member) => (
                    <Link
                      key={member.id}
                      href={`/members/${member.id}`}
                      className="flex items-center justify-between text-sm hover:bg-amber-100 rounded-lg p-1.5 -mx-1.5 transition-colors"
                    >
                      <span className="text-slate-700">{member.name}</span>
                      <span className="text-amber-600 text-xs">{member.daysSinceLastActivity}d ago</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Today's Classes */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">Today's Classes</h3>
              <Link href="/dashboard/classes" className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                View Schedule <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {data.today.classes.length === 0 ? (
              <p className="text-slate-500 text-sm">No classes scheduled today</p>
            ) : (
              <div className="space-y-3">
                {data.today.classes.slice(0, 5).map((cls) => (
                  <div key={cls.id} className="flex items-center gap-3">
                    <div className="text-sm font-medium text-slate-500 w-16">
                      {formatTime(cls.time)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 truncate">{cls.name}</p>
                      <p className="text-xs text-slate-500">{cls.instructor}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            cls.percentFull >= 90 ? 'bg-red-500' :
                            cls.percentFull >= 70 ? 'bg-amber-500' :
                            cls.percentFull >= 30 ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                          style={{ width: `${cls.percentFull}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium ${
                        cls.percentFull >= 90 ? 'text-red-600' : 'text-slate-500'
                      }`}>
                        {cls.booked}/{cls.capacity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* New Members */}
            {data.today.newMembers.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-500 mb-2">New members to welcome</p>
                <div className="space-y-2">
                  {data.today.newMembers.map((member) => (
                    <Link
                      key={member.id}
                      href={`/members/${member.id}`}
                      className="flex items-center gap-2 text-sm hover:bg-slate-50 rounded-lg p-2 -mx-2 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{member.name}</p>
                      </div>
                      <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">New</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Alerts */}
        {data.alerts.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">Alerts</h3>
            <div className="space-y-3">
              {data.alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-xl ${
                    alert.severity === 'critical' ? 'bg-red-50' :
                    alert.severity === 'warning' ? 'bg-amber-50' : 'bg-blue-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    alert.severity === 'critical' ? 'bg-red-100' :
                    alert.severity === 'warning' ? 'bg-amber-100' : 'bg-blue-100'
                  }`}>
                    <AlertTriangle className={`w-4 h-4 ${
                      alert.severity === 'critical' ? 'text-red-600' :
                      alert.severity === 'warning' ? 'text-amber-600' : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{alert.title}</p>
                    <p className="text-sm text-slate-600">{alert.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Traffic Patterns (for admin users, moved lower) */}
        {canSeeRevenue && data.traffic.totalVisits30Days > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {/* Peak Hours */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-600" />
                  Peak Hours
                </h3>
              </div>
              <div className="p-5">
                <div className="space-y-4">
                  {data.traffic.peakHours.map((hour, index) => (
                    <div key={hour.hour} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-amber-500 text-white' :
                        index === 1 ? 'bg-slate-200 text-slate-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-900">{hour.label}</span>
                          <span className="text-sm font-bold text-amber-600">{hour.percentage}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              index === 0 ? 'bg-amber-500' : index === 1 ? 'bg-amber-400' : 'bg-amber-300'
                            }`}
                            style={{ width: `${Math.max(hour.percentage * 2, 8)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-4">Based on {data.traffic.totalVisits30Days} check-ins (30 days)</p>
              </div>
            </div>

            {/* Peak Days */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  Busiest Days
                </h3>
              </div>
              <div className="p-5">
                <div className="space-y-4">
                  {data.traffic.busiestDays.map((dayData, index) => (
                    <div key={dayData.day} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-blue-500 text-white' :
                        index === 1 ? 'bg-slate-200 text-slate-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-900">{dayData.day}</span>
                          <span className="text-sm font-bold text-blue-600">{dayData.percentage}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              index === 0 ? 'bg-blue-500' : index === 1 ? 'bg-blue-400' : 'bg-blue-300'
                            }`}
                            style={{ width: `${Math.max(dayData.percentage * 2, 8)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-4">{data.traffic.busiestDays[0]?.day} sees the most traffic</p>
              </div>
            </div>
          </div>
        )}

        {/* Opportunities */}
        <TopOpportunitiesClient />
      </div>
    </>
  );
}

function MetricCard({
  icon,
  iconBg,
  value,
  label,
}: {
  icon: React.ReactNode;
  iconBg: string;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
      <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function TrendIndicator({ value }: { value: number }) {
  if (value === 0) return null;

  return (
    <span className={`flex items-center text-xs font-medium ${
      value > 0 ? 'text-emerald-600' : 'text-red-600'
    }`}>
      {value > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {Math.abs(value)}%
    </span>
  );
}
