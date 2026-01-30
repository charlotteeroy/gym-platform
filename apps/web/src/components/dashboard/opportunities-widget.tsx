'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrendingUp, ArrowRight, Sparkles } from 'lucide-react';

interface TopOpportunitiesProps {
  gymId: string;
}

interface Opportunity {
  id: string;
  memberId: string;
  type: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  potentialValue: number | string;
  member: {
    firstName: string;
    lastName: string;
  };
}

const confidenceColors: Record<string, string> = {
  HIGH: 'bg-emerald-100 text-emerald-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-slate-100 text-slate-600',
};

const typeIcons: Record<string, string> = {
  UPGRADE: '\u{1F4C8}',
  PERSONAL_TRAINING: '\u{1F4AA}',
  RENEWAL: '\u{1F504}',
  ADDON: '\u{2795}',
  CROSS_SELL: '\u{1F3AF}',
};

const typeLabels: Record<string, string> = {
  UPGRADE: 'Upgrade',
  PERSONAL_TRAINING: 'PT',
  RENEWAL: 'Renewal',
  ADDON: 'Add-on',
  CROSS_SELL: 'Cross-sell',
};

export function TopOpportunities({ gymId }: TopOpportunitiesProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/opportunities?limit=5&statuses=NEW,CONTACTED,FOLLOW_UP')
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success) {
          const items = json.data?.opportunities || json.data || [];
          setOpportunities(Array.isArray(items) ? items.slice(0, 5) : []);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [gymId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          Top Opportunities
        </h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (opportunities.length === 0) return null;

  const totalValue = opportunities.reduce(
    (sum, opp) => sum + Number(opp.potentialValue),
    0
  );

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Top Opportunities
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-600">
              ${totalValue.toLocaleString()} potential
            </span>
            <Link
              href="/opportunities"
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {opportunities.map((opportunity) => (
          <Link
            key={opportunity.id}
            href={`/members/${opportunity.memberId}`}
            className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-medium text-sm flex-shrink-0">
              {opportunity.member.firstName[0]}
              {opportunity.member.lastName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-900 truncate">
                  {opportunity.member.firstName} {opportunity.member.lastName}
                </p>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${confidenceColors[opportunity.confidence] || ''}`}>
                  {opportunity.confidence}
                </span>
              </div>
              <p className="text-sm text-slate-500 truncate">{opportunity.title}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <div className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                <TrendingUp className="w-4 h-4" />
                ${Number(opportunity.potentialValue).toLocaleString()}
              </div>
              <p className="text-xs text-slate-400">
                {typeIcons[opportunity.type] || ''} {typeLabels[opportunity.type] || opportunity.type}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
