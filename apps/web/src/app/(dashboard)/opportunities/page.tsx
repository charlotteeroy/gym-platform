'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  Loader2,
  Users,
  Zap,
  Gift,
  ChevronRight,
  Star,
  Target,
  RefreshCw,
  Check,
  X,
  Phone,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Filter,
  Clock,
  Send,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { SendOfferModal } from '@/components/opportunities/send-offer-modal';

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string;
}

interface Opportunity {
  id: string;
  type: 'UPGRADE' | 'PERSONAL_TRAINING' | 'RENEWAL' | 'ADDON' | 'CROSS_SELL';
  status: 'NEW' | 'CONTACTED' | 'FOLLOW_UP' | 'WON' | 'LOST' | 'DISMISSED' | 'EXPIRED';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string | null;
  reason: string;
  potentialValue: number;
  recommendedAction: string;
  recommendedProduct: string | null;
  detectedAt: string;
  expiresAt: string | null;
  contactedAt: string | null;
  member: Member;
  targetPlan?: { id: string; name: string; priceAmount: number } | null;
  targetProduct?: { id: string; name: string; priceAmount: number } | null;
}

// Cooling off period in days - don't show recently contacted members
const COOLING_OFF_DAYS = 5;

// Check if member was recently contacted
function isRecentlyContacted(opportunity: Opportunity): boolean {
  if (!opportunity.contactedAt) return false;
  const contactedDate = new Date(opportunity.contactedAt);
  const daysSinceContact = Math.floor((Date.now() - contactedDate.getTime()) / (1000 * 60 * 60 * 24));
  return daysSinceContact < COOLING_OFF_DAYS;
}


