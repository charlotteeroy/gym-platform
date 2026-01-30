'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface AtRiskMember {
  id: string;
  firstName: string;
  lastName: string;
  riskScore: number;
  riskFactors: string[];
  daysInactive: number;
  subscriptionValue: number;
}

interface AtRiskData {
  members: AtRiskMember[];
  summary: {
    totalAtRisk: number;
    monthlyRevenueAtRisk: number;
    redCount: number;
    amberCount: number;
    yellowCount: number;
  };
}

interface EnhancedAtRiskWidgetProps {
  gymId: string;
}

interface Thresholds {
  red: number;
  amber: number;
}

const DEFAULT_THRESHOLDS: Thresholds = { red: 70, amber: 50 };

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);

function getRiskLevel(score: number, thresholds: Thresholds): { label: string; classes: string } {
  if (score >= thresholds.red) return { label: 'High', classes: 'bg-red-100 text-red-700' };
  if (score >= thresholds.amber) return { label: 'Medium', classes: 'bg-amber-100 text-amber-700' };
  return { label: 'Low', classes: 'bg-yellow-100 text-yellow-700' };
}

function getInitials(first: string, last: string) {
  return `${(first?.[0] ?? '').toUpperCase()}${(last?.[0] ?? '').toUpperCase()}`;
}

function loadThresholds(): Thresholds {
  if (typeof window === 'undefined') return DEFAULT_THRESHOLDS;
  try {
    const saved = localStorage.getItem('atRiskThresholds');
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_THRESHOLDS;
}

export default function EnhancedAtRiskWidget({ gymId }: EnhancedAtRiskWidgetProps) {
  const [data, setData] = useState<AtRiskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [thresholds, setThresholds] = useState<Thresholds>(DEFAULT_THRESHOLDS);
  const [showSettings, setShowSettings] = useState(false);
  const [editThresholds, setEditThresholds] = useState<Thresholds>(DEFAULT_THRESHOLDS);

  useEffect(() => {
    const saved = loadThresholds();
    setThresholds(saved);
    setEditThresholds(saved);
  }, []);

  const fetchData = useCallback((t: Thresholds) => {
    setLoading(true);
    fetch(`/api/dashboard/at-risk?limit=20&redMin=${t.red}&amberMin=${t.amber}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setData(json.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData(thresholds);
  }, [thresholds, fetchData]);

  const handleSaveThresholds = () => {
    if (editThresholds.red <= editThresholds.amber) return;
    localStorage.setItem('atRiskThresholds', JSON.stringify(editThresholds));
    setThresholds(editThresholds);
    setShowSettings(false);
  };

  if (loading && !data) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="animate-pulse space-y-3">
          <div className="h-16 bg-slate-200 rounded-xl" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-slate-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const summary = data?.summary;
  const members = data?.members ?? [];

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-800">At-Risk Members</h3>
        <button
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          aria-label="Settings"
          onClick={() => {
            setEditThresholds(thresholds);
            setShowSettings(true);
          }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </div>

      {/* Summary Banner */}
      {summary && (
        <div className="bg-slate-50 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Members at risk</p>
              <p className="text-lg font-bold text-slate-900">
                {summary.totalAtRisk} members ({formatCurrency(summary.monthlyRevenueAtRisk)}/mo)
              </p>
            </div>
            <div className="flex gap-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                {summary.redCount} high
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                {summary.amberCount} medium
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                {summary.yellowCount} low
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Members List */}
      <div className="space-y-2 max-h-[480px] overflow-y-auto">
        {members.map((member) => {
          const risk = getRiskLevel(member.riskScore, thresholds);

          return (
            <div
              key={member.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition"
            >
              {/* Risk badge */}
              <span
                className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold ${risk.classes}`}
              >
                {member.riskScore}
              </span>

              {/* Avatar */}
              <div className="flex-shrink-0 w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-600">
                {getInitials(member.firstName, member.lastName)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 truncate">
                  {member.firstName} {member.lastName}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {member.riskFactors.join(' \u00b7 ')}
                </p>
              </div>

              {/* Metrics */}
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-slate-500">{member.daysInactive}d inactive</p>
                <p className="text-xs font-medium text-slate-700">
                  {formatCurrency(member.subscriptionValue)}/mo
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-1 flex-shrink-0">
                <Link
                  href={`/members/${member.id}`}
                  className="px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100 transition"
                >
                  View
                </Link>
                <a
                  href={`mailto:?subject=We%20miss%20you`}
                  className="px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-md hover:bg-slate-200 transition"
                >
                  Message
                </a>
                <Link
                  href={`/members/${member.id}?action=extend`}
                  className="px-2 py-1 text-xs font-medium text-emerald-600 bg-emerald-50 rounded-md hover:bg-emerald-100 transition"
                >
                  Extend
                </Link>
              </div>
            </div>
          );
        })}

        {members.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">No at-risk members found.</p>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Risk Threshold Settings</h3>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  High Risk (Red) &mdash; score &ge;
                </label>
                <input
                  type="number"
                  value={editThresholds.red}
                  onChange={(e) =>
                    setEditThresholds({ ...editThresholds, red: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  min={1}
                  max={100}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Medium Risk (Amber) &mdash; score &ge;
                </label>
                <input
                  type="number"
                  value={editThresholds.amber}
                  onChange={(e) =>
                    setEditThresholds({ ...editThresholds, amber: parseInt(e.target.value) || 0 })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg mt-1 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  min={1}
                  max={100}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Score {editThresholds.amber}&ndash;{editThresholds.red - 1} = Medium risk. Below {editThresholds.amber} = Low risk.
                </p>
              </div>

              {editThresholds.red <= editThresholds.amber && (
                <p className="text-xs text-red-600">
                  Red threshold must be higher than amber threshold.
                </p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveThresholds}
                disabled={editThresholds.red <= editThresholds.amber}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
