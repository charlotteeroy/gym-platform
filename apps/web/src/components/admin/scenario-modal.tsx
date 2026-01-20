'use client';

import { useState, useEffect } from 'react';
import {
  X,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Percent,
  Calculator,
  RefreshCw,
  ArrowRight,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMetrics: {
    currentMRR: number;
    activeSubscriptions: number;
    avgRevenuePerMember: number;
    churnRateThisMonth: number;
    newSignupsPerMonth: number;
  };
  baselineProjection90Day: number;
}

interface Scenario {
  churnRate: number;
  newSignups: number;
  avgPlanValue: number;
}

export function ScenarioModal({
  isOpen,
  onClose,
  currentMetrics,
  baselineProjection90Day,
}: ScenarioModalProps) {
  const [scenario, setScenario] = useState<Scenario>({
    churnRate: currentMetrics.churnRateThisMonth,
    newSignups: currentMetrics.newSignupsPerMonth,
    avgPlanValue: currentMetrics.avgRevenuePerMember,
  });

  const [projectedRevenue, setProjectedRevenue] = useState(baselineProjection90Day);

  // Reset scenario when modal opens
  useEffect(() => {
    if (isOpen) {
      setScenario({
        churnRate: currentMetrics.churnRateThisMonth,
        newSignups: currentMetrics.newSignupsPerMonth,
        avgPlanValue: currentMetrics.avgRevenuePerMember,
      });
    }
  }, [isOpen, currentMetrics]);

  // Calculate projected revenue when scenario changes
  useEffect(() => {
    const monthlyChurnMembers = (currentMetrics.activeSubscriptions * scenario.churnRate) / 100;
    const netMemberChange = scenario.newSignups - monthlyChurnMembers;

    // Project 90 days (3 months)
    let members = currentMetrics.activeSubscriptions;
    let totalRevenue = 0;

    for (let month = 1; month <= 3; month++) {
      members = members + netMemberChange;
      totalRevenue += members * scenario.avgPlanValue;
    }

    setProjectedRevenue(totalRevenue);
  }, [scenario, currentMetrics]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const revenueChange = projectedRevenue - baselineProjection90Day;
  const revenueChangePercent = baselineProjection90Day > 0
    ? (revenueChange / baselineProjection90Day) * 100
    : 0;

  const resetScenario = () => {
    setScenario({
      churnRate: currentMetrics.churnRateThisMonth,
      newSignups: currentMetrics.newSignupsPerMonth,
      avgPlanValue: currentMetrics.avgRevenuePerMember,
    });
  };

  // Calculate individual impacts
  const calculateImpact = () => {
    const churnDiff = currentMetrics.churnRateThisMonth - scenario.churnRate;
    const signupDiff = scenario.newSignups - currentMetrics.newSignupsPerMonth;
    const priceDiff = scenario.avgPlanValue - currentMetrics.avgRevenuePerMember;

    // Rough impact calculations
    const churnImpact = (churnDiff / 100) * currentMetrics.activeSubscriptions * currentMetrics.avgRevenuePerMember * 3;
    const signupImpact = signupDiff * scenario.avgPlanValue * 3;
    const priceImpact = priceDiff * currentMetrics.activeSubscriptions * 3;

    return { churnImpact, signupImpact, priceImpact };
  };

  const impacts = calculateImpact();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Calculator className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">What-If Scenario Analysis</h2>
              <p className="text-sm text-slate-500">Adjust parameters to see projected impact</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Sliders */}
        <div className="p-6 space-y-6">
          {/* Churn Rate Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Percent className="w-4 h-4 text-amber-500" />
                Monthly Churn Rate
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">
                  Current: {currentMetrics.churnRateThisMonth.toFixed(1)}%
                </span>
                <span className="text-sm font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                  {scenario.churnRate.toFixed(1)}%
                </span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              step="0.5"
              value={scenario.churnRate}
              onChange={(e) => setScenario({ ...scenario, churnRate: parseFloat(e.target.value) })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>0%</span>
              <span>15%</span>
            </div>
          </div>

          {/* New Signups Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Users className="w-4 h-4 text-emerald-500" />
                New Signups per Month
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">
                  Current: {currentMetrics.newSignupsPerMonth}
                </span>
                <span className="text-sm font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                  {scenario.newSignups}
                </span>
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="50"
              step="1"
              value={scenario.newSignups}
              onChange={(e) => setScenario({ ...scenario, newSignups: parseInt(e.target.value) })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>0</span>
              <span>50</span>
            </div>
          </div>

          {/* Avg Plan Value Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <DollarSign className="w-4 h-4 text-blue-500" />
                Average Plan Value
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">
                  Current: {formatCurrency(currentMetrics.avgRevenuePerMember)}
                </span>
                <span className="text-sm font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                  {formatCurrency(scenario.avgPlanValue)}
                </span>
              </div>
            </div>
            <input
              type="range"
              min="20"
              max="300"
              step="5"
              value={scenario.avgPlanValue}
              onChange={(e) => setScenario({ ...scenario, avgPlanValue: parseFloat(e.target.value) })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>$20</span>
              <span>$300</span>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="px-6 pb-6">
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <h3 className="text-sm font-medium text-slate-700 mb-4">Projected Impact (90 days)</h3>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="bg-white rounded-lg p-4 border border-slate-200">
                <p className="text-xs text-slate-500 mb-1">Current Trajectory</p>
                <p className="text-xl font-bold text-slate-700">{formatCurrency(baselineProjection90Day)}</p>
              </div>
              <div className={`rounded-lg p-4 border ${revenueChange >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <p className="text-xs text-slate-500 mb-1">With Changes</p>
                <div className="flex items-baseline gap-2">
                  <p className={`text-xl font-bold ${revenueChange >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {formatCurrency(projectedRevenue)}
                  </p>
                  <span className={`text-sm font-medium ${revenueChange >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {revenueChange >= 0 ? '+' : ''}{formatCurrency(revenueChange)} ({revenueChangePercent >= 0 ? '+' : ''}{revenueChangePercent.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>

            {/* Impact Breakdown */}
            <div className="space-y-2">
              <h4 className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Info className="w-3 h-3" />
                Breakdown
              </h4>

              {impacts.churnImpact !== 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Churn rate change</span>
                  <span className={impacts.churnImpact >= 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                    {impacts.churnImpact >= 0 ? '+' : ''}{formatCurrency(impacts.churnImpact)}
                  </span>
                </div>
              )}

              {impacts.signupImpact !== 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Additional signups</span>
                  <span className={impacts.signupImpact >= 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                    {impacts.signupImpact >= 0 ? '+' : ''}{formatCurrency(impacts.signupImpact)}
                  </span>
                </div>
              )}

              {impacts.priceImpact !== 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Plan value change</span>
                  <span className={impacts.priceImpact >= 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                    {impacts.priceImpact >= 0 ? '+' : ''}{formatCurrency(impacts.priceImpact)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between bg-slate-50 rounded-b-2xl">
          <Button variant="ghost" onClick={resetScenario} className="text-slate-600">
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset to Current
          </Button>
          <Button onClick={onClose} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
