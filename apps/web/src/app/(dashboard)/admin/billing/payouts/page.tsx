'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Wallet,
  Plus,
  Search,
  Loader2,
  MoreHorizontal,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  User,
  Building2,
  Calendar,
  X,
  DollarSign,
  ArrowUpRight,
  TrendingUp,
  Download,
  Eye,
  ExternalLink,
  Settings,
  Percent,
  ChevronDown,
  ArrowUpDown,
  Check,
  Calculator,
  RefreshCw,
  Send,
  Users,
  Repeat,
  Infinity,
  RotateCcw,
  Trophy,
  Briefcase,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

interface Payout {
  id: string;
  amount: number;
  status: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELLED';
  description: string | null;
  recipientType: 'gym' | 'instructor';
  recipientId: string | null;
  scheduledAt: string | null;
  processedAt: string | null;
  createdAt: string;
  payoutType?: 'one_time' | 'recurring' | 'permanent';
  frequency?: 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly';
  endDate?: string | null;
  category?: PayoutCategory;
  recipient?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    hourlyRate?: number;
  } | null;
  breakdown?: PayoutBreakdownItem[];
}

interface PayoutBreakdownItem {
  id: string;
  description: string;
  date: string;
  hours?: number;
  rate?: number;
  amount: number;
  type: 'class' | 'pt_session' | 'commission' | 'bonus' | 'other';
}

interface Instructor {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  hourlyRate: number | null;
  totalClasses?: number;
  totalHours?: number;
  pendingEarnings?: number;
  revenueSplit?: number;
}

interface PayoutStats {
  totalPayouts: number;
  pendingCount: number;
  processingCount: number;
  paidCount: number;
  failedCount: number;
  totalAmount: number;
  thisMonthAmount: number;
  pendingAmount: number;
}

type SortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc';
type ViewMode = 'payouts' | 'trainers';
type PayoutCategory = 'freelancers' | 'refunds' | 'commissions';

const PAYOUT_CATEGORIES = [
  {
    value: 'freelancers' as PayoutCategory,
    label: 'Freelancers & Creators',
    description: 'Payments to contractors, trainers, and content creators',
    icon: 'Users'
  },
  {
    value: 'refunds' as PayoutCategory,
    label: 'Customer Refunds',
    description: 'Membership cancellations and service refunds',
    icon: 'RotateCcw'
  },
  {
    value: 'commissions' as PayoutCategory,
    label: 'Commissions & Prizes',
    description: 'Sales commissions, prizes, and dividends',
    icon: 'Trophy'
  },
];

const PAYOUT_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  { value: 'PROCESSING', label: 'Processing', color: 'bg-blue-100 text-blue-700', icon: ArrowUpRight },
  { value: 'PAID', label: 'Paid', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  { value: 'FAILED', label: 'Failed', color: 'bg-red-100 text-red-700', icon: XCircle },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-slate-100 text-slate-500', icon: XCircle },
];

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest First' },
  { value: 'date_asc', label: 'Oldest First' },
  { value: 'amount_desc', label: 'Highest Amount' },
  { value: 'amount_asc', label: 'Lowest Amount' },
];

const DEFAULT_REVENUE_SPLIT = 70; // Default 70% to trainer

