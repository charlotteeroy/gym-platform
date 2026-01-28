'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Ticket, Plus, X, Clock, AlertTriangle, DollarSign, History, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { MemberProfileHeader, MemberStatsCards, MemberTagsManager, MemberTimeline } from '@/components/members';
import { ActivityLineChart, HourHeatmap } from '@/components/charts';

interface MemberPass {
  id: string;
  status: 'ACTIVE' | 'EXPIRED' | 'DEPLETED' | 'CANCELLED';
  creditsTotal: number;
  creditsRemaining: number;
  activatedAt: string;
  expiresAt: string | null;
  product: { id: string; name: string; type: string };
}

interface PassProduct {
  id: string;
  name: string;
  description: string | null;
  priceAmount: number;
  type: 'CLASS_PACK' | 'DROP_IN';
  classCredits: number | null;
  validityDays: number | null;
  isActive: boolean;
}

interface BonusBalanceTransaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  referenceType: string | null;
  referenceId: string | null;
  createdBy: string;
  createdAt: string;
}

interface BonusBalanceData {
  memberId: string;
  currentBalance: number;
  recentTransactions: BonusBalanceTransaction[];
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface MemberProfile {
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
    dateOfBirth?: Date | null;
    status: string;
    joinedAt: Date;
  };
  subscription: {
    id: string;
    status: string;
    currentPeriodEnd: Date;
    plan: { id: string; name: string };
  } | null;
  tags: Tag[];
  stats: {
    totalCheckIns: number;
    checkInsThisMonth: number;
    totalBookings: number;
    upcomingBookings: number;
  };
  recentActivity: Array<{
    type: 'check_in' | 'booking' | 'tag_added';
    timestamp: Date;
    description: string;
  }>;
}

interface MemberAnalytics {
  dailyActivity: Array<{ date: string; checkIns: number; bookings: number }>;
  hourlyDistribution: Array<{ hour: number; count: number }>;
  summary: {
    totalCheckIns: number;
    avgWeeklyVisits: number;
    mostActiveHour: number | null;
    mostActiveDay: string | null;
    streakDays: number;
    lastVisit: Date | null;
  };
}

