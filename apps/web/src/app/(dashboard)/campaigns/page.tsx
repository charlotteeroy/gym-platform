'use client';

import { useState, useEffect } from 'react';
import { Plus, Megaphone, Mail, MessageSquare, MoreHorizontal, Play, Loader2, Target, TrendingUp, Send, ArrowRight } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Campaign {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push';
  status: 'draft' | 'active' | 'paused' | 'completed';
  targetAudience: string;
  sentCount: number;
  openRate: number;
  clickRate: number;
  createdAt: string;
  scheduledAt?: string;
}

const mockCampaigns: Campaign[] = [
  {
    id: '1',
    name: 'Win Back Inactive Members',
    type: 'email',
    status: 'active',
    targetAudience: 'Inactive (30+ days)',
    sentCount: 156,
    openRate: 42.3,
    clickRate: 12.8,
    createdAt: '2024-01-10',
  },
  {
    id: '2',
    name: 'New Year Promo',
    type: 'email',
    status: 'completed',
    targetAudience: 'All Members',
    sentCount: 450,
    openRate: 38.5,
    clickRate: 8.2,
    createdAt: '2024-01-01',
  },
  {
    id: '3',
    name: 'Class Reminder',
    type: 'sms',
    status: 'active',
    targetAudience: 'Booked Members',
    sentCount: 89,
    openRate: 95.0,
    clickRate: 0,
    createdAt: '2024-01-12',
  },
  {
    id: '4',
    name: 'VIP Exclusive Offer',
    type: 'email',
    status: 'draft',
    targetAudience: 'VIP Members',
    sentCount: 0,
    openRate: 0,
    clickRate: 0,
    createdAt: '2024-01-14',
    scheduledAt: '2024-01-20',
  },
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setCampaigns(mockCampaigns);
      setIsLoading(false);
    }, 500);
  }, []);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'sms':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Megaphone className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-slate-100 text-slate-600',
      active: 'bg-emerald-100 text-emerald-700',
      paused: 'bg-amber-100 text-amber-700',
      completed: 'bg-blue-100 text-blue-700',
    };
    return (
      <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${styles[status as keyof typeof styles] || styles.draft}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const stats = {
    totalCampaigns: campaigns.length,
    activeCampaigns: campaigns.filter(c => c.status === 'active').length,
    totalSent: campaigns.reduce((sum, c) => sum + c.sentCount, 0),
    avgOpenRate: campaigns.filter(c => c.sentCount > 0).length > 0
      ? (campaigns.filter(c => c.sentCount > 0).reduce((sum, c) => sum + c.openRate, 0) / campaigns.filter(c => c.sentCount > 0).length).toFixed(1)
      : 0,
  };

  return (
    <>
      <Header title="Campaigns" description="Create and manage marketing campaigns" />

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Megaphone className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{stats.totalCampaigns}</p>
                <p className="text-sm text-slate-500">Total Campaigns</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Play className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{stats.activeCampaigns}</p>
                <p className="text-sm text-slate-500">Active</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Send className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{stats.totalSent}</p>
                <p className="text-sm text-slate-500">Messages Sent</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{stats.avgOpenRate}%</p>
                <p className="text-sm text-slate-500">Avg Open Rate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow text-left group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                  <Mail className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Email Campaign</p>
                  <p className="text-sm text-slate-500">Newsletters & promotions</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
            </div>
          </button>

          <button className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow text-left group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                  <MessageSquare className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">SMS Campaign</p>
                  <p className="text-sm text-slate-500">Quick alerts & reminders</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
            </div>
          </button>

          <button className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow text-left group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                  <Target className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Automated Flow</p>
                  <p className="text-sm text-slate-500">Trigger-based sequences</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-purple-500 transition-colors" />
            </div>
          </button>
        </div>

        {/* Campaigns List */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="text-base font-semibold text-slate-900">All Campaigns</h2>
            <Button className="bg-slate-900 hover:bg-slate-800 rounded-xl h-10">
              <Plus className="mr-2 h-4 w-4" />
              Create Campaign
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="rounded-2xl bg-slate-100 p-5 mb-4">
                <Megaphone className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No campaigns yet</h3>
              <p className="text-sm text-slate-500 text-center mb-5 max-w-sm">
                Create your first campaign to start engaging with your members.
              </p>
              <Button className="bg-slate-900 hover:bg-slate-800 rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Campaign
              </Button>
            </div>
          ) : (
            <>
              {/* Mobile View */}
              <div className="md:hidden divide-y divide-slate-100">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          campaign.type === 'email' ? 'bg-indigo-100 text-indigo-600' :
                          campaign.type === 'sms' ? 'bg-emerald-100 text-emerald-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {getTypeIcon(campaign.type)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{campaign.name}</p>
                          <p className="text-xs text-slate-500">{campaign.targetAudience}</p>
                        </div>
                      </div>
                      {getStatusBadge(campaign.status)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>{campaign.sentCount} sent</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span>{campaign.openRate}% opened</span>
                      <span className="w-1 h-1 bg-slate-300 rounded-full" />
                      <span>{campaign.clickRate}% clicked</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View */}
              <div className="hidden md:block">
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-500 border-b border-slate-100 bg-slate-50/50">
                    <tr>
                      <th className="px-5 py-3 font-medium">Campaign</th>
                      <th className="px-5 py-3 font-medium">Type</th>
                      <th className="px-5 py-3 font-medium">Audience</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Sent</th>
                      <th className="px-5 py-3 font-medium">Open Rate</th>
                      <th className="px-5 py-3 font-medium">Click Rate</th>
                      <th className="px-5 py-3 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {campaigns.map((campaign) => (
                      <tr key={campaign.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-4">
                          <p className="font-medium text-slate-900">{campaign.name}</p>
                          <p className="text-xs text-slate-500">{formatDate(campaign.createdAt)}</p>
                        </td>
                        <td className="px-5 py-4">
                          <div className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${
                            campaign.type === 'email' ? 'bg-indigo-50 text-indigo-600' :
                            campaign.type === 'sms' ? 'bg-emerald-50 text-emerald-600' :
                            'bg-slate-50 text-slate-600'
                          }`}>
                            {getTypeIcon(campaign.type)}
                            <span className="capitalize text-xs font-medium">{campaign.type}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{campaign.targetAudience}</td>
                        <td className="px-5 py-4">{getStatusBadge(campaign.status)}</td>
                        <td className="px-5 py-4 text-slate-900 font-medium">{campaign.sentCount}</td>
                        <td className="px-5 py-4">
                          <span className={campaign.openRate > 30 ? 'text-emerald-600 font-medium' : 'text-slate-600'}>
                            {campaign.openRate}%
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className={campaign.clickRate > 10 ? 'text-emerald-600 font-medium' : 'text-slate-600'}>
                            {campaign.clickRate}%
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                <MoreHorizontal className="h-4 w-4 text-slate-400" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>Duplicate</DropdownMenuItem>
                              {campaign.status === 'active' && (
                                <DropdownMenuItem>Pause</DropdownMenuItem>
                              )}
                              {campaign.status === 'paused' && (
                                <DropdownMenuItem>Resume</DropdownMenuItem>
                              )}
                              {campaign.status === 'draft' && (
                                <DropdownMenuItem>Send Now</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
