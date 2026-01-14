'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { MemberProfileHeader, MemberStatsCards, MemberTagsManager, MemberTimeline } from '@/components/members';
import { ActivityLineChart, HourHeatmap } from '@/components/charts';

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

  useEffect(() => {
    Promise.all([fetchProfile(), fetchAnalytics(), fetchTags()]).finally(() => {
      setLoading(false);
    });
  }, [fetchProfile, fetchAnalytics, fetchTags]);

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
    </div>
  );
}
