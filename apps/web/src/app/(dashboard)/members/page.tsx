'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, MoreHorizontal, UserPlus, Loader2, Users, AlertTriangle, Clock, Sparkles } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { ExportButton } from '@/components/ui/export-button';
import { type ExportColumn } from '@/lib/export';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddMemberDialog } from '@/components/forms/add-member-dialog';

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  joinedAt: string;
  createdAt: string;
  visitCount?: number;
  lastActivity?: string | null;
  tags?: Array<{ tag: { id: string; name: string; color: string } }>;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface Insights {
  summary: {
    totalMembers: number;
    activeMembers: number;
    newThisMonth: number;
    atRisk: number;
  };
  activity: {
    high: number;
    medium: number;
    low: number;
    inactive: number;
  };
  insights: {
    peakTime: string | null;
    peakDay: string | null;
    avgVisitsPerMember: number;
  };
  topTags: Array<{ name: string; count: number }>;
}

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);

  // Filters
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activityLevel, setActivityLevel] = useState<string>('');
  const [sortBy, setSortBy] = useState('joinedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchInsights = useCallback(async () => {
    try {
      const response = await fetch('/api/members/insights');
      if (response.ok) {
        const result = await response.json();
        setInsights(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch insights:', error);
    }
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      const response = await fetch('/api/tags');
      if (response.ok) {
        const result = await response.json();
        setAllTags(result.data?.tags || []);
      }
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedTags.length > 0) params.append('tags', selectedTags.join(','));
      if (activityLevel) params.append('activityLevel', activityLevel);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const response = await fetch(`/api/members?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        setMembers(result.data?.items || []);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedTags, activityLevel, sortBy, sortOrder]);

  useEffect(() => {
    fetchInsights();
    fetchTags();
  }, [fetchInsights, fetchTags]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      fetchMembers();
    }, 300);
    return () => clearTimeout(debounce);
  }, [fetchMembers]);

  const handleMemberAdded = () => {
    fetchMembers();
    fetchInsights();
  };

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const memberExportColumns: ExportColumn[] = [
    { header: 'First Name', accessor: (m) => m.firstName },
    { header: 'Last Name', accessor: (m) => m.lastName },
    { header: 'Email', accessor: (m) => m.email },
    { header: 'Status', accessor: (m) => m.status },
    { header: 'Visits (30 days)', accessor: (m) => m.visitCount || 0 },
    { header: 'Tags', accessor: (m) => (m.tags || []).map((t: any) => t.tag?.name || t.name).join(', ') },
    { header: 'Joined', accessor: (m) => formatDate(m.createdAt || m.joinedAt) },
  ];

  const getStatusBadge = (status: string) => (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        status === 'ACTIVE'
          ? 'bg-emerald-100 text-emerald-700'
          : status === 'PAUSED'
            ? 'bg-amber-100 text-amber-700'
            : 'bg-gray-100 text-gray-700'
      }`}
    >
      {status}
    </span>
  );

  const getActivityColor = (count: number) => {
    if (count >= 12) return 'text-emerald-600';
    if (count >= 4) return 'text-blue-600';
    if (count >= 1) return 'text-amber-600';
    return 'text-slate-400';
  };

  // Calculate activity distribution percentages
  const getActivityPercentage = (count: number) => {
    if (!insights) return 0;
    const total = insights.activity.high + insights.activity.medium + insights.activity.low + insights.activity.inactive;
    return total > 0 ? Math.round((count / total) * 100) : 0;
  };

  return (
    <>
      <Header title="Members" description="Manage your gym members and understand your customers" />

      <div className="p-4 md:p-6 space-y-5">
        {/* Stats Cards */}
        {insights && (
          <div className="space-y-4">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-900">{insights.summary.totalMembers}</p>
                    <p className="text-sm text-slate-500">Total Members</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <UserPlus className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-900">{insights.summary.activeMembers}</p>
                    <p className="text-sm text-slate-500">Active Members</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-900">+{insights.summary.newThisMonth}</p>
                    <p className="text-sm text-slate-500">This Month</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActivityLevel(activityLevel === 'declining' ? '' : 'declining')}
                className={`bg-white rounded-2xl p-5 shadow-sm text-left w-full transition-all hover:shadow-md ${activityLevel === 'declining' ? 'ring-2 ring-red-500' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-3xl font-bold text-slate-900">{insights.summary.atRisk}</p>
                    <p className="text-sm text-slate-500">At Risk</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Activity Distribution */}
            <div className="bg-white rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-slate-900">Activity Distribution</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Clock className="w-4 h-4" />
                    <span>Peak: <span className="font-medium text-slate-900">{insights.insights.peakTime || '-'}</span> on <span className="font-medium text-slate-900">{insights.insights.peakDay || '-'}</span></span>
                  </div>
                </div>
                <div className="hidden md:flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Super Active</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" /> Active</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Low</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-300" /> Dormant</span>
                </div>
              </div>

              <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
                <button
                  className={`bg-emerald-500 transition-all hover:brightness-110 ${activityLevel === 'high' ? 'ring-2 ring-emerald-600 ring-offset-1' : ''}`}
                  style={{ width: `${getActivityPercentage(insights.activity.high)}%` }}
                  onClick={() => setActivityLevel(activityLevel === 'high' ? '' : 'high')}
                  title={`Super Active: ${insights.activity.high}`}
                />
                <button
                  className={`bg-blue-500 transition-all hover:brightness-110 ${activityLevel === 'medium' ? 'ring-2 ring-blue-600 ring-offset-1' : ''}`}
                  style={{ width: `${getActivityPercentage(insights.activity.medium)}%` }}
                  onClick={() => setActivityLevel(activityLevel === 'medium' ? '' : 'medium')}
                  title={`Active: ${insights.activity.medium}`}
                />
                <button
                  className={`bg-amber-500 transition-all hover:brightness-110 ${activityLevel === 'low' ? 'ring-2 ring-amber-600 ring-offset-1' : ''}`}
                  style={{ width: `${getActivityPercentage(insights.activity.low)}%` }}
                  onClick={() => setActivityLevel(activityLevel === 'low' ? '' : 'low')}
                  title={`Low Active: ${insights.activity.low}`}
                />
                <button
                  className={`bg-slate-300 transition-all hover:brightness-95 ${activityLevel === 'inactive' ? 'ring-2 ring-slate-400 ring-offset-1' : ''}`}
                  style={{ width: `${getActivityPercentage(insights.activity.inactive)}%` }}
                  onClick={() => setActivityLevel(activityLevel === 'inactive' ? '' : 'inactive')}
                  title={`Dormant: ${insights.activity.inactive}`}
                />
              </div>

              <div className="flex justify-between text-xs mt-3">
                <button
                  onClick={() => setActivityLevel(activityLevel === 'high' ? '' : 'high')}
                  className={`px-2 py-1 rounded-md transition-colors ${activityLevel === 'high' ? 'bg-emerald-100 text-emerald-700 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {insights.activity.high} super active
                </button>
                <button
                  onClick={() => setActivityLevel(activityLevel === 'medium' ? '' : 'medium')}
                  className={`px-2 py-1 rounded-md transition-colors ${activityLevel === 'medium' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {insights.activity.medium} active
                </button>
                <button
                  onClick={() => setActivityLevel(activityLevel === 'low' ? '' : 'low')}
                  className={`px-2 py-1 rounded-md transition-colors ${activityLevel === 'low' ? 'bg-amber-100 text-amber-700 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {insights.activity.low} low active
                </button>
                <button
                  onClick={() => setActivityLevel(activityLevel === 'inactive' ? '' : 'inactive')}
                  className={`px-2 py-1 rounded-md transition-colors ${activityLevel === 'inactive' ? 'bg-slate-200 text-slate-700 font-medium' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  {insights.activity.inactive} dormant
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filters & Actions */}
        <div className="space-y-3">
          {/* Mobile: Search + Add Button Row */}
          <div className="flex gap-2 sm:hidden">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 border-slate-200 bg-white rounded-xl"
              />
            </div>
            <Button
              onClick={() => setIsAddMemberOpen(true)}
              className="h-11 px-4 bg-slate-900 hover:bg-slate-800 rounded-xl"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Mobile: Filter Row */}
          <div className="flex gap-2 sm:hidden">
            <select
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 flex-1"
            >
              <option value="">All Activity</option>
              <option value="high">Super Active</option>
              <option value="medium">Active</option>
              <option value="low">Low Active</option>
              <option value="inactive">Dormant</option>
              <option value="declining">Declining</option>
            </select>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order as 'asc' | 'desc');
              }}
              className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 flex-1"
            >
              <option value="joinedAt-desc">Newest</option>
              <option value="joinedAt-asc">Oldest</option>
              <option value="visitCount-desc">Most Active</option>
              <option value="visitCount-asc">Least Active</option>
              <option value="firstName-asc">A-Z</option>
            </select>
          </div>

          {/* Desktop Layout */}
          <div className="hidden sm:flex sm:flex-row gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 border-slate-200 bg-white rounded-xl"
              />
            </div>
            <select
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value)}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700"
            >
              <option value="">All Activity</option>
              <option value="high">Super Active</option>
              <option value="medium">Active</option>
              <option value="low">Low Active</option>
              <option value="inactive">Dormant</option>
              <option value="declining">Declining</option>
            </select>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field);
                setSortOrder(order as 'asc' | 'desc');
              }}
              className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700"
            >
              <option value="joinedAt-desc">Newest</option>
              <option value="joinedAt-asc">Oldest</option>
              <option value="visitCount-desc">Most Active</option>
              <option value="visitCount-asc">Least Active</option>
              <option value="firstName-asc">A-Z</option>
            </select>
            <ExportButton
              data={members}
              columns={memberExportColumns}
              filename="members"
              pdfTitle="Members Report"
              pdfSummary={[
                { label: 'Total Members', value: `${members.length}` },
              ]}
            />
            <Button
              onClick={() => setIsAddMemberOpen(true)}
              className="h-11 px-5 bg-slate-900 hover:bg-slate-800 rounded-xl whitespace-nowrap"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </div>
        </div>

        {/* Tags */}
        {allTags.length > 0 && (
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-slate-500">Filter by tag:</span>
            {allTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => toggleTag(tag.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedTags.includes(tag.id)
                    ? 'text-white shadow-sm'
                    : 'bg-white border border-slate-200 hover:border-slate-300'
                }`}
                style={{
                  backgroundColor: selectedTags.includes(tag.id) ? tag.color : undefined,
                  color: selectedTags.includes(tag.id) ? 'white' : tag.color,
                }}
              >
                {tag.name}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-xs text-slate-400 hover:text-slate-600 underline"
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {/* Members List */}
        {isLoading ? (
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </CardContent>
          </Card>
        ) : members.length === 0 ? (
          <Card className="border-0 shadow-sm rounded-2xl">
            <CardContent className="flex flex-col items-center justify-center py-20 px-4">
              <div className="rounded-2xl bg-slate-100 p-5 mb-4">
                <UserPlus className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No members found</h3>
              <p className="text-sm text-slate-500 text-center mb-5 max-w-sm">
                {searchQuery || selectedTags.length > 0 || activityLevel
                  ? 'Try adjusting your filters'
                  : 'Get started by adding your first member to the gym.'}
              </p>
              {!searchQuery && selectedTags.length === 0 && !activityLevel && (
                <Button onClick={() => setIsAddMemberOpen(true)} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Member
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="px-5 py-4 border-b border-slate-100 bg-white">
              <CardTitle className="text-base font-semibold text-slate-900">
                {members.length} {members.length === 1 ? 'member' : 'members'}
                {activityLevel && <span className="text-slate-400 font-normal ml-2">filtered</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Mobile View */}
              <div className="md:hidden divide-y divide-slate-100">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => router.push(`/members/${member.id}`)}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-medium text-sm">
                      {member.firstName[0]}{member.lastName[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-medium text-sm text-slate-900 truncate">
                          {member.firstName} {member.lastName}
                        </p>
                        {getStatusBadge(member.status)}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{member.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-medium ${getActivityColor(member.visitCount || 0)}`}>
                          {member.visitCount || 0} visits
                        </span>
                        {member.tags && member.tags.length > 0 && (
                          <div className="flex gap-1">
                            {member.tags.slice(0, 2).map((mt) => (
                              <span
                                key={mt.tag.id}
                                className="px-1.5 py-0.5 rounded text-[10px] text-white"
                                style={{ backgroundColor: mt.tag.color }}
                              >
                                {mt.tag.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/members/${member.id}`)}>View Profile</DropdownMenuItem>
                        <DropdownMenuItem>Check In</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-500 border-b border-slate-100 bg-slate-50/50">
                    <tr>
                      <th className="px-5 py-3 font-medium">Member</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Activity</th>
                      <th className="px-5 py-3 font-medium">Tags</th>
                      <th className="px-5 py-3 font-medium">Joined</th>
                      <th className="px-5 py-3 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {members.map((member) => (
                      <tr
                        key={member.id}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                        onClick={() => router.push(`/members/${member.id}`)}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-600 font-medium text-xs">
                              {member.firstName[0]}{member.lastName[0]}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{member.firstName} {member.lastName}</p>
                              <p className="text-xs text-slate-500">{member.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">{getStatusBadge(member.status)}</td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  (member.visitCount || 0) >= 12 ? 'bg-emerald-500' :
                                  (member.visitCount || 0) >= 4 ? 'bg-blue-500' :
                                  (member.visitCount || 0) >= 1 ? 'bg-amber-500' : 'bg-slate-300'
                                }`}
                                style={{ width: `${Math.min((member.visitCount || 0) / 12 * 100, 100)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium ${getActivityColor(member.visitCount || 0)}`}>
                              {member.visitCount || 0}
                            </span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex gap-1 flex-wrap">
                            {member.tags?.slice(0, 2).map((mt) => (
                              <span
                                key={mt.tag.id}
                                className="px-2 py-0.5 rounded-md text-xs text-white"
                                style={{ backgroundColor: mt.tag.color }}
                              >
                                {mt.tag.name}
                              </span>
                            ))}
                            {(member.tags?.length ?? 0) > 2 && (
                              <span className="text-xs text-slate-400">+{member.tags!.length - 2}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-500">{formatDate(member.joinedAt || member.createdAt)}</td>
                        <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => router.push(`/members/${member.id}`)}>View Profile</DropdownMenuItem>
                              <DropdownMenuItem>Check In</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AddMemberDialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen} onMemberAdded={handleMemberAdded} />
    </>
  );
}
