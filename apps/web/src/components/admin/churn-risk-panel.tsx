'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
  Users,
  DollarSign,
  Calendar,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  UserMinus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChurnMetrics {
  atRiskCount: number;
  atRiskRevenue: number;
  scheduledCancellations: number;
  scheduledCancellationRevenue: number;
  churnRateThisMonth: number;
  churnRateTrend: 'up' | 'down' | 'stable';
  historicalChurnRate: number;
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

interface ChurnRiskPanelProps {
  churn: ChurnMetrics;
  atRiskMembers: ChurnRiskMember[];
  isLoading?: boolean;
}

export function ChurnRiskPanel({ churn, atRiskMembers, isLoading }: ChurnRiskPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getRiskBadge = (score: number) => {
    if (score >= 70) {
      return {
        label: 'High Risk',
        color: 'bg-red-100 text-red-700 border-red-200',
        dot: 'bg-red-500',
      };
    }
    if (score >= 40) {
      return {
        label: 'Medium Risk',
        color: 'bg-amber-100 text-amber-700 border-amber-200',
        dot: 'bg-amber-500',
      };
    }
    return {
      label: 'Low Risk',
      color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
    };
  };

  const getTrendIcon = () => {
    if (churn.churnRateTrend === 'up') {
      return <TrendingUp className="w-4 h-4 text-red-500" />;
    }
    if (churn.churnRateTrend === 'down') {
      return <TrendingDown className="w-4 h-4 text-emerald-500" />;
    }
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  const getTrendText = () => {
    const diff = Math.abs(churn.churnRateThisMonth - churn.historicalChurnRate);
    if (churn.churnRateTrend === 'up') {
      return `+${diff.toFixed(1)}% from avg`;
    }
    if (churn.churnRateTrend === 'down') {
      return `-${diff.toFixed(1)}% from avg`;
    }
    return 'Stable';
  };

  const getRiskFactorIcon = (factor: string) => {
    if (factor.includes('activity') || factor.includes('check-in')) {
      return <Clock className="w-3 h-3" />;
    }
    if (factor.includes('payment') || factor.includes('due')) {
      return <CreditCard className="w-3 h-3" />;
    }
    if (factor.includes('cancel')) {
      return <UserMinus className="w-3 h-3" />;
    }
    return <AlertTriangle className="w-3 h-3" />;
  };

  const displayedMembers = isExpanded ? atRiskMembers : atRiskMembers.slice(0, 5);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-5 animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-xl" />
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-slate-100 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Churn Risk Analysis</h3>
            <p className="text-xs text-slate-500">Members showing signs of disengagement</p>
          </div>
        </div>
        <Link href="/members?filter=at-risk">
          <Button variant="ghost" size="sm" className="text-slate-600">
            View All <ArrowRight className="ml-1 w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* Metrics Grid */}
      <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 border-b border-slate-100">
        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-slate-500">At-Risk Members</span>
          </div>
          <p className="text-xl font-bold text-slate-900">{churn.atRiskCount}</p>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-4 h-4 text-amber-500" />
            <span className="text-xs text-slate-500">At-Risk Revenue</span>
          </div>
          <p className="text-xl font-bold text-red-600">{formatCurrency(churn.atRiskRevenue)}</p>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-red-500" />
            <span className="text-xs text-slate-500">Scheduled Cancels</span>
          </div>
          <p className="text-xl font-bold text-slate-900">{churn.scheduledCancellations}</p>
          <p className="text-xs text-slate-500">{formatCurrency(churn.scheduledCancellationRevenue)}</p>
        </div>

        <div className="bg-white rounded-xl p-3 border border-slate-200">
          <div className="flex items-center gap-2 mb-1">
            {getTrendIcon()}
            <span className="text-xs text-slate-500">Churn Rate</span>
          </div>
          <p className="text-xl font-bold text-slate-900">{churn.churnRateThisMonth.toFixed(1)}%</p>
          <p className={`text-xs ${churn.churnRateTrend === 'up' ? 'text-red-500' : churn.churnRateTrend === 'down' ? 'text-emerald-500' : 'text-slate-500'}`}>
            {getTrendText()}
          </p>
        </div>
      </div>

      {/* At-Risk Members List */}
      <div className="p-5">
        <h4 className="text-sm font-medium text-slate-700 mb-3">Top At-Risk Members</h4>

        {atRiskMembers.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm text-slate-600">No at-risk members detected</p>
            <p className="text-xs text-slate-400 mt-1">Your members are engaged!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedMembers.map((member) => {
              const badge = getRiskBadge(member.riskScore);
              return (
                <Link
                  key={member.id}
                  href={`/members/${member.id}`}
                  className="block p-3 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-slate-600">
                            {member.firstName[0]}{member.lastName[0]}
                          </span>
                        </div>
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${badge.dot}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900 truncate">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="text-xs text-slate-500 truncate">{member.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full border ${badge.color}`}>
                        {member.riskScore}/100
                      </span>
                      <span className="text-sm font-medium text-slate-700">
                        {formatCurrency(member.subscriptionValue)}/mo
                      </span>
                    </div>
                  </div>

                  {/* Risk Factors */}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {member.riskFactors.slice(0, 3).map((factor, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full"
                      >
                        {getRiskFactorIcon(factor)}
                        {factor}
                      </span>
                    ))}
                    {member.cancelAtPeriodEnd && (
                      <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                        <Calendar className="w-3 h-3" />
                        Cancels {formatDate(member.subscriptionEnds)}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}

            {atRiskMembers.length > 5 && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 flex items-center justify-center gap-1"
              >
                {isExpanded ? (
                  <>
                    Show Less <ChevronUp className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Show {atRiskMembers.length - 5} More <ChevronDown className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
