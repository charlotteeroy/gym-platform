'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, DollarSign, ArrowUpRight, Loader2, Users, Zap, Gift, ChevronRight, Star, Target } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';

interface Opportunity {
  id: string;
  type: 'upgrade' | 'personal_training' | 'renewal' | 'addon';
  memberId: string;
  memberName: string;
  memberEmail: string;
  description: string;
  potentialValue: number;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
  createdAt: string;
}

const mockOpportunities: Opportunity[] = [
  {
    id: '1',
    type: 'upgrade',
    memberId: 'member-1',
    memberName: 'Sarah Johnson',
    memberEmail: 'sarah@example.com',
    description: 'Upgrade to Premium',
    potentialValue: 49,
    confidence: 'high',
    reason: 'Visits 5+ times/week, always during peak hours',
    createdAt: '2024-01-14',
  },
  {
    id: '2',
    type: 'personal_training',
    memberId: 'member-2',
    memberName: 'Mike Chen',
    memberEmail: 'mike@example.com',
    description: 'Personal Training Package',
    potentialValue: 299,
    confidence: 'high',
    reason: 'New member, expressed interest in weight loss goals',
    createdAt: '2024-01-13',
  },
  {
    id: '3',
    type: 'renewal',
    memberId: 'member-3',
    memberName: 'Emily Davis',
    memberEmail: 'emily@example.com',
    description: 'Annual Membership Renewal',
    potentialValue: 599,
    confidence: 'medium',
    reason: 'Membership expires in 14 days, loyal member for 2 years',
    createdAt: '2024-01-12',
  },
  {
    id: '4',
    type: 'addon',
    memberId: 'member-4',
    memberName: 'James Wilson',
    memberEmail: 'james@example.com',
    description: 'Nutrition Coaching Add-on',
    potentialValue: 79,
    confidence: 'medium',
    reason: 'Frequently asks staff about diet advice',
    createdAt: '2024-01-11',
  },
  {
    id: '5',
    type: 'upgrade',
    memberId: 'member-5',
    memberName: 'Lisa Anderson',
    memberEmail: 'lisa@example.com',
    description: 'Family Plan Upgrade',
    potentialValue: 89,
    confidence: 'high',
    reason: 'Often brings spouse as guest',
    createdAt: '2024-01-10',
  },
  {
    id: '6',
    type: 'personal_training',
    memberId: 'member-6',
    memberName: 'David Brown',
    memberEmail: 'david@example.com',
    description: 'PT Sessions Bundle',
    potentialValue: 199,
    confidence: 'low',
    reason: 'Plateau in progress, might benefit from coaching',
    createdAt: '2024-01-09',
  },
];

export default function OpportunitiesPage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    setTimeout(() => {
      setOpportunities(mockOpportunities);
      setIsLoading(false);
    }, 500);
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'upgrade':
        return <ArrowUpRight className="h-5 w-5" />;
      case 'personal_training':
        return <Zap className="h-5 w-5" />;
      case 'renewal':
        return <Star className="h-5 w-5" />;
      case 'addon':
        return <Gift className="h-5 w-5" />;
      default:
        return <TrendingUp className="h-5 w-5" />;
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'upgrade':
        return 'bg-indigo-100 text-indigo-600';
      case 'personal_training':
        return 'bg-amber-100 text-amber-600';
      case 'renewal':
        return 'bg-emerald-100 text-emerald-600';
      case 'addon':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const styles = {
      high: 'bg-emerald-100 text-emerald-700',
      medium: 'bg-amber-100 text-amber-700',
      low: 'bg-slate-100 text-slate-600',
    };
    return (
      <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${styles[confidence as keyof typeof styles]}`}>
        {confidence === 'high' ? 'High' : confidence === 'medium' ? 'Medium' : 'Low'} confidence
      </span>
    );
  };

  const filteredOpportunities = filter === 'all'
    ? opportunities
    : opportunities.filter(o => o.type === filter);

  const stats = {
    totalOpportunities: opportunities.length,
    totalValue: opportunities.reduce((sum, o) => sum + o.potentialValue, 0),
    highConfidence: opportunities.filter(o => o.confidence === 'high').length,
    byType: {
      upgrade: opportunities.filter(o => o.type === 'upgrade').length,
      personal_training: opportunities.filter(o => o.type === 'personal_training').length,
      renewal: opportunities.filter(o => o.type === 'renewal').length,
      addon: opportunities.filter(o => o.type === 'addon').length,
    },
  };

  const filters = [
    { key: 'all', label: 'All', count: stats.totalOpportunities },
    { key: 'upgrade', label: 'Upgrades', count: stats.byType.upgrade, color: 'indigo' },
    { key: 'personal_training', label: 'PT', count: stats.byType.personal_training, color: 'amber' },
    { key: 'renewal', label: 'Renewals', count: stats.byType.renewal, color: 'emerald' },
    { key: 'addon', label: 'Add-ons', count: stats.byType.addon, color: 'purple' },
  ];

  return (
    <>
      <Header title="Opportunities" description="Identify upsell and growth opportunities" />

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Target className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{stats.totalOpportunities}</p>
                <p className="text-sm text-slate-500">Opportunities</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">${stats.totalValue}</p>
                <p className="text-sm text-slate-500">Potential Revenue</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{stats.highConfidence}</p>
                <p className="text-sm text-slate-500">High Confidence</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{stats.byType.renewal}</p>
                <p className="text-sm text-slate-500">Renewals Due</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-sm p-2">
          <div className="flex flex-wrap gap-2">
            {filters.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  filter === f.key
                    ? f.key === 'all'
                      ? 'bg-slate-900 text-white'
                      : f.color === 'indigo' ? 'bg-indigo-600 text-white' :
                        f.color === 'amber' ? 'bg-amber-500 text-white' :
                        f.color === 'emerald' ? 'bg-emerald-600 text-white' :
                        'bg-purple-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        </div>

        {/* Opportunities List */}
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          </div>
        ) : filteredOpportunities.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="rounded-2xl bg-slate-100 p-5 mb-4">
                <TrendingUp className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No opportunities found</h3>
              <p className="text-sm text-slate-500 text-center mb-4 max-w-sm">
                {filter === 'all'
                  ? 'Opportunities will appear here as we identify potential upsells.'
                  : 'No opportunities of this type found. Try a different filter.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredOpportunities.map((opportunity) => (
              <button
                key={opportunity.id}
                className="w-full bg-white rounded-2xl shadow-sm hover:shadow-md transition-all p-5 text-left group"
                onClick={() => router.push(`/members/${opportunity.memberId}`)}
              >
                <div className="flex items-start gap-4">
                  {/* Type Icon */}
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${getTypeStyle(opportunity.type)}`}>
                    {getTypeIcon(opportunity.type)}
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div>
                        <h3 className="font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {opportunity.memberName}
                        </h3>
                        <p className="text-sm text-slate-500">{opportunity.memberEmail}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xl font-bold text-emerald-600">${opportunity.potentialValue}</p>
                        <p className="text-xs text-slate-400">/month</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${getTypeStyle(opportunity.type)}`}>
                        {getTypeIcon(opportunity.type)}
                        {opportunity.description}
                      </span>
                      {getConfidenceBadge(opportunity.confidence)}
                    </div>

                    <p className="text-sm text-slate-600">
                      <span className="font-medium text-slate-700">Why:</span> {opportunity.reason}
                    </p>
                  </div>

                  {/* Arrow */}
                  <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-500 transition-colors flex-shrink-0 mt-1" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