export default function PayoutsPage() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [stats, setStats] = useState<PayoutStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [viewMode, setViewMode] = useState<ViewMode>('payouts');
  const [categoryTab, setCategoryTab] = useState<PayoutCategory>('freelancers');
  const [error, setError] = useState<string | null>(null);
  const [selectedPayouts, setSelectedPayouts] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [viewingPayout, setViewingPayout] = useState<Payout | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [payoutForm, setPayoutForm] = useState({
    amount: '',
    recipientType: 'gym' as 'gym' | 'instructor',
    recipientId: '',
    description: '',
    scheduledAt: '',
    payoutType: 'one_time' as 'one_time' | 'recurring' | 'permanent',
    frequency: 'monthly' as 'weekly' | 'bi_weekly' | 'monthly' | 'quarterly',
    endDate: '',
    category: 'freelancers' as PayoutCategory,
  });

  // Settings state
  const [revenueSplit, setRevenueSplit] = useState(DEFAULT_REVENUE_SPLIT);

  useEffect(() => {
    fetchPayouts();
    fetchInstructors();
  }, []);

  const fetchPayouts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/payouts');
      const data = await response.json();

      if (data.success) {
        // Add mock breakdown and category data for demo
        const categories: PayoutCategory[] = ['freelancers', 'refunds', 'commissions'];
        const payoutsWithBreakdown = data.data.payouts.map((p: Payout, index: number) => ({
          ...p,
          breakdown: p.recipientType === 'instructor' ? generateMockBreakdown(Number(p.amount)) : [],
          // Assign category based on recipient type or cycle through for demo
          category: p.category || (p.recipientType === 'instructor' ? 'freelancers' : categories[index % 3]),
        }));
        setPayouts(payoutsWithBreakdown);
        setStats(data.data.stats);
      } else {
        setError(data.error?.message || 'Failed to load payouts');
      }
    } catch {
      setError('Failed to load payouts');
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockBreakdown = (totalAmount: number): PayoutBreakdownItem[] => {
    const items: PayoutBreakdownItem[] = [];
    let remaining = totalAmount;
    const today = new Date();

    // Generate 3-5 class entries
    const numClasses = Math.floor(Math.random() * 3) + 3;
    for (let i = 0; i < numClasses; i++) {
      const hours = Math.random() > 0.5 ? 1 : 1.5;
      const rate = 30 + Math.floor(Math.random() * 20);
      const amount = Math.min(hours * rate, remaining * 0.25);
      remaining -= amount;

      const date = new Date(today);
      date.setDate(date.getDate() - Math.floor(Math.random() * 14));

      items.push({
        id: `class-${i}`,
        description: ['Morning Yoga', 'HIIT Class', 'Spin Class', 'Pilates', 'CrossFit'][Math.floor(Math.random() * 5)],
        date: date.toISOString(),
        hours,
        rate,
        amount: Math.round(amount * 100) / 100,
        type: 'class',
      });
    }

    // Add remaining as commission
    if (remaining > 0) {
      items.push({
        id: 'commission',
        description: 'Personal Training Revenue Share',
        date: today.toISOString(),
        amount: Math.round(remaining * 100) / 100,
        type: 'commission',
      });
    }

    return items;
  };

  const fetchInstructors = async () => {
    try {
      const response = await fetch('/api/admin/staff');
      const data = await response.json();
      if (data.success) {
        const staff = data.data.staff || data.data;
        const instructorList = staff
          .filter((s: { role: string }) => s.role === 'INSTRUCTOR')
          .map((i: Instructor) => ({
            ...i,
            // Mock data for demo
            totalClasses: Math.floor(Math.random() * 20) + 5,
            totalHours: Math.floor(Math.random() * 30) + 10,
            pendingEarnings: Math.floor(Math.random() * 500) + 200,
            revenueSplit: DEFAULT_REVENUE_SPLIT,
          }));
        setInstructors(instructorList);
      }
    } catch (error) {
      console.error('Failed to fetch instructors:', error);
    }
  };

  const openModal = (instructor?: Instructor) => {
    if (instructor) {
      setPayoutForm({
        amount: instructor.pendingEarnings?.toString() || '',
        recipientType: 'instructor',
        recipientId: instructor.id,
        description: `Payout for ${instructor.firstName} ${instructor.lastName}`,
        scheduledAt: '',
        payoutType: 'one_time',
        frequency: 'monthly',
        endDate: '',
        category: 'freelancers',
      });
    } else {
      setPayoutForm({
        amount: '',
        recipientType: 'gym',
        recipientId: '',
        description: '',
        scheduledAt: '',
        payoutType: 'one_time',
        frequency: 'monthly',
        endDate: '',
        category: categoryTab, // Use current tab as default
      });
    }
    setShowModal(true);
  };

  const openDetailModal = (payout: Payout) => {
    setViewingPayout(payout);
    setShowDetailModal(true);
  };

  const handleSavePayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(payoutForm.amount),
          recipientType: payoutForm.recipientType,
          recipientId: payoutForm.recipientType === 'instructor' ? payoutForm.recipientId : undefined,
          description: payoutForm.description || undefined,
          scheduledAt: payoutForm.scheduledAt || undefined,
          payoutType: payoutForm.payoutType,
          frequency: payoutForm.payoutType !== 'one_time' ? payoutForm.frequency : undefined,
          endDate: payoutForm.payoutType === 'recurring' ? payoutForm.endDate : undefined,
          category: payoutForm.category,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowModal(false);
        fetchPayouts();
        fetchInstructors();
      } else {
        setError(data.error?.message || 'Failed to create payout');
      }
    } catch {
      setError('Failed to create payout');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/payouts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (data.success) {
        fetchPayouts();
        if (viewingPayout?.id === id) {
          setViewingPayout({ ...viewingPayout, status: status as Payout['status'] });
        }
      } else {
        setError(data.error?.message || 'Failed to update payout');
      }
    } catch {
      setError('Failed to update payout');
    }
  };

  const handleDeletePayout = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this payout?')) return;

    try {
      const response = await fetch(`/api/admin/payouts/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        fetchPayouts();
        if (showDetailModal && viewingPayout?.id === id) {
          setShowDetailModal(false);
          setViewingPayout(null);
        }
      } else {
        setError(data.error?.message || 'Failed to cancel payout');
      }
    } catch {
      setError('Failed to cancel payout');
    }
  };

  const handleBulkProcess = async () => {
    const pendingPayouts = selectedPayouts.filter(id => {
      const payout = payouts.find(p => p.id === id);
      return payout?.status === 'PENDING';
    });

    if (pendingPayouts.length === 0) {
      alert('No pending payouts selected to process.');
      return;
    }

    setBulkActionLoading(true);
    try {
      await Promise.all(
        pendingPayouts.map(id =>
          fetch(`/api/admin/payouts/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'PROCESSING' }),
          })
        )
      );
      fetchPayouts();
      setSelectedPayouts([]);
    } catch {
      setError('Failed to process payouts');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleSelectAllPayouts = () => {
    if (selectedPayouts.length === filteredPayouts.length) {
      setSelectedPayouts([]);
    } else {
      setSelectedPayouts(filteredPayouts.map(p => p.id));
    }
  };

  const exportPayouts = () => {
    const data = filteredPayouts.map(p => ({
      'Date': formatDate(p.createdAt),
      'Recipient': p.recipientType === 'instructor' && p.recipient
        ? `${p.recipient.firstName} ${p.recipient.lastName}`
        : 'Gym',
      'Type': p.recipientType,
      'Amount': Number(p.amount),
      'Status': p.status,
      'Description': p.description || '',
      'Processed': p.processedAt ? formatDate(p.processedAt) : '',
    }));

    const headers = Object.keys(data[0] || {});
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => `"${row[h as keyof typeof row]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payouts-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusConfig = (status: string) => {
    return PAYOUT_STATUSES.find(s => s.value === status);
  };

  const getSortedPayouts = (list: Payout[]): Payout[] => {
    const sorted = [...list];
    switch (sortBy) {
      case 'date_desc':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'date_asc':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'amount_desc':
        return sorted.sort((a, b) => Number(b.amount) - Number(a.amount));
      case 'amount_asc':
        return sorted.sort((a, b) => Number(a.amount) - Number(b.amount));
      default:
        return sorted;
    }
  };

  const filteredPayouts = getSortedPayouts(payouts.filter(payout => {
    const matchesStatus = statusFilter === 'all' || payout.status === statusFilter;
    const matchesType = typeFilter === 'all' || payout.recipientType === typeFilter;
    const matchesCategory = payout.category === categoryTab;
    return matchesStatus && matchesType && matchesCategory;
  }));

  const selectedTotalAmount = filteredPayouts
    .filter(p => selectedPayouts.includes(p.id))
    .reduce((sum, p) => sum + Number(p.amount), 0);

  const totalPendingEarnings = instructors.reduce((sum, i) => sum + (i.pendingEarnings || 0), 0);

  return (
    <>
      <Header title="Payouts" description="Manage payouts to gym and trainers" />

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.totalAmount || 0)}</p>
                <p className="text-sm text-slate-500">Total Paid Out</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.thisMonthAmount || 0)}</p>
                <p className="text-sm text-slate-500">This Month</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.pendingAmount || 0)}</p>
                <p className="text-sm text-slate-500">Pending Payouts</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalPendingEarnings)}</p>
                <p className="text-sm text-slate-500">Trainer Earnings Due</p>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Category Tabs */}
        <div className="bg-white rounded-2xl shadow-sm p-2">
          <div className="grid grid-cols-3 gap-2">
            {PAYOUT_CATEGORIES.map((cat) => {
              const categoryPayouts = payouts.filter(p => p.category === cat.value);
              const categoryTotal = categoryPayouts.reduce((sum, p) => sum + Number(p.amount), 0);
              const pendingCount = categoryPayouts.filter(p => p.status === 'PENDING').length;

              return (
                <button
                  key={cat.value}
                  onClick={() => setCategoryTab(cat.value)}
                  className={`relative p-4 rounded-xl text-left transition-all ${
                    categoryTab === cat.value
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    {cat.value === 'freelancers' && (
                      <Users className={`w-5 h-5 ${categoryTab === cat.value ? 'text-white' : 'text-indigo-600'}`} />
                    )}
                    {cat.value === 'refunds' && (
                      <RotateCcw className={`w-5 h-5 ${categoryTab === cat.value ? 'text-white' : 'text-amber-600'}`} />
                    )}
                    {cat.value === 'commissions' && (
                      <Trophy className={`w-5 h-5 ${categoryTab === cat.value ? 'text-white' : 'text-emerald-600'}`} />
                    )}
                    <span className="font-semibold">{cat.label}</span>
                  </div>
                  <p className={`text-xs mb-2 ${categoryTab === cat.value ? 'text-slate-300' : 'text-slate-500'}`}>
                    {cat.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className={`text-lg font-bold ${categoryTab === cat.value ? 'text-white' : 'text-slate-900'}`}>
                      {formatCurrency(categoryTotal)}
                    </span>
                    {pendingCount > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        categoryTab === cat.value ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {pendingCount} pending
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* View Toggle and Filters */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('payouts')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  viewMode === 'payouts'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Wallet className="w-4 h-4" />
                Payouts
              </button>
              <button
                onClick={() => setViewMode('trainers')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  viewMode === 'trainers'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <User className="w-4 h-4" />
                Trainer Splits
              </button>
            </div>

            {viewMode === 'payouts' && (
              <div className="flex-1 flex gap-3 flex-wrap">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm min-w-[130px]"
                >
                  <option value="all">All Status</option>
                  {PAYOUT_STATUSES.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm min-w-[130px]"
                >
                  <option value="all">All Recipients</option>
                  <option value="gym">Gym</option>
                  <option value="instructor">Trainers</option>
                </select>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="rounded-xl">
                      <ArrowUpDown className="w-4 h-4 mr-2" />
                      {SORT_OPTIONS.find(s => s.value === sortBy)?.label}
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {SORT_OPTIONS.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => setSortBy(option.value as SortOption)}
                        className={sortBy === option.value ? 'bg-slate-100' : ''}
                      >
                        {sortBy === option.value && <Check className="w-4 h-4 mr-2" />}
                        {option.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="outline" onClick={exportPayouts} className="rounded-xl">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowSettingsModal(true)} className="rounded-xl">
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
              <Button onClick={() => openModal()} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Create Payout
              </Button>
            </div>
          </div>
        </div>

        {/* Selection Bar for Payouts */}
        {viewMode === 'payouts' && selectedPayouts.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-indigo-900 font-medium">
                {selectedPayouts.length} selected
              </span>
              <span className="text-indigo-600 text-sm">
                ({formatCurrency(selectedTotalAmount)})
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkProcess}
                disabled={bulkActionLoading}
                className="rounded-lg"
              >
                {bulkActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowUpRight className="w-4 h-4 mr-2" />}
                Process Selected
              </Button>
              <Button
                size="sm"
                onClick={() => setSelectedPayouts([])}
                className="bg-slate-900 hover:bg-slate-800 rounded-lg"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Content */}
        {viewMode === 'payouts' ? (
          /* Payouts List */
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : filteredPayouts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="rounded-2xl bg-slate-100 p-5 mb-4">
                  <Wallet className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No payouts found</h3>
                <p className="text-sm text-slate-500 text-center max-w-sm mb-5">
                  Create your first payout to start managing payments to your gym or trainers.
                </p>
                <Button onClick={() => openModal()} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Payout
                </Button>
              </div>
            ) : (
              <>
                {/* Select All Header */}
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                  <button
                    onClick={handleSelectAllPayouts}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      selectedPayouts.length === filteredPayouts.length
                        ? 'bg-slate-900 border-slate-900'
                        : selectedPayouts.length > 0
                        ? 'bg-slate-400 border-slate-400'
                        : 'border-slate-300 hover:border-slate-400'
                    }`}
                  >
                    {selectedPayouts.length > 0 && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <span className="text-sm text-slate-600">
                    {selectedPayouts.length === filteredPayouts.length
                      ? 'All selected'
                      : 'Select all'}
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {filteredPayouts.map((payout) => {
                    const statusConfig = getStatusConfig(payout.status);
                    const StatusIcon = statusConfig?.icon || Clock;
                    const isSelected = selectedPayouts.includes(payout.id);

                    return (
                      <div
                        key={payout.id}
                        className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/50' : ''}`}
                        onClick={() => openDetailModal(payout)}
                      >
                        <div className="flex items-center gap-4">
                          <div onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => setSelectedPayouts(prev =>
                                prev.includes(payout.id)
                                  ? prev.filter(id => id !== payout.id)
                                  : [...prev, payout.id]
                              )}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'bg-slate-900 border-slate-900'
                                  : 'border-slate-300 hover:border-slate-400'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </button>
                          </div>

                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            payout.recipientType === 'instructor' ? 'bg-indigo-100' : 'bg-slate-100'
                          }`}>
                            {payout.recipientType === 'instructor' ? (
                              <User className="w-6 h-6 text-indigo-600" />
                            ) : (
                              <Building2 className="w-6 h-6 text-slate-600" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-semibold text-slate-900">
                                {formatCurrency(Number(payout.amount))}
                              </span>
                              <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium ${statusConfig?.color}`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusConfig?.label}
                              </span>
                              {payout.payoutType === 'recurring' && (
                                <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-700">
                                  <Repeat className="w-3 h-3" />
                                  Recurring
                                </span>
                              )}
                              {payout.payoutType === 'permanent' && (
                                <span className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700">
                                  <Infinity className="w-3 h-3" />
                                  Permanent
                                </span>
                              )}
                              {payout.category && (
                                <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-xs font-medium ${
                                  payout.category === 'freelancers' ? 'bg-indigo-50 text-indigo-600' :
                                  payout.category === 'refunds' ? 'bg-amber-50 text-amber-600' :
                                  'bg-emerald-50 text-emerald-600'
                                }`}>
                                  {payout.category === 'freelancers' && <Users className="w-3 h-3" />}
                                  {payout.category === 'refunds' && <RotateCcw className="w-3 h-3" />}
                                  {payout.category === 'commissions' && <Trophy className="w-3 h-3" />}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              {payout.recipientType === 'instructor' && payout.recipient ? (
                                <span className="font-medium text-slate-700">
                                  {payout.recipient.firstName} {payout.recipient.lastName}
                                </span>
                              ) : (
                                <span>Gym Payout</span>
                              )}
                              {payout.description && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="truncate">{payout.description}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="hidden md:block text-right text-sm text-slate-500 mr-2">
                            {payout.processedAt ? (
                              <p>Paid: {formatDate(payout.processedAt)}</p>
                            ) : payout.scheduledAt ? (
                              <p>Scheduled: {formatDate(payout.scheduledAt)}</p>
                            ) : (
                              <p>Created: {formatDate(payout.createdAt)}</p>
                            )}
                          </div>

                          <div onClick={(e) => e.stopPropagation()}>
                            {payout.status !== 'PAID' && payout.status !== 'CANCELLED' && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                    <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openDetailModal(payout)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {payout.status === 'PENDING' && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(payout.id, 'PROCESSING')}>
                                      <ArrowUpRight className="mr-2 h-4 w-4" />
                                      Start Processing
                                    </DropdownMenuItem>
                                  )}
                                  {payout.status === 'PROCESSING' && (
                                    <DropdownMenuItem onClick={() => handleStatusChange(payout.id, 'PAID')}>
                                      <CheckCircle2 className="mr-2 h-4 w-4" />
                                      Mark as Paid
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => handleDeletePayout(payout.id)}
                                    className="text-red-600"
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Cancel Payout
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        ) : (
          /* Trainer Splits View */
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : instructors.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="rounded-2xl bg-slate-100 p-5 mb-4">
                  <Users className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No trainers found</h3>
                <p className="text-sm text-slate-500 text-center max-w-sm">
                  Add trainers in Staff Management to track their earnings.
                </p>
              </div>
            ) : (
              <>
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                  <p className="text-sm text-slate-600">
                    Showing trainer revenue splits at <strong>{revenueSplit}%</strong> trainer share
                  </p>
                </div>
                <div className="divide-y divide-slate-100">
                  {instructors.map((instructor) => (
                    <div key={instructor.id} className="p-5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                          <User className="w-6 h-6 text-indigo-600" />
                        </div>

                        <div className="flex-1">
                          <Link
                            href={`/admin/staff?id=${instructor.id}`}
                            className="font-semibold text-slate-900 hover:text-indigo-600 inline-flex items-center gap-1"
                          >
                            {instructor.firstName} {instructor.lastName}
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                          <p className="text-sm text-slate-500">{instructor.email}</p>
                        </div>

                        <div className="hidden md:flex gap-8 text-center">
                          <div>
                            <p className="text-lg font-semibold text-slate-900">{instructor.totalClasses}</p>
                            <p className="text-xs text-slate-500">Classes</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-slate-900">{instructor.totalHours}h</p>
                            <p className="text-xs text-slate-500">Hours</p>
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-slate-900">
                              {formatCurrency(instructor.hourlyRate || 0)}
                            </p>
                            <p className="text-xs text-slate-500">Rate/hr</p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xl font-bold text-emerald-600">
                            {formatCurrency(instructor.pendingEarnings || 0)}
                          </p>
                          <p className="text-xs text-slate-500">Pending Earnings</p>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openModal(instructor)}
                          className="rounded-lg"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Pay Out
                        </Button>
                      </div>

                      {/* Mobile Stats */}
                      <div className="md:hidden grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
                        <div className="text-center">
                          <p className="text-lg font-semibold text-slate-900">{instructor.totalClasses}</p>
                          <p className="text-xs text-slate-500">Classes</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-semibold text-slate-900">{instructor.totalHours}h</p>
                          <p className="text-xs text-slate-500">Hours</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-semibold text-slate-900">
                            {formatCurrency(instructor.hourlyRate || 0)}
                          </p>
                          <p className="text-xs text-slate-500">Rate/hr</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Summary Footer */}
                <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm text-slate-600">
                    {instructors.length} trainer{instructors.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    Total Pending: {formatCurrency(totalPendingEarnings)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && viewingPayout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDetailModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-900">Payout Details</h2>
                <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${
                  getStatusConfig(viewingPayout.status)?.color
                }`}>
                  {getStatusConfig(viewingPayout.status)?.label}
                </span>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Recipient Info */}
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                  viewingPayout.recipientType === 'instructor' ? 'bg-indigo-100' : 'bg-slate-100'
                }`}>
                  {viewingPayout.recipientType === 'instructor' ? (
                    <User className="w-7 h-7 text-indigo-600" />
                  ) : (
                    <Building2 className="w-7 h-7 text-slate-600" />
                  )}
                </div>
                <div>
                  {viewingPayout.recipientType === 'instructor' && viewingPayout.recipient ? (
                    <>
                      <p className="font-semibold text-slate-900">
                        {viewingPayout.recipient.firstName} {viewingPayout.recipient.lastName}
                      </p>
                      <p className="text-sm text-slate-500">{viewingPayout.recipient.email}</p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-slate-900">Gym Payout</p>
                      <p className="text-sm text-slate-500">Business account</p>
                    </>
                  )}
                </div>
                <div className="ml-auto text-right">
                  <p className="text-2xl font-bold text-slate-900">
                    {formatCurrency(Number(viewingPayout.amount))}
                  </p>
                  <p className="text-sm text-slate-500">
                    {viewingPayout.processedAt
                      ? `Paid ${formatDate(viewingPayout.processedAt)}`
                      : `Created ${formatDate(viewingPayout.createdAt)}`}
                  </p>
                </div>
              </div>

              {/* Payout Type Info */}
              {(viewingPayout.payoutType === 'recurring' || viewingPayout.payoutType === 'permanent') && (
                <div className={`rounded-xl p-4 ${
                  viewingPayout.payoutType === 'recurring' ? 'bg-indigo-50 border border-indigo-200' : 'bg-purple-50 border border-purple-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {viewingPayout.payoutType === 'recurring' ? (
                      <>
                        <Repeat className="w-4 h-4 text-indigo-600" />
                        <span className="font-medium text-indigo-900">Recurring Payout</span>
                      </>
                    ) : (
                      <>
                        <Infinity className="w-4 h-4 text-purple-600" />
                        <span className="font-medium text-purple-900">Permanent Payout</span>
                      </>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-500">Frequency</p>
                      <p className={viewingPayout.payoutType === 'recurring' ? 'text-indigo-900' : 'text-purple-900'}>
                        {viewingPayout.frequency === 'weekly' && 'Weekly'}
                        {viewingPayout.frequency === 'bi_weekly' && 'Bi-weekly'}
                        {viewingPayout.frequency === 'monthly' && 'Monthly'}
                        {viewingPayout.frequency === 'quarterly' && 'Quarterly'}
                      </p>
                    </div>
                    {viewingPayout.payoutType === 'recurring' && viewingPayout.endDate && (
                      <div>
                        <p className="text-slate-500">Ends</p>
                        <p className="text-indigo-900">{formatDate(viewingPayout.endDate)}</p>
                      </div>
                    )}
                    {viewingPayout.payoutType === 'permanent' && (
                      <div>
                        <p className="text-slate-500">Duration</p>
                        <p className="text-purple-900">Until cancelled</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {viewingPayout.description && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-600">{viewingPayout.description}</p>
                </div>
              )}

              {/* Breakdown for instructor payouts */}
              {viewingPayout.recipientType === 'instructor' && viewingPayout.breakdown && viewingPayout.breakdown.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium mb-3">Earnings Breakdown</p>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-4 py-3 text-left font-medium">Description</th>
                          <th className="px-4 py-3 text-left font-medium">Date</th>
                          <th className="px-4 py-3 text-right font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {viewingPayout.breakdown.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3">
                              <p className="text-slate-900">{item.description}</p>
                              {item.hours && item.rate && (
                                <p className="text-xs text-slate-500">
                                  {item.hours}h x ${item.rate}/hr
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {formatDate(item.date)}
                            </td>
                            <td className="px-4 py-3 text-right font-medium text-slate-900">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50">
                        <tr className="border-t-2 border-slate-200">
                          <td colSpan={2} className="px-4 py-3 font-semibold text-slate-900">Total</td>
                          <td className="px-4 py-3 text-right font-bold text-slate-900">
                            {formatCurrency(Number(viewingPayout.amount))}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                {viewingPayout.status === 'PENDING' && (
                  <Button
                    onClick={() => handleStatusChange(viewingPayout.id, 'PROCESSING')}
                    className="bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                  >
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Start Processing
                  </Button>
                )}
                {viewingPayout.status === 'PROCESSING' && (
                  <Button
                    onClick={() => handleStatusChange(viewingPayout.id, 'PAID')}
                    className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark as Paid
                  </Button>
                )}
                {viewingPayout.status !== 'PAID' && viewingPayout.status !== 'CANCELLED' && (
                  <Button
                    variant="outline"
                    onClick={() => handleDeletePayout(viewingPayout.id)}
                    className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel Payout
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Create Payout</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSavePayout} className="p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={payoutForm.amount}
                  onChange={(e) => setPayoutForm({ ...payoutForm, amount: e.target.value })}
                  required
                  className="rounded-xl"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipientType">Recipient Type</Label>
                <select
                  id="recipientType"
                  value={payoutForm.recipientType}
                  onChange={(e) => setPayoutForm({
                    ...payoutForm,
                    recipientType: e.target.value as 'gym' | 'instructor',
                    recipientId: '',
                  })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                >
                  <option value="gym">Gym</option>
                  <option value="instructor">Trainer</option>
                </select>
              </div>

              {payoutForm.recipientType === 'instructor' && (
                <div className="space-y-2">
                  <Label htmlFor="recipient">Select Trainer</Label>
                  <select
                    id="recipient"
                    value={payoutForm.recipientId}
                    onChange={(e) => setPayoutForm({ ...payoutForm, recipientId: e.target.value })}
                    required
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                  >
                    <option value="">Select trainer...</option>
                    {instructors.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.firstName} {i.lastName}
                        {i.pendingEarnings && ` - ${formatCurrency(i.pendingEarnings)} pending`}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={payoutForm.description}
                  onChange={(e) => setPayoutForm({ ...payoutForm, description: e.target.value })}
                  className="rounded-xl"
                  placeholder="e.g., January commission"
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYOUT_CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setPayoutForm({ ...payoutForm, category: cat.value })}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        payoutForm.category === cat.value
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {cat.value === 'freelancers' && <Users className="w-4 h-4 text-indigo-600" />}
                        {cat.value === 'refunds' && <RotateCcw className="w-4 h-4 text-amber-600" />}
                        {cat.value === 'commissions' && <Trophy className="w-4 h-4 text-emerald-600" />}
                        <span className={`text-xs font-medium ${payoutForm.category === cat.value ? 'text-slate-900' : 'text-slate-700'}`}>
                          {cat.label.split(' ')[0]}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payout Type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'one_time', label: 'One-time', desc: 'Single payout' },
                    { value: 'recurring', label: 'Recurring', desc: 'Repeats on schedule' },
                    { value: 'permanent', label: 'Permanent', desc: 'Ongoing until cancelled' },
                  ].map((type) => (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setPayoutForm({ ...payoutForm, payoutType: type.value as typeof payoutForm.payoutType })}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        payoutForm.payoutType === type.value
                          ? 'border-slate-900 bg-slate-50'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <p className={`text-sm font-medium ${payoutForm.payoutType === type.value ? 'text-slate-900' : 'text-slate-700'}`}>
                        {type.label}
                      </p>
                      <p className="text-xs text-slate-500">{type.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {(payoutForm.payoutType === 'recurring' || payoutForm.payoutType === 'permanent') && (
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency</Label>
                  <select
                    id="frequency"
                    value={payoutForm.frequency}
                    onChange={(e) => setPayoutForm({ ...payoutForm, frequency: e.target.value as typeof payoutForm.frequency })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="bi_weekly">Bi-weekly (Every 2 weeks)</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                  </select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="scheduledAt">
                  {payoutForm.payoutType === 'one_time' ? 'Schedule (optional)' : 'Start Date'}
                </Label>
                <Input
                  id="scheduledAt"
                  type="date"
                  value={payoutForm.scheduledAt}
                  onChange={(e) => setPayoutForm({ ...payoutForm, scheduledAt: e.target.value })}
                  className="rounded-xl"
                  min={new Date().toISOString().split('T')[0]}
                  required={payoutForm.payoutType !== 'one_time'}
                />
                {payoutForm.payoutType === 'one_time' && (
                  <p className="text-xs text-slate-500">Leave empty to process immediately</p>
                )}
              </div>

              {payoutForm.payoutType === 'recurring' && (
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={payoutForm.endDate}
                    onChange={(e) => setPayoutForm({ ...payoutForm, endDate: e.target.value })}
                    className="rounded-xl"
                    min={payoutForm.scheduledAt || new Date().toISOString().split('T')[0]}
                    required
                  />
                  <p className="text-xs text-slate-500">When the recurring payouts should stop</p>
                </div>
              )}

              {payoutForm.payoutType === 'permanent' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-sm text-amber-800">
                    <strong>Permanent payout:</strong> This will continue indefinitely until manually cancelled.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : payoutForm.payoutType === 'recurring' ? (
                    <>
                      <Repeat className="mr-2 h-4 w-4" />
                      Create Recurring Payout
                    </>
                  ) : payoutForm.payoutType === 'permanent' ? (
                    <>
                      <Infinity className="mr-2 h-4 w-4" />
                      Create Permanent Payout
                    </>
                  ) : (
                    'Create Payout'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSettingsModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Payout Settings</h2>
              <button onClick={() => setShowSettingsModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <div className="p-5 space-y-6">
              <div className="space-y-3">
                <Label>Default Trainer Revenue Split</Label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={revenueSplit}
                      onChange={(e) => setRevenueSplit(parseInt(e.target.value) || 0)}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Percent className="w-4 h-4 text-slate-400" />
                    <span className="text-slate-600">to trainer</span>
                  </div>
                </div>
                <p className="text-sm text-slate-500">
                  Trainers receive {revenueSplit}% of class and PT session revenue.
                  Gym retains {100 - revenueSplit}%.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Calculator className="w-5 h-5 text-slate-600" />
                  <span className="font-medium text-slate-900">Example Calculation</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Class revenue:</span>
                    <span className="text-slate-900">$100.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Trainer share ({revenueSplit}%):</span>
                    <span className="text-emerald-600 font-medium">{formatCurrency(100 * revenueSplit / 100)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Gym share ({100 - revenueSplit}%):</span>
                    <span className="text-slate-900 font-medium">{formatCurrency(100 * (100 - revenueSplit) / 100)}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowSettingsModal(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    alert('Settings saved!');
                    setShowSettingsModal(false);
                  }}
                  className="bg-slate-900 hover:bg-slate-800 rounded-xl"
                >
                  Save Settings
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