// Calculate priority score for an opportunity (0-100)
function calculatePriority(opportunity: Opportunity, maxValue: number): number {
  let score = 0;

  // Confidence: HIGH = 30pts, MEDIUM = 18pts, LOW = 8pts
  const confidenceScores = { HIGH: 30, MEDIUM: 18, LOW: 8 };
  score += confidenceScores[opportunity.confidence] || 0;

  // Value: Up to 25pts based on relative value
  if (maxValue > 0) {
    score += Math.round((Number(opportunity.potentialValue) / maxValue) * 25);
  }

  // Type urgency: Renewals are time-sensitive
  const typeScores = { RENEWAL: 20, UPGRADE: 12, PERSONAL_TRAINING: 10, ADDON: 8, CROSS_SELL: 5 };
  score += typeScores[opportunity.type] || 5;

  // Expiration urgency: Up to 15pts if expiring soon
  if (opportunity.expiresAt) {
    const daysUntilExpiry = Math.floor(
      (new Date(opportunity.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilExpiry <= 3) score += 15;
    else if (daysUntilExpiry <= 7) score += 10;
    else if (daysUntilExpiry <= 14) score += 5;
  }

  // Status: NEW gets priority, FOLLOW_UP needs attention
  const statusScores = { NEW: 10, FOLLOW_UP: 8, CONTACTED: 3 };
  score += statusScores[opportunity.status as keyof typeof statusScores] || 0;

  return Math.min(100, score);
}

function getPriorityLabel(score: number): { label: string; color: string; icon: string } {
  if (score >= 75) return { label: 'Hot', color: 'bg-red-100 text-red-700 border-red-200', icon: '🔥' };
  if (score >= 55) return { label: 'High', color: 'bg-orange-100 text-orange-700 border-orange-200', icon: '⚡' };
  if (score >= 35) return { label: 'Medium', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: '📊' };
  return { label: 'Low', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: '📋' };
}

interface Summary {
  totalOpportunities: number;
  totalPotentialValue: number;
  byType: Record<string, { count: number; value: number }>;
  byConfidence: Record<string, { count: number; value: number }>;
  byStatus: Record<string, number>;
  conversionRate: number;
  avgDaysToConvert: number;
}

export default function OpportunitiesPage() {
  const router = useRouter();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showActions, setShowActions] = useState<string | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);

  const fetchOpportunities = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();

      if (filter !== 'all') {
        params.set('types', filter);
      }

      if (statusFilter === 'active') {
        params.set('statuses', 'NEW,CONTACTED,FOLLOW_UP');
      } else if (statusFilter !== 'all') {
        params.set('statuses', statusFilter);
      }

      const response = await fetch(`/api/opportunities?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        const items = data.data.items as Opportunity[];

        // Filter out recently contacted members (cooling off period)
        const availableItems = items.filter(o => !isRecentlyContacted(o));

        // Calculate max value for normalization
        const maxValue = Math.max(...availableItems.map((o: Opportunity) => Number(o.potentialValue)), 1);

        // Sort by priority score (descending)
        const sortedItems = [...availableItems].sort((a, b) => {
          const priorityA = calculatePriority(a, maxValue);
          const priorityB = calculatePriority(b, maxValue);
          return priorityB - priorityA;
        });

        setOpportunities(sortedItems);
        setSummary(data.data.summary);
      }
    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter, statusFilter]);

  useEffect(() => {
    fetchOpportunities();
  }, [fetchOpportunities]);

  const scanForOpportunities = async () => {
    try {
      setIsScanning(true);
      const response = await fetch('/api/opportunities', { method: 'POST' });
      const data = await response.json();

      if (data.success) {
        await fetchOpportunities();
      }
    } catch (error) {
      console.error('Failed to scan for opportunities:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const updateStatus = async (id: string, status: string, contactMethod?: string) => {
    try {
      setUpdatingId(id);
      const response = await fetch(`/api/opportunities/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, contactMethod }),
      });

      if (response.ok) {
        await fetchOpportunities();
      }
    } catch (error) {
      console.error('Failed to update opportunity:', error);
    } finally {
      setUpdatingId(null);
      setShowActions(null);
    }
  };

  const openOfferModal = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setIsOfferModalOpen(true);
  };

  const closeOfferModal = () => {
    setIsOfferModalOpen(false);
    setSelectedOpportunity(null);
  };

  const handleSendOffer = async (data: {
    opportunityId: string;
    channel: string;
    message: string;
    followUpDate: string | null;
    subject?: string;
  }) => {
    // Log the action to the API
    await fetch(`/api/opportunities/${data.opportunityId}/actions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: `${data.channel}_sent`,
        notes: `Subject: ${data.subject || 'N/A'}\n\nMessage:\n${data.message}${data.followUpDate ? `\n\nFollow-up scheduled: ${data.followUpDate}` : ''}`,
      }),
    });

    // Update status to CONTACTED
    await updateStatus(data.opportunityId, 'CONTACTED', data.channel);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'UPGRADE':
        return <ArrowUpRight className="h-5 w-5" />;
      case 'PERSONAL_TRAINING':
        return <Zap className="h-5 w-5" />;
      case 'RENEWAL':
        return <Star className="h-5 w-5" />;
      case 'ADDON':
        return <Gift className="h-5 w-5" />;
      default:
        return <TrendingUp className="h-5 w-5" />;
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'UPGRADE':
        return 'bg-indigo-100 text-indigo-600';
      case 'PERSONAL_TRAINING':
        return 'bg-amber-100 text-amber-600';
      case 'RENEWAL':
        return 'bg-emerald-100 text-emerald-600';
      case 'ADDON':
        return 'bg-purple-100 text-purple-600';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'UPGRADE': return 'Upgrade';
      case 'PERSONAL_TRAINING': return 'Personal Training';
      case 'RENEWAL': return 'Renewal';
      case 'ADDON': return 'Add-on';
      case 'CROSS_SELL': return 'Cross-sell';
      default: return type;
    }
  };

  const getConfidenceBadge = (confidence: string) => {
    const styles = {
      HIGH: 'bg-emerald-100 text-emerald-700',
      MEDIUM: 'bg-amber-100 text-amber-700',
      LOW: 'bg-slate-100 text-slate-600',
    };
    return (
      <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${styles[confidence as keyof typeof styles]}`}>
        {confidence === 'HIGH' ? 'High' : confidence === 'MEDIUM' ? 'Medium' : 'Low'} confidence
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      NEW: 'bg-blue-100 text-blue-700',
      CONTACTED: 'bg-indigo-100 text-indigo-700',
      FOLLOW_UP: 'bg-amber-100 text-amber-700',
      WON: 'bg-emerald-100 text-emerald-700',
      LOST: 'bg-red-100 text-red-700',
      DISMISSED: 'bg-slate-100 text-slate-600',
      EXPIRED: 'bg-slate-100 text-slate-500',
    };
    return (
      <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
        {status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ')}
      </span>
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const stats = {
    totalOpportunities: (summary?.byStatus?.NEW ?? 0) + (summary?.byStatus?.CONTACTED ?? 0) + (summary?.byStatus?.FOLLOW_UP ?? 0),
    totalValue: summary?.totalPotentialValue ?? 0,
    highConfidence: summary?.byConfidence?.HIGH?.count ?? 0,
    renewals: summary?.byType?.RENEWAL?.count ?? 0,
    conversionRate: summary?.conversionRate ?? 0,
  };

  const typeFilters = [
    { key: 'all', label: 'All Types' },
    { key: 'UPGRADE', label: 'Upgrades', color: 'indigo' },
    { key: 'PERSONAL_TRAINING', label: 'PT', color: 'amber' },
    { key: 'RENEWAL', label: 'Renewals', color: 'emerald' },
    { key: 'ADDON', label: 'Add-ons', color: 'purple' },
  ];

  const statusFilters = [
    { key: 'active', label: 'Active' },
    { key: 'NEW', label: 'New' },
    { key: 'CONTACTED', label: 'Contacted' },
    { key: 'WON', label: 'Won' },
    { key: 'all', label: 'All' },
  ];

  return (
    <>
      <SendOfferModal
        opportunity={selectedOpportunity}
        isOpen={isOfferModalOpen}
        onClose={closeOfferModal}
        onSend={handleSendOffer}
      />

      <Header title="Opportunities" description="Identify upsell and growth opportunities">
        <Button
          onClick={scanForOpportunities}
          disabled={isScanning}
          className="gap-2"
        >
          {isScanning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {isScanning ? 'Scanning...' : 'Scan for Opportunities'}
        </Button>
      </Header>

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Target className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{summary?.totalOpportunities ?? 0}</p>
                <p className="text-sm text-slate-500">Total</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{formatCurrency(stats.totalValue)}</p>
                <p className="text-sm text-slate-500">Potential</p>
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
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{stats.renewals}</p>
                <p className="text-sm text-slate-500">Renewals Due</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Check className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{stats.conversionRate.toFixed(0)}%</p>
                <p className="text-sm text-slate-500">Conv. Rate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="bg-white rounded-2xl shadow-sm p-2 flex-1">
            <div className="flex flex-wrap gap-2">
              {typeFilters.map((f) => (
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
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-2">
            <div className="flex gap-2">
              {statusFilters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setStatusFilter(f.key)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    statusFilter === f.key
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Opportunities List */}
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          </div>
        ) : opportunities.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="rounded-2xl bg-slate-100 p-5 mb-4">
                <TrendingUp className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No opportunities found</h3>
              <p className="text-sm text-slate-500 text-center mb-4 max-w-sm">
                Click "Scan for Opportunities" to analyze your members and detect potential upsells.
              </p>
              <Button onClick={scanForOpportunities} disabled={isScanning}>
                {isScanning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Scan Now
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {(() => {
              // Calculate median value to split into categories
              const values = opportunities.map(o => Number(o.potentialValue)).sort((a, b) => b - a);
              const medianValue = values.length > 0 ? values[Math.floor(values.length / 2)] : 0;

              const highValueOpportunities = opportunities.filter(o => Number(o.potentialValue) >= medianValue);
              const mediumValueOpportunities = opportunities.filter(o => Number(o.potentialValue) < medianValue);

              const renderOpportunityCard = (opportunity: Opportunity, index: number, categoryLabel: string) => {
                const maxValue = Math.max(...opportunities.map(o => Number(o.potentialValue)), 1);
                const priorityScore = calculatePriority(opportunity, maxValue);
                const priority = getPriorityLabel(priorityScore);

                return (
                  <div
                    key={opportunity.id}
                    className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all p-5 group relative"
                  >
                    <div className="flex items-start gap-4">
                      {/* Priority Rank */}
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-amber-500 text-white' :
                          index === 1 ? 'bg-slate-300 text-slate-700' :
                          index === 2 ? 'bg-amber-700 text-white' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {index + 1}
                        </div>
                      </div>

                      {/* Type Icon */}
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${getTypeStyle(opportunity.type)}`}>
                        {getTypeIcon(opportunity.type)}
                      </div>

                      {/* Main Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <button
                              onClick={() => router.push(`/members/${opportunity.member.id}`)}
                              className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors"
                            >
                              {opportunity.member.firstName} {opportunity.member.lastName}
                            </button>
                            <p className="text-sm text-slate-500">{opportunity.member.email}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-xl font-bold text-emerald-600">{formatCurrency(Number(opportunity.potentialValue))}</p>
                            <p className="text-xs text-slate-400">potential value</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium ${getTypeStyle(opportunity.type)}`}>
                            {getTypeIcon(opportunity.type)}
                            {opportunity.title}
                          </span>
                          {getConfidenceBadge(opportunity.confidence)}
                          {getStatusBadge(opportunity.status)}
                        </div>

                    <p className="text-sm text-slate-600 mb-3">
                          <span className="font-medium text-slate-700">Why:</span> {opportunity.reason}
                        </p>

                        <p className="text-sm text-indigo-600 font-medium">
                          <span className="text-slate-500 font-normal">Recommended:</span> {opportunity.recommendedAction}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        {opportunity.status === 'NEW' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
                              disabled={updatingId === opportunity.id}
                              onClick={() => openOfferModal(opportunity)}
                            >
                              <Send className="h-3.5 w-3.5" />
                              Send Offer
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              disabled={updatingId === opportunity.id}
                              onClick={() => updateStatus(opportunity.id, 'CONTACTED', 'phone')}
                            >
                              <Phone className="h-3.5 w-3.5" />
                              Call
                            </Button>
                          </>
                        )}
                        {opportunity.status === 'CONTACTED' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                              disabled={updatingId === opportunity.id}
                              onClick={() => updateStatus(opportunity.id, 'WON')}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Won
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5"
                              disabled={updatingId === opportunity.id}
                              onClick={() => openOfferModal(opportunity)}
                            >
                              <Send className="h-3.5 w-3.5" />
                              Follow-up
                            </Button>
                          </>
                        )}
                        {opportunity.status === 'FOLLOW_UP' && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
                              disabled={updatingId === opportunity.id}
                              onClick={() => openOfferModal(opportunity)}
                            >
                              <Send className="h-3.5 w-3.5" />
                              Send Offer
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                              disabled={updatingId === opportunity.id}
                              onClick={() => updateStatus(opportunity.id, 'WON')}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Won
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-red-600 hover:bg-red-50"
                              disabled={updatingId === opportunity.id}
                              onClick={() => updateStatus(opportunity.id, 'LOST')}
                            >
                              <X className="h-3.5 w-3.5" />
                              Lost
                            </Button>
                          </>
                        )}
                        {['NEW', 'CONTACTED', 'FOLLOW_UP'].includes(opportunity.status) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="gap-1.5 text-slate-500"
                            disabled={updatingId === opportunity.id}
                            onClick={() => updateStatus(opportunity.id, 'DISMISSED')}
                          >
                            Dismiss
                          </Button>
                        )}
                        {updatingId === opportunity.id && (
                          <div className="absolute inset-0 bg-white/50 rounded-2xl flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              };

              return (
                <>
                  {/* High Potential Value Section */}
                  {highValueOpportunities.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-slate-900">High Potential Value</h2>
                          <p className="text-sm text-slate-500">
                            {highValueOpportunities.length} opportunities worth {formatCurrency(highValueOpportunities.reduce((sum, o) => sum + Number(o.potentialValue), 0))}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {highValueOpportunities.map((opp, idx) => renderOpportunityCard(opp, idx, 'high'))}
                      </div>
                    </div>
                  )}

                  {/* Medium Potential Value Section */}
                  {mediumValueOpportunities.length > 0 && (
                    <div>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                          <Target className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <h2 className="text-lg font-semibold text-slate-900">Medium Potential Value</h2>
                          <p className="text-sm text-slate-500">
                            {mediumValueOpportunities.length} opportunities worth {formatCurrency(mediumValueOpportunities.reduce((sum, o) => sum + Number(o.potentialValue), 0))}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        {mediumValueOpportunities.map((opp, idx) => renderOpportunityCard(opp, idx, 'medium'))}
                      </div>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </>
  );
}