export default function MemberProfilePage() {
  const params = useParams();
  const router = useRouter();
  const memberId = params.id as string;

  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [analytics, setAnalytics] = useState<MemberAnalytics | null>(null);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Passes state
  const [memberPasses, setMemberPasses] = useState<MemberPass[]>([]);
  const [passProducts, setPassProducts] = useState<PassProduct[]>([]);
  const [showAssignPassModal, setShowAssignPassModal] = useState(false);
  const [assigningPass, setAssigningPass] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');

  // Bonus balance state
  const [bonusBalance, setBonusBalance] = useState<BonusBalanceData | null>(null);
  const [showBonusHistoryModal, setShowBonusHistoryModal] = useState(false);
  const [bonusHistoryPage, setBonusHistoryPage] = useState(1);
  const [bonusHistoryData, setBonusHistoryData] = useState<{ transactions: BonusBalanceTransaction[]; total: number } | null>(null);
  const [loadingBonusHistory, setLoadingBonusHistory] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [adjustDirection, setAdjustDirection] = useState<'add' | 'remove'>('add');
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch(`/api/members/${memberId}/profile`);
      const result = await res.json();
      if (result.success) {
        setProfile(result.data);
      } else {
        setError(result.error?.message || 'Failed to load profile');
      }
    } catch {
      setError('Failed to load profile');
    }
  }, [memberId]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`/api/members/${memberId}/analytics?days=30`);
      const result = await res.json();
      if (result.success) {
        setAnalytics(result.data);
      }
    } catch {
      // Analytics are optional, don't show error
    }
  }, [memberId]);

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/tags');
      const result = await res.json();
      if (result.success) {
        setAllTags(result.data.tags);
      }
    } catch {
      // Tags are optional
    }
  }, []);

  const fetchMemberPasses = useCallback(async () => {
    try {
      const res = await fetch(`/api/members/${memberId}/passes`);
      const result = await res.json();
      if (result.success) {
        setMemberPasses(result.data);
      }
    } catch {
      // Passes are optional
    }
  }, [memberId]);

  const fetchPassProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/passes');
      const result = await res.json();
      if (result.success) {
        setPassProducts(result.data.filter((p: PassProduct) => p.isActive));
      }
    } catch {
      // Pass products are optional
    }
  }, []);

  const fetchBonusBalance = useCallback(async () => {
    try {
      const res = await fetch(`/api/members/${memberId}/bonus-balance`);
      const result = await res.json();
      if (result.success) {
        setBonusBalance(result.data);
      }
    } catch {
      // Bonus balance is optional
    }
  }, [memberId]);

  const fetchBonusHistory = useCallback(async (page: number) => {
    setLoadingBonusHistory(true);
    try {
      const res = await fetch(`/api/members/${memberId}/bonus-balance/transactions?page=${page}&limit=20`);
      const result = await res.json();
      if (result.success) {
        setBonusHistoryData(result.data);
        setBonusHistoryPage(page);
      }
    } catch {
      // History is optional
    } finally {
      setLoadingBonusHistory(false);
    }
  }, [memberId]);

  useEffect(() => {
    Promise.all([fetchProfile(), fetchAnalytics(), fetchTags(), fetchMemberPasses(), fetchPassProducts(), fetchBonusBalance()]).finally(() => {
      setLoading(false);
    });
  }, [fetchProfile, fetchAnalytics, fetchTags, fetchMemberPasses, fetchPassProducts, fetchBonusBalance]);

  const handleCheckIn = async () => {
    try {
      const res = await fetch(`/api/members/${memberId}/check-in`, {
        method: 'POST',
      });
      const result = await res.json();
      if (result.success) {
        // Refresh data
        await Promise.all([fetchProfile(), fetchAnalytics()]);
      } else {
        alert(result.error?.message || 'Check-in failed');
      }
    } catch {
      alert('Check-in failed');
    }
  };

  const handleAddTag = async (tagId: string) => {
    const res = await fetch(`/api/members/${memberId}/tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tagId }),
    });
    const result = await res.json();
    if (result.success) {
      await fetchProfile();
    } else {
      throw new Error(result.error?.message || 'Failed to add tag');
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    const res = await fetch(`/api/members/${memberId}/tags/${tagId}`, {
      method: 'DELETE',
    });
    const result = await res.json();
    if (result.success) {
      await fetchProfile();
    } else {
      throw new Error(result.error?.message || 'Failed to remove tag');
    }
  };

  const handleAssignPass = async () => {
    if (!selectedProductId) return;
    setAssigningPass(true);
    try {
      const res = await fetch(`/api/members/${memberId}/passes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProductId }),
      });
      const result = await res.json();
      if (result.success) {
        setShowAssignPassModal(false);
        setSelectedProductId('');
        await fetchMemberPasses();
      } else {
        alert(result.error?.message || 'Failed to assign pass');
      }
    } catch {
      alert('Failed to assign pass');
    } finally {
      setAssigningPass(false);
    }
  };

  const handleAdjustBalance = async () => {
    const amount = parseFloat(adjustAmount);
    if (!amount || amount <= 0 || adjustReason.length < 10) return;
    setAdjusting(true);
    try {
      const res = await fetch(`/api/members/${memberId}/bonus-balance/adjust`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason: adjustReason, direction: adjustDirection }),
      });
      const result = await res.json();
      if (result.success) {
        setShowAdjustModal(false);
        setAdjustAmount('');
        setAdjustReason('');
        setAdjustDirection('add');
        await fetchBonusBalance();
      } else {
        alert(result.error?.message || 'Failed to adjust balance');
      }
    } catch {
      alert('Failed to adjust balance');
    } finally {
      setAdjusting(false);
    }
  };

  const handleOpenHistory = () => {
    setShowBonusHistoryModal(true);
    fetchBonusHistory(1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">{error || 'Member not found'}</p>
        <button
          onClick={() => router.push('/members')}
          className="text-indigo-600 hover:text-indigo-700"
        >
          Back to Members
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.push('/members')}
        className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Members
      </button>

      {/* Header */}
      <MemberProfileHeader
        member={profile.member}
        tags={profile.tags}
        onCheckIn={handleCheckIn}
        onEdit={() => {
          // TODO: Implement edit modal
        }}
      />

      {/* Stats */}
      <MemberStatsCards stats={profile.stats} summary={analytics?.summary} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Activity Chart */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900 mb-4">Activity (Last 30 Days)</h3>
            <ActivityLineChart data={analytics?.dailyActivity || []} height={250} />
          </div>

          {/* Time-of-Day Heatmap */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-900 mb-4">Preferred Visit Times</h3>
            <HourHeatmap data={analytics?.hourlyDistribution || []} />
          </div>
        </div>

        {/* Right Column - Tags & Timeline */}
        <div className="space-y-6">
          {/* Tags Manager */}
          <MemberTagsManager
            memberId={memberId}
            memberTags={profile.tags}
            availableTags={allTags}
            onAddTag={handleAddTag}
            onRemoveTag={handleRemoveTag}
          />

          {/* Subscription Info */}
          {profile.subscription && (
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900 mb-3">Membership</h3>
              <div className="space-y-2">
                <p className="text-sm">
                  <span className="text-slate-500">Plan:</span>{' '}
                  <span className="font-medium">{profile.subscription.plan.name}</span>
                </p>
                <p className="text-sm">
                  <span className="text-slate-500">Status:</span>{' '}
                  <span
                    className={`font-medium ${
                      profile.subscription.status === 'ACTIVE'
                        ? 'text-green-600'
                        : 'text-amber-600'
                    }`}
                  >
                    {profile.subscription.status}
                  </span>
                </p>
                <p className="text-sm">
                  <span className="text-slate-500">Renews:</span>{' '}
                  <span className="font-medium">
                    {new Date(profile.subscription.currentPeriodEnd).toLocaleDateString()}
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Passes & Credits */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Ticket className="w-4 h-4" />
                Passes & Credits
              </h3>
              <button
                onClick={() => setShowAssignPassModal(true)}
                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                <Plus className="w-3 h-3" />
                Assign Pass
              </button>
            </div>

            {memberPasses.length === 0 ? (
              <p className="text-sm text-slate-500">No passes assigned.</p>
            ) : (
              <div className="space-y-3">
                {memberPasses.map((pass) => {
                  const pct = pass.creditsTotal > 0
                    ? Math.round((pass.creditsRemaining / pass.creditsTotal) * 100)
                    : 0;
                  const isExpiringSoon = pass.expiresAt &&
                    new Date(pass.expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000;

                  return (
                    <div key={pass.id} className="border border-slate-100 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-900">
                          {pass.product.name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          pass.status === 'ACTIVE'
                            ? 'bg-green-100 text-green-700'
                            : pass.status === 'DEPLETED'
                            ? 'bg-slate-100 text-slate-500'
                            : pass.status === 'EXPIRED'
                            ? 'bg-red-100 text-red-600'
                            : 'bg-slate-100 text-slate-500'
                        }`}>
                          {pass.status}
                        </span>
                      </div>

                      {/* Credit bar */}
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              pct > 50 ? 'bg-indigo-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
                          {pass.creditsRemaining}/{pass.creditsTotal}
                        </span>
                      </div>

                      {/* Expiry info */}
                      {pass.expiresAt && (
                        <div className={`flex items-center gap-1 text-xs ${
                          isExpiringSoon ? 'text-amber-600' : 'text-slate-400'
                        }`}>
                          {isExpiringSoon ? (
                            <AlertTriangle className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          )}
                          Expires {new Date(pass.expiresAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bonus Balance Card */}
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Bonus Balance
              </h3>
              <button
                onClick={() => setShowAdjustModal(true)}
                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Adjust
              </button>
            </div>

            <div className="text-3xl font-bold text-slate-900 mb-3">
              ${(bonusBalance?.currentBalance ?? 0).toFixed(2)}
            </div>

            {/* Recent transactions preview */}
            {bonusBalance && bonusBalance.recentTransactions.length > 0 ? (
              <div className="space-y-2 mb-3">
                {bonusBalance.recentTransactions.slice(0, 5).map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      {txn.amount >= 0 ? (
                        <TrendingUp className="w-3 h-3 text-green-500 flex-shrink-0" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-500 flex-shrink-0" />
                      )}
                      <span className="text-slate-600 truncate">{txn.description}</span>
                    </div>
                    <span className={`font-medium whitespace-nowrap ml-2 ${
                      txn.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {txn.amount >= 0 ? '+' : ''}${txn.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 mb-3">No transactions yet.</p>
            )}

            <button
              onClick={handleOpenHistory}
              className="w-full text-center text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center justify-center gap-1"
            >
              <History className="w-3 h-3" />
              View Full History
            </button>
          </div>

          {/* Recent Activity Timeline */}
          <MemberTimeline activities={profile.recentActivity} />

          {/* Most Active Info */}
          {analytics?.summary && (
            <div className="bg-white rounded-lg border border-slate-200 p-4">
              <h3 className="font-semibold text-slate-900 mb-3">Activity Insights</h3>
              <div className="space-y-2">
                {analytics.summary.mostActiveDay && (
                  <p className="text-sm">
                    <span className="text-slate-500">Most Active Day:</span>{' '}
                    <span className="font-medium">{analytics.summary.mostActiveDay}</span>
                  </p>
                )}
                {analytics.summary.mostActiveHour !== null && (
                  <p className="text-sm">
                    <span className="text-slate-500">Preferred Time:</span>{' '}
                    <span className="font-medium">
                      {analytics.summary.mostActiveHour}:00
                    </span>
                  </p>
                )}
                {analytics.summary.lastVisit && (
                  <p className="text-sm">
                    <span className="text-slate-500">Last Visit:</span>{' '}
                    <span className="font-medium">
                      {new Date(analytics.summary.lastVisit).toLocaleDateString()}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Assign Pass Modal */}
      {showAssignPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAssignPassModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Assign Pass</h2>
              <button onClick={() => setShowAssignPassModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {passProducts.length === 0 ? (
                <p className="text-sm text-slate-500">No active pass products available. Create one in Admin &gt; Plans.</p>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Select Pass Product</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    >
                      <option value="">Choose a pass...</option>
                      {passProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} — {p.classCredits ?? 1} credit{(p.classCredits ?? 1) !== 1 ? 's' : ''}
                          {p.validityDays ? ` (${p.validityDays} days)` : ''} — ${Number(p.priceAmount).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowAssignPassModal(false)}
                      className="px-4 py-2 text-sm rounded-xl border border-slate-200 hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAssignPass}
                      disabled={!selectedProductId || assigningPass}
                      className="px-4 py-2 text-sm rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
                    >
                      {assigningPass ? 'Assigning...' : 'Assign Pass'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Bonus Balance History Modal */}
      {showBonusHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowBonusHistoryModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Bonus Balance History</h2>
              <button onClick={() => setShowBonusHistoryModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {loadingBonusHistory ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : bonusHistoryData && bonusHistoryData.transactions.length > 0 ? (
                <div className="space-y-3">
                  {bonusHistoryData.transactions.map((txn) => (
                    <div key={txn.id} className="flex items-start justify-between py-2 border-b border-slate-50 last:border-0">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {txn.amount >= 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-500 flex-shrink-0" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-500 flex-shrink-0" />
                          )}
                          <span className="text-sm font-medium text-slate-900 truncate">{txn.description}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1 ml-6">
                          <span className="text-xs text-slate-400">
                            {new Date(txn.createdAt).toLocaleDateString()} {new Date(txn.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                            {txn.type.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                      <div className="text-right ml-3 flex-shrink-0">
                        <div className={`text-sm font-semibold ${txn.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {txn.amount >= 0 ? '+' : ''}${txn.amount.toFixed(2)}
                        </div>
                        <div className="text-xs text-slate-400">Bal: ${txn.balanceAfter.toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-sm text-slate-500 py-8">No transactions found.</p>
              )}
            </div>
            {bonusHistoryData && bonusHistoryData.total > 20 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-100">
                <button
                  onClick={() => fetchBonusHistory(bonusHistoryPage - 1)}
                  disabled={bonusHistoryPage <= 1}
                  className="text-sm text-indigo-600 hover:text-indigo-700 disabled:text-slate-300 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-xs text-slate-500">
                  Page {bonusHistoryPage} of {Math.ceil(bonusHistoryData.total / 20)}
                </span>
                <button
                  onClick={() => fetchBonusHistory(bonusHistoryPage + 1)}
                  disabled={bonusHistoryPage >= Math.ceil(bonusHistoryData.total / 20)}
                  className="text-sm text-indigo-600 hover:text-indigo-700 disabled:text-slate-300 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Adjust Balance Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowAdjustModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Adjust Bonus Balance</h2>
              <button onClick={() => setShowAdjustModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Current balance */}
              <div className="text-center bg-slate-50 rounded-xl p-3">
                <div className="text-xs text-slate-500 mb-1">Current Balance</div>
                <div className="text-2xl font-bold text-slate-900">${(bonusBalance?.currentBalance ?? 0).toFixed(2)}</div>
              </div>

              {/* Direction toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setAdjustDirection('add')}
                  className={`flex-1 py-2 px-3 text-sm rounded-xl border ${
                    adjustDirection === 'add'
                      ? 'border-green-500 bg-green-50 text-green-700 font-medium'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  Add
                </button>
                <button
                  onClick={() => setAdjustDirection('remove')}
                  className={`flex-1 py-2 px-3 text-sm rounded-xl border ${
                    adjustDirection === 'remove'
                      ? 'border-red-500 bg-red-50 text-red-700 font-medium'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Minus className="w-4 h-4 inline mr-1" />
                  Remove
                </button>
              </div>

              {/* Amount input */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Amount ($)</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              {/* Reason input */}
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-1">Reason (min 10 characters)</label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Describe the reason for this adjustment..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
                />
                <div className="text-xs text-slate-400 mt-1">{adjustReason.length}/500</div>
              </div>

              {/* Preview */}
              {adjustAmount && parseFloat(adjustAmount) > 0 && (
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="text-xs text-slate-500 mb-1">New Balance</div>
                  <div className={`text-xl font-bold ${adjustDirection === 'add' ? 'text-green-600' : 'text-red-600'}`}>
                    ${(
                      (bonusBalance?.currentBalance ?? 0) +
                      (adjustDirection === 'add' ? 1 : -1) * parseFloat(adjustAmount)
                    ).toFixed(2)}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 text-sm rounded-xl border border-slate-200 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdjustBalance}
                  disabled={!adjustAmount || parseFloat(adjustAmount) <= 0 || adjustReason.length < 10 || adjusting}
                  className={`px-4 py-2 text-sm rounded-xl text-white disabled:opacity-50 ${
                    adjustDirection === 'add'
                      ? 'bg-green-600 hover:bg-green-700'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {adjusting ? 'Processing...' : adjustDirection === 'add' ? 'Add Balance' : 'Remove Balance'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
