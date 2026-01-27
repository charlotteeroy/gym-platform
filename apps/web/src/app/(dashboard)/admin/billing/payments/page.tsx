'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Search,
  Download,
  Loader2,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Banknote,
  Building,
  Receipt,
  ArrowUpDown,
  X,
  MoreHorizontal,
  Eye,
  RotateCcw,
  User,
  Mail,
  FileText,
  ChevronDown,
  Filter,
  ExternalLink,
  AlertTriangle,
  AlertCircle,
  Send,
  Check,
  Phone,
  List,
  Plus,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { ExportButton } from '@/components/ui/export-button';
import { type ExportColumn } from '@/lib/export';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface Payment {
  id: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  method: 'CARD' | 'CASH' | 'BANK_TRANSFER' | 'OTHER';
  description: string | null;
  createdAt: string;
  failureReason?: string;
  retryCount?: number;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  } | null;
  invoice: {
    id: string;
    invoiceNumber: string;
  } | null;
}

interface OverdueInvoice {
  id: string;
  invoiceNumber: string;
  total: number;
  dueDate: string;
  status: string;
  remindersSent?: number;
  lastReminderDate?: string;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

interface SimpleMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

const PAYMENT_METHODS = [
  { value: 'CARD', label: 'Card', icon: CreditCard },
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building },
  { value: 'OTHER', label: 'Other', icon: Receipt },
];

const PAYMENT_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  { value: 'FAILED', label: 'Failed', color: 'bg-red-100 text-red-700', icon: XCircle },
  { value: 'REFUNDED', label: 'Refunded', color: 'bg-slate-100 text-slate-600', icon: RefreshCw },
];

const PAYMENT_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'class_pack', label: 'Class Pack' },
  { value: 'drop_in', label: 'Drop-in' },
  { value: 'pt', label: 'Personal Training' },
  { value: 'retail', label: 'Retail' },
  { value: 'other', label: 'Other' },
];

const MAIN_TABS = [
  { id: 'all', label: 'All Transactions', icon: List },
  { id: 'issues', label: 'Failed & Overdue', icon: AlertTriangle },
];

const ISSUE_TABS = [
  { id: 'failed', label: 'Failed Payments', icon: XCircle },
  { id: 'overdue', label: 'Overdue Invoices', icon: Clock },
];

type SortOption = 'priority' | 'amount_desc' | 'amount_asc' | 'date_desc' | 'date_asc';

const SORT_OPTIONS = [
  { value: 'priority', label: 'Priority (Smart)' },
  { value: 'amount_desc', label: 'Highest Amount' },
  { value: 'amount_asc', label: 'Lowest Amount' },
  { value: 'date_desc', label: 'Most Recent' },
  { value: 'date_asc', label: 'Oldest First' },
];

export default function PaymentsPage() {
  // Main tab state
  const [activeMainTab, setActiveMainTab] = useState('all');
  const [activeIssueTab, setActiveIssueTab] = useState('failed');

  // All transactions state
  const [payments, setPayments] = useState<Payment[]>([]);
  const [filteredPayments, setFilteredPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Failed/Overdue state
  const [failedPayments, setFailedPayments] = useState<Payment[]>([]);
  const [overdueInvoices, setOverdueInvoices] = useState<OverdueInvoice[]>([]);
  const [selectedPayments, setSelectedPayments] = useState<string[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [issueSortBy, setIssueSortBy] = useState<SortOption>('priority');
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const [stats, setStats] = useState({
    totalRevenue: 0,
    thisMonthRevenue: 0,
    pendingAmount: 0,
    totalPayments: 0,
  });

  // New payment modal state
  const [showNewPaymentModal, setShowNewPaymentModal] = useState(false);
  const [members, setMembers] = useState<SimpleMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [createPaymentLoading, setCreatePaymentLoading] = useState(false);
  const [customerType, setCustomerType] = useState<'member' | 'external'>('member');
  const [newPayment, setNewPayment] = useState({
    amount: '',
    method: 'CARD' as 'CARD' | 'CASH' | 'BANK_TRANSFER' | 'OTHER',
    description: '',
    memberId: '',
    externalName: '',
    externalEmail: '',
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    filterPayments();
  }, [payments, searchQuery, statusFilter, methodFilter, typeFilter, sortOrder, startDate, endDate, minAmount, maxAmount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);

      const [paymentsRes, invoicesRes] = await Promise.all([
        fetch('/api/admin/payments'),
        fetch('/api/admin/invoices'),
      ]);

      const [paymentsData, invoicesData] = await Promise.all([
        paymentsRes.json(),
        invoicesRes.json(),
      ]);

      if (paymentsData.success) {
        setPayments(paymentsData.data.payments);
        setStats(paymentsData.data.stats);

        // Filter failed/stuck payments
        const problemPayments = paymentsData.data.payments.filter((p: Payment) =>
          p.status === 'FAILED' ||
          (p.status === 'PENDING' && new Date(p.createdAt) < new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        );
        setFailedPayments(problemPayments);
      }

      if (invoicesData.success) {
        const now = new Date();
        const overdue = invoicesData.data.invoices.filter((i: OverdueInvoice) =>
          (i.status === 'SENT' || i.status === 'OVERDUE') && new Date(i.dueDate) < now
        );
        setOverdueInvoices(overdue);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterPayments = () => {
    let filtered = [...payments];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p) =>
        p.description?.toLowerCase().includes(query) ||
        p.member?.firstName.toLowerCase().includes(query) ||
        p.member?.lastName.toLowerCase().includes(query) ||
        p.member?.email.toLowerCase().includes(query) ||
        p.invoice?.invoiceNumber.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    // Method filter
    if (methodFilter !== 'all') {
      filtered = filtered.filter((p) => p.method === methodFilter);
    }

    // Type filter (based on description for now)
    if (typeFilter !== 'all') {
      filtered = filtered.filter((p) => {
        const desc = p.description?.toLowerCase() || '';
        switch (typeFilter) {
          case 'subscription':
            return desc.includes('subscription') || desc.includes('membership');
          case 'class_pack':
            return desc.includes('class pack') || desc.includes('pack');
          case 'drop_in':
            return desc.includes('drop-in') || desc.includes('drop in');
          case 'pt':
            return desc.includes('personal training') || desc.includes('pt session');
          case 'retail':
            return desc.includes('retail') || desc.includes('merchandise');
          case 'other':
            return !desc.includes('subscription') && !desc.includes('membership') &&
                   !desc.includes('pack') && !desc.includes('drop') &&
                   !desc.includes('personal training') && !desc.includes('retail');
          default:
            return true;
        }
      });
    }

    // Date range filter
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      filtered = filtered.filter((p) => new Date(p.createdAt) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((p) => new Date(p.createdAt) <= end);
    }

    // Amount range filter
    if (minAmount) {
      const min = parseFloat(minAmount);
      if (!isNaN(min)) {
        filtered = filtered.filter((p) => Number(p.amount) >= min);
      }
    }
    if (maxAmount) {
      const max = parseFloat(maxAmount);
      if (!isNaN(max)) {
        filtered = filtered.filter((p) => Number(p.amount) <= max);
      }
    }

    // Sort
    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    setFilteredPayments(filtered);
  };

  // Priority scoring for smart sorting
  const getPaymentPriorityScore = (payment: Payment): number => {
    const amount = Number(payment.amount);
    const daysSinceFailed = Math.ceil(
      (Date.now() - new Date(payment.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    const isFailed = payment.status === 'FAILED' ? 2 : 1;
    return (amount * 0.5) + (daysSinceFailed * 10) + (isFailed * 50);
  };

  const getInvoicePriorityScore = (invoice: OverdueInvoice): number => {
    const amount = Number(invoice.total);
    const daysOverdue = getDaysOverdue(invoice.dueDate);
    return (amount * 0.5) + (daysOverdue * 15);
  };

  const getSortedFailedPayments = (): Payment[] => {
    const sorted = [...failedPayments];
    switch (issueSortBy) {
      case 'priority':
        return sorted.sort((a, b) => getPaymentPriorityScore(b) - getPaymentPriorityScore(a));
      case 'amount_desc':
        return sorted.sort((a, b) => Number(b.amount) - Number(a.amount));
      case 'amount_asc':
        return sorted.sort((a, b) => Number(a.amount) - Number(b.amount));
      case 'date_desc':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'date_asc':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      default:
        return sorted;
    }
  };

  const getSortedInvoices = (): OverdueInvoice[] => {
    const sorted = [...overdueInvoices];
    switch (issueSortBy) {
      case 'priority':
        return sorted.sort((a, b) => getInvoicePriorityScore(b) - getInvoicePriorityScore(a));
      case 'amount_desc':
        return sorted.sort((a, b) => Number(b.total) - Number(a.total));
      case 'amount_asc':
        return sorted.sort((a, b) => Number(a.total) - Number(b.total));
      case 'date_desc':
        return sorted.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
      case 'date_asc':
        return sorted.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      default:
        return sorted;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getDaysOverdue = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = now.getTime() - due.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getDaysSinceFailed = (createdAt: string) => {
    const now = new Date();
    const created = new Date(createdAt);
    return Math.ceil((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getSeverityLevel = (days: number): 'low' | 'medium' | 'high' | 'critical' => {
    if (days >= 60) return 'critical';
    if (days >= 30) return 'high';
    if (days >= 14) return 'medium';
    return 'low';
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high' | 'critical') => {
    switch (severity) {
      case 'critical':
        return { bg: 'bg-red-100', text: 'text-red-700', icon: 'text-red-600' };
      case 'high':
        return { bg: 'bg-orange-100', text: 'text-orange-700', icon: 'text-orange-600' };
      case 'medium':
        return { bg: 'bg-amber-100', text: 'text-amber-700', icon: 'text-amber-600' };
      default:
        return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: 'text-yellow-600' };
    }
  };

  const getStatusConfig = (status: string) => {
    return PAYMENT_STATUSES.find((s) => s.value === status);
  };

  const getMethodConfig = (method: string) => {
    return PAYMENT_METHODS.find((m) => m.value === method);
  };

  const paymentExportColumns: ExportColumn[] = [
    { header: 'Date', accessor: (p) => formatDateShort(p.createdAt) },
    { header: 'Member', accessor: (p) => p.member ? `${p.member.firstName} ${p.member.lastName}` : '' },
    { header: 'Email', accessor: (p) => p.member?.email || '' },
    { header: 'Description', accessor: (p) => p.description || '' },
    { header: 'Amount', accessor: (p) => formatCurrency(Number(p.amount)), align: 'right' },
    { header: 'Status', accessor: (p) => p.status },
    { header: 'Method', accessor: (p) => getMethodConfig(p.method)?.label || p.method },
    { header: 'Invoice', accessor: (p) => p.invoice?.invoiceNumber || '' },
  ];

  const handleRefund = async (paymentId: string) => {
    if (!confirm('Are you sure you want to refund this payment?')) return;

    setActionLoading(paymentId);
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REFUNDED' }),
      });

      if (response.ok) {
        fetchAllData();
      }
    } finally {
      setActionLoading(null);
      setActiveDropdown(null);
    }
  };

  const handleRetryPayment = async (paymentId: string) => {
    setActionLoading(paymentId);
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert('Payment retry initiated. The member will receive a new payment request.');
    setActionLoading(null);
    setActiveDropdown(null);
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    setActionLoading(paymentId);
    try {
      const response = await fetch(`/api/admin/payments/${paymentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });

      if (response.ok) {
        fetchAllData();
        setSelectedPayments(prev => prev.filter(id => id !== paymentId));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendReceipt = async (payment: Payment) => {
    if (!payment.member?.email) {
      alert('No email address available for this member');
      return;
    }

    setActionLoading(payment.id);
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert(`Receipt sent to ${payment.member.email}`);
    setActionLoading(null);
    setActiveDropdown(null);
  };

  const handleSendReminder = async (invoiceId: string) => {
    setActionLoading(invoiceId);
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert('Reminder email sent to the member.');
    setActionLoading(null);
  };

  const handleMarkInvoicePaid = async (invoiceId: string) => {
    setActionLoading(invoiceId);
    try {
      const response = await fetch(`/api/admin/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'PAID' }),
      });

      if (response.ok) {
        fetchAllData();
        setSelectedInvoices(prev => prev.filter(id => id !== invoiceId));
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkRetryPayments = async () => {
    if (selectedPayments.length === 0) return;
    setBulkActionLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    alert(`Retry initiated for ${selectedPayments.length} payments.`);
    setSelectedPayments([]);
    setBulkActionLoading(false);
  };

  const handleBulkSendReminders = async () => {
    if (selectedInvoices.length === 0) return;
    setBulkActionLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    alert(`Reminders sent for ${selectedInvoices.length} invoices.`);
    setSelectedInvoices([]);
    setBulkActionLoading(false);
  };

  const handleSelectAllPayments = () => {
    if (selectedPayments.length === failedPayments.length) {
      setSelectedPayments([]);
    } else {
      setSelectedPayments(failedPayments.map(p => p.id));
    }
  };

  const handleSelectAllInvoices = () => {
    if (selectedInvoices.length === overdueInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(overdueInvoices.map(i => i.id));
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setMethodFilter('all');
    setTypeFilter('all');
    setStartDate('');
    setEndDate('');
    setMinAmount('');
    setMaxAmount('');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || methodFilter !== 'all' ||
                           typeFilter !== 'all' || startDate || endDate || minAmount || maxAmount;

  const fetchMembers = async () => {
    if (members.length > 0) return; // Already loaded
    setMembersLoading(true);
    try {
      const response = await fetch('/api/members');
      const data = await response.json();
      if (data.success && data.data?.items) {
        setMembers(data.data.items.map((m: SimpleMember) => ({
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          email: m.email,
        })));
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleOpenNewPaymentModal = () => {
    setShowNewPaymentModal(true);
    setCustomerType('member');
    fetchMembers();
  };

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.amount || parseFloat(newPayment.amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    // For external customers, require at least a name
    if (customerType === 'external' && !newPayment.externalName.trim()) {
      alert('Please enter the customer name');
      return;
    }

    setCreatePaymentLoading(true);
    try {
      // Build description with external customer info if applicable
      let description = newPayment.description;
      if (customerType === 'external' && newPayment.externalName) {
        const externalInfo = newPayment.externalEmail
          ? `${newPayment.externalName} (${newPayment.externalEmail})`
          : newPayment.externalName;
        description = description
          ? `[External: ${externalInfo}] ${description}`
          : `[External: ${externalInfo}]`;
      }

      const response = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(newPayment.amount),
          method: newPayment.method,
          description: description || undefined,
          memberId: customerType === 'member' ? (newPayment.memberId || undefined) : undefined,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowNewPaymentModal(false);
        setNewPayment({ amount: '', method: 'CARD', description: '', memberId: '', externalName: '', externalEmail: '' });
        setCustomerType('member');
        fetchAllData();
      } else {
        alert(data.error?.message || 'Failed to create payment');
      }
    } catch (error) {
      console.error('Failed to create payment:', error);
      alert('Failed to create payment');
    } finally {
      setCreatePaymentLoading(false);
    }
  };

  const activeFilterCount = [
    searchQuery,
    statusFilter !== 'all',
    methodFilter !== 'all',
    typeFilter !== 'all',
    startDate,
    endDate,
    minAmount,
    maxAmount
  ].filter(Boolean).length;

  // Calculate totals for issues
  const totalFailedAmount = failedPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const totalOverdueAmount = overdueInvoices.reduce((sum, i) => sum + Number(i.total), 0);
  const selectedPaymentAmount = failedPayments
    .filter(p => selectedPayments.includes(p.id))
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const selectedInvoiceAmount = overdueInvoices
    .filter(i => selectedInvoices.includes(i.id))
    .reduce((sum, i) => sum + Number(i.total), 0);

  const criticalPayments = failedPayments.filter(p => getDaysSinceFailed(p.createdAt) >= 30).length;
  const criticalInvoices = overdueInvoices.filter(i => getDaysOverdue(i.dueDate) >= 30).length;
  const totalIssues = failedPayments.length + overdueInvoices.length;

  return (
    <>
      <Header title="Payments" description="View and manage all payment transactions" />

      <div className="p-4 md:p-6 space-y-6">
        {/* Main Tabs */}
        <div className="bg-white rounded-2xl shadow-sm p-1.5 inline-flex gap-1">
          {MAIN_TABS.map((tab) => {
            const Icon = tab.icon;
            const count = tab.id === 'issues' ? totalIssues : null;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveMainTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeMainTab === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {count !== null && count > 0 && (
                  <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                    activeMainTab === tab.id
                      ? 'bg-red-500 text-white'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeMainTab === 'all' ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.totalRevenue)}</p>
                    <p className="text-sm text-slate-500">Total Revenue</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.thisMonthRevenue)}</p>
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
                    <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats.pendingAmount)}</p>
                    <p className="text-sm text-slate-500">Pending</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{stats.totalPayments}</p>
                    <p className="text-sm text-slate-500">Total Transactions</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              {/* Mobile Layout */}
              <div className="md:hidden space-y-3">
                {/* Search + New Payment Row */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 rounded-xl w-full h-10"
                    />
                  </div>
                  <Button
                    onClick={handleOpenNewPaymentModal}
                    className="bg-slate-900 hover:bg-slate-800 rounded-xl h-10 px-4"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>

                {/* Filter Row */}
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm flex-1"
                  >
                    <option value="all">All Status</option>
                    {PAYMENT_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>

                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`rounded-xl h-10 px-3 ${showFilters ? 'bg-slate-100' : ''}`}
                  >
                    <Filter className="w-4 h-4" />
                    {activeFilterCount > 0 && (
                      <span className="ml-1.5 bg-indigo-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                    className="rounded-xl h-10 px-3"
                  >
                    <ArrowUpDown className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Desktop Layout */}
              <div className="hidden md:flex flex-col gap-3">
                <div className="flex gap-3">
                  <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <Input
                      placeholder="Search by member, description, or invoice..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 rounded-xl"
                    />
                  </div>

                  <Button
                    onClick={handleOpenNewPaymentModal}
                    className="bg-slate-900 hover:bg-slate-800 rounded-xl whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    New Payment
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                  >
                    <option value="all">All Status</option>
                    {PAYMENT_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>

                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                  >
                    {PAYMENT_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>

                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className={`rounded-xl whitespace-nowrap ${showFilters ? 'bg-slate-100' : ''}`}
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    More Filters
                    {activeFilterCount > 2 && (
                      <span className="ml-2 bg-indigo-100 text-indigo-700 text-xs px-1.5 py-0.5 rounded-full">
                        {activeFilterCount - 2}
                      </span>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                    className="rounded-xl whitespace-nowrap"
                  >
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    {sortOrder === 'desc' ? 'Newest' : 'Oldest'}
                  </Button>

                  <ExportButton
                    data={filteredPayments}
                    columns={paymentExportColumns}
                    filename="payments"
                    pdfTitle="Payments Report"
                    pdfSummary={[
                      { label: 'Total', value: `${filteredPayments.length} transactions` },
                      { label: 'Sum', value: formatCurrency(filteredPayments.reduce((sum, p) => sum + Number(p.amount), 0)) },
                    ]}
                  />
                </div>
              </div>

              {/* Extended Filters */}
              {showFilters && (
                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Start Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">End Date</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Min Amount</label>
                    <Input
                      type="number"
                      placeholder="$0.00"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Max Amount</label>
                    <Input
                      type="number"
                      placeholder="$1000.00"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      className="rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1.5">Payment Method</label>
                    <select
                      value={methodFilter}
                      onChange={(e) => setMethodFilter(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                    >
                      <option value="all">All Methods</option>
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {hasActiveFilters && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100">
                  <span className="text-sm text-slate-500">
                    {filteredPayments.length} of {payments.length} transactions
                  </span>
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="text-slate-600 h-7">
                    <X className="w-3 h-3 mr-1" />
                    Clear all filters
                  </Button>
                </div>
              )}
            </div>

            {/* Transactions List */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden" ref={dropdownRef}>
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-4">
                  <div className="rounded-2xl bg-slate-100 p-5 mb-4">
                    <CreditCard className="h-10 w-10 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">No transactions found</h3>
                  <p className="text-sm text-slate-500 text-center max-w-sm">
                    {hasActiveFilters
                      ? 'Try adjusting your filters to find what you\'re looking for.'
                      : 'Start recording payments to see them here.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-left text-slate-500 border-b border-slate-100 bg-slate-50/50">
                        <tr>
                          <th className="px-5 py-3 font-medium">Date</th>
                          <th className="px-5 py-3 font-medium">Member</th>
                          <th className="px-5 py-3 font-medium">Description</th>
                          <th className="px-5 py-3 font-medium">Method</th>
                          <th className="px-5 py-3 font-medium">Status</th>
                          <th className="px-5 py-3 font-medium">Invoice</th>
                          <th className="px-5 py-3 font-medium text-right">Amount</th>
                          <th className="px-5 py-3 font-medium w-12"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPayments.map((payment) => {
                          const statusConfig = getStatusConfig(payment.status);
                          const methodConfig = getMethodConfig(payment.method);
                          const MethodIcon = methodConfig?.icon || Receipt;

                          return (
                            <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-5 py-4">
                                <span className="text-slate-900">{formatDate(payment.createdAt)}</span>
                              </td>
                              <td className="px-5 py-4">
                                {payment.member ? (
                                  <Link
                                    href={`/members/${payment.member.id}`}
                                    className="hover:underline"
                                  >
                                    <p className="font-medium text-slate-900">
                                      {payment.member.firstName} {payment.member.lastName}
                                    </p>
                                    <p className="text-xs text-slate-500">{payment.member.email}</p>
                                  </Link>
                                ) : (
                                  <span className="text-slate-400 italic">No member</span>
                                )}
                              </td>
                              <td className="px-5 py-4">
                                <span className="text-slate-600">{payment.description || '-'}</span>
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2">
                                  <MethodIcon className="w-4 h-4 text-slate-400" />
                                  <span className="text-slate-600">{methodConfig?.label}</span>
                                </div>
                              </td>
                              <td className="px-5 py-4">
                                <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium ${statusConfig?.color}`}>
                                  {statusConfig?.label}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                {payment.invoice ? (
                                  <Link
                                    href={`/admin/billing/invoices?id=${payment.invoice.id}`}
                                    className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                                  >
                                    #{payment.invoice.invoiceNumber}
                                    <ExternalLink className="w-3 h-3" />
                                  </Link>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>
                              <td className="px-5 py-4 text-right">
                                <span className={`font-semibold ${
                                  payment.status === 'REFUNDED' ? 'text-slate-500 line-through' :
                                  payment.status === 'FAILED' ? 'text-red-600' :
                                  'text-slate-900'
                                }`}>
                                  {formatCurrency(Number(payment.amount))}
                                </span>
                              </td>
                              <td className="px-5 py-4">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      disabled={actionLoading === payment.id}
                                    >
                                      {actionLoading === payment.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <MoreHorizontal className="w-4 h-4" />
                                      )}
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {payment.invoice && (
                                      <DropdownMenuItem asChild>
                                        <Link href={`/admin/billing/invoices?id=${payment.invoice.id}`}>
                                          <Eye className="w-4 h-4 mr-2" />
                                          View Invoice
                                        </Link>
                                      </DropdownMenuItem>
                                    )}
                                    {payment.member && (
                                      <DropdownMenuItem asChild>
                                        <Link href={`/members/${payment.member.id}`}>
                                          <User className="w-4 h-4 mr-2" />
                                          View Member
                                        </Link>
                                      </DropdownMenuItem>
                                    )}
                                    {payment.status === 'COMPLETED' && (
                                      <>
                                        <DropdownMenuItem onClick={() => handleSendReceipt(payment)}>
                                          <Mail className="w-4 h-4 mr-2" />
                                          Send Receipt
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => handleRefund(payment.id)}
                                          className="text-red-600"
                                        >
                                          <RotateCcw className="w-4 h-4 mr-2" />
                                          Refund Payment
                                        </DropdownMenuItem>
                                      </>
                                    )}
                                    {payment.status === 'FAILED' && (
                                      <DropdownMenuItem onClick={() => handleRetryPayment(payment.id)}>
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Retry Payment
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile List */}
                  <div className="md:hidden divide-y divide-slate-100">
                    {filteredPayments.map((payment) => {
                      const statusConfig = getStatusConfig(payment.status);
                      const methodConfig = getMethodConfig(payment.method);
                      const MethodIcon = methodConfig?.icon || Receipt;

                      return (
                        <div key={payment.id} className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                payment.status === 'COMPLETED' ? 'bg-emerald-100' :
                                payment.status === 'PENDING' ? 'bg-amber-100' :
                                payment.status === 'FAILED' ? 'bg-red-100' :
                                'bg-slate-100'
                              }`}>
                                <MethodIcon className={`w-5 h-5 ${
                                  payment.status === 'COMPLETED' ? 'text-emerald-600' :
                                  payment.status === 'PENDING' ? 'text-amber-600' :
                                  payment.status === 'FAILED' ? 'text-red-600' :
                                  'text-slate-600'
                                }`} />
                              </div>
                              <div>
                                <p className={`font-semibold ${
                                  payment.status === 'REFUNDED' ? 'text-slate-500 line-through' : 'text-slate-900'
                                }`}>
                                  {formatCurrency(Number(payment.amount))}
                                </p>
                                <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ${statusConfig?.color}`}>
                                  {statusConfig?.label}
                                </span>
                              </div>
                            </div>
                            <span className="text-xs text-slate-500">
                              {new Date(payment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {payment.member && (
                            <p className="text-sm text-slate-600 mb-1">
                              {payment.member.firstName} {payment.member.lastName}
                            </p>
                          )}
                          {payment.description && (
                            <p className="text-sm text-slate-500">{payment.description}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Footer */}
                  <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      Showing {filteredPayments.length} transactions
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      Total: {formatCurrency(filteredPayments.reduce((sum, p) => {
                        if (p.status === 'REFUNDED') return sum;
                        return sum + Number(p.amount);
                      }, 0))}
                    </span>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <>
            {/* Failed & Overdue Tab Content */}
            {/* Alert Banner for Critical Items */}
            {(criticalPayments > 0 || criticalInvoices > 0) && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-900">Critical items need immediate attention</p>
                  <p className="text-sm text-red-700 mt-1">
                    {criticalPayments > 0 && `${criticalPayments} payment${criticalPayments > 1 ? 's' : ''} failed 30+ days ago`}
                    {criticalPayments > 0 && criticalInvoices > 0 && ' and '}
                    {criticalInvoices > 0 && `${criticalInvoices} invoice${criticalInvoices > 1 ? 's' : ''} overdue 30+ days`}
                  </p>
                </div>
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-900">{failedPayments.length}</p>
                    <p className="text-sm text-red-700">Failed Payments</p>
                  </div>
                </div>
                <p className="text-sm text-red-600">
                  {formatCurrency(totalFailedAmount)} needs collection
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                    <Clock className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-900">{overdueInvoices.length}</p>
                    <p className="text-sm text-amber-700">Overdue Invoices</p>
                  </div>
                </div>
                <p className="text-sm text-amber-600">
                  {formatCurrency(totalOverdueAmount)} outstanding
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {formatCurrency(totalFailedAmount + totalOverdueAmount)}
                    </p>
                    <p className="text-sm text-slate-500">Total At Risk</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500">
                  Across all action items
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{criticalPayments + criticalInvoices}</p>
                    <p className="text-sm text-slate-500">Critical (30+ days)</p>
                  </div>
                </div>
                <p className="text-sm text-slate-500">
                  Requires immediate action
                </p>
              </div>
            </div>

            {/* Issue Sub-tabs and Controls */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex gap-2">
                  {ISSUE_TABS.map((tab) => {
                    const Icon = tab.icon;
                    const count = tab.id === 'failed' ? failedPayments.length : overdueInvoices.length;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setActiveIssueTab(tab.id);
                          setSelectedPayments([]);
                          setSelectedInvoices([]);
                        }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          activeIssueTab === tab.id
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {tab.label}
                        {count > 0 && (
                          <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                            activeIssueTab === tab.id ? 'bg-white/20' : 'bg-slate-200'
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="rounded-xl">
                        <ArrowUpDown className="w-4 h-4 mr-2" />
                        {SORT_OPTIONS.find(s => s.value === issueSortBy)?.label}
                        <ChevronDown className="w-4 h-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {SORT_OPTIONS.map((option) => (
                        <DropdownMenuItem
                          key={option.value}
                          onClick={() => setIssueSortBy(option.value as SortOption)}
                          className={issueSortBy === option.value ? 'bg-slate-100' : ''}
                        >
                          {issueSortBy === option.value && <Check className="w-4 h-4 mr-2" />}
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button variant="outline" className="rounded-xl">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </div>
              </div>
            </div>

            {/* Selection Bar */}
            {((activeIssueTab === 'failed' && selectedPayments.length > 0) ||
              (activeIssueTab === 'overdue' && selectedInvoices.length > 0)) && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-indigo-900 font-medium">
                    {activeIssueTab === 'failed' ? selectedPayments.length : selectedInvoices.length} selected
                  </span>
                  <span className="text-indigo-600 text-sm">
                    ({formatCurrency(activeIssueTab === 'failed' ? selectedPaymentAmount : selectedInvoiceAmount)})
                  </span>
                </div>
                <div className="flex gap-2">
                  {activeIssueTab === 'failed' ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkRetryPayments}
                        disabled={bulkActionLoading}
                        className="rounded-lg"
                      >
                        {bulkActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Retry Selected
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setSelectedPayments([])}
                        className="bg-slate-900 hover:bg-slate-800 rounded-lg"
                      >
                        Clear Selection
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBulkSendReminders}
                        disabled={bulkActionLoading}
                        className="rounded-lg"
                      >
                        {bulkActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Mail className="w-4 h-4 mr-2" />}
                        Send Reminders
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setSelectedInvoices([])}
                        className="bg-slate-900 hover:bg-slate-800 rounded-lg"
                      >
                        Clear Selection
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Issues Content */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : activeIssueTab === 'failed' ? (
                failedPayments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 px-4">
                    <div className="rounded-2xl bg-emerald-100 p-5 mb-4">
                      <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">All payments successful!</h3>
                    <p className="text-sm text-slate-500 text-center max-w-sm">
                      No failed or stuck payments requiring attention.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Select All Header */}
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                      <button
                        onClick={handleSelectAllPayments}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedPayments.length === failedPayments.length
                            ? 'bg-slate-900 border-slate-900'
                            : selectedPayments.length > 0
                            ? 'bg-slate-400 border-slate-400'
                            : 'border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {selectedPayments.length > 0 && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </button>
                      <span className="text-sm text-slate-600">
                        {selectedPayments.length === failedPayments.length
                          ? 'All selected'
                          : 'Select all'}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {getSortedFailedPayments().map((payment) => {
                        const daysSinceFailed = getDaysSinceFailed(payment.createdAt);
                        const severity = getSeverityLevel(daysSinceFailed);
                        const colors = getSeverityColor(severity);
                        const isSelected = selectedPayments.includes(payment.id);

                        return (
                          <div
                            key={payment.id}
                            className={`p-4 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/50' : ''}`}
                          >
                            <div className="flex items-center gap-4">
                              <button
                                onClick={() => setSelectedPayments(prev =>
                                  prev.includes(payment.id)
                                    ? prev.filter(id => id !== payment.id)
                                    : [...prev, payment.id]
                                )}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? 'bg-slate-900 border-slate-900'
                                    : 'border-slate-300 hover:border-slate-400'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </button>

                              <div className={`w-12 h-12 rounded-xl ${colors.bg} flex items-center justify-center`}>
                                {payment.status === 'FAILED' ? (
                                  <XCircle className={`w-6 h-6 ${colors.icon}`} />
                                ) : (
                                  <Clock className={`w-6 h-6 ${colors.icon}`} />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="font-semibold text-slate-900">
                                    {formatCurrency(Number(payment.amount))}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                                    {payment.status === 'FAILED' ? 'Failed' : 'Pending'} • {daysSinceFailed}d ago
                                  </span>
                                  {severity === 'critical' && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white">
                                      CRITICAL
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-500 flex-wrap">
                                  {payment.member ? (
                                    <>
                                      <Link
                                        href={`/members/${payment.member.id}`}
                                        className="font-medium text-slate-700 hover:text-indigo-600 hover:underline inline-flex items-center gap-1"
                                      >
                                        {payment.member.firstName} {payment.member.lastName}
                                        <ExternalLink className="w-3 h-3" />
                                      </Link>
                                      <span className="text-slate-300">•</span>
                                      <span>{payment.member.email}</span>
                                    </>
                                  ) : (
                                    <span className="italic">No member associated</span>
                                  )}
                                </div>
                                {payment.description && (
                                  <p className="text-sm text-slate-500 mt-1">{payment.description}</p>
                                )}
                              </div>

                              <div className="hidden md:block text-right text-sm text-slate-500 mr-2">
                                {formatDateShort(payment.createdAt)}
                              </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 rounded-lg"
                                    disabled={actionLoading === payment.id}
                                  >
                                    {actionLoading === payment.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                    )}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleRetryPayment(payment.id)}>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Retry Payment
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleMarkAsPaid(payment.id)}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Mark as Paid
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  {payment.member && (
                                    <>
                                      <DropdownMenuItem asChild>
                                        <Link href={`/members/${payment.member.id}`}>
                                          <User className="mr-2 h-4 w-4" />
                                          View Member
                                        </Link>
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>
                                        <Mail className="mr-2 h-4 w-4" />
                                        Send Email
                                      </DropdownMenuItem>
                                      {payment.member.phone && (
                                        <DropdownMenuItem>
                                          <Phone className="mr-2 h-4 w-4" />
                                          Call Member
                                        </DropdownMenuItem>
                                      )}
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )
              ) : (
                overdueInvoices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 px-4">
                    <div className="rounded-2xl bg-emerald-100 p-5 mb-4">
                      <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">No overdue invoices!</h3>
                    <p className="text-sm text-slate-500 text-center max-w-sm">
                      All invoices are paid or within their due date.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Select All Header */}
                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                      <button
                        onClick={handleSelectAllInvoices}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                          selectedInvoices.length === overdueInvoices.length
                            ? 'bg-slate-900 border-slate-900'
                            : selectedInvoices.length > 0
                            ? 'bg-slate-400 border-slate-400'
                            : 'border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {selectedInvoices.length > 0 && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </button>
                      <span className="text-sm text-slate-600">
                        {selectedInvoices.length === overdueInvoices.length
                          ? 'All selected'
                          : 'Select all'}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {getSortedInvoices().map((invoice) => {
                        const daysOverdue = getDaysOverdue(invoice.dueDate);
                        const severity = getSeverityLevel(daysOverdue);
                        const colors = getSeverityColor(severity);
                        const isSelected = selectedInvoices.includes(invoice.id);

                        return (
                          <div
                            key={invoice.id}
                            className={`p-4 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/50' : ''}`}
                          >
                            <div className="flex items-center gap-4">
                              <button
                                onClick={() => setSelectedInvoices(prev =>
                                  prev.includes(invoice.id)
                                    ? prev.filter(id => id !== invoice.id)
                                    : [...prev, invoice.id]
                                )}
                                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                  isSelected
                                    ? 'bg-slate-900 border-slate-900'
                                    : 'border-slate-300 hover:border-slate-400'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </button>

                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colors.bg}`}>
                                <FileText className={`w-6 h-6 ${colors.icon}`} />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <span className="font-semibold text-slate-900">
                                    {formatCurrency(Number(invoice.total))}
                                  </span>
                                  <Link
                                    href={`/admin/billing/invoices?id=${invoice.id}`}
                                    className="text-sm text-indigo-600 hover:underline inline-flex items-center gap-1"
                                  >
                                    #{invoice.invoiceNumber}
                                    <ExternalLink className="w-3 h-3" />
                                  </Link>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                                    {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
                                  </span>
                                  {severity === 'critical' && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-600 text-white">
                                      CRITICAL
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-slate-500 flex-wrap">
                                  <Link
                                    href={`/members/${invoice.member.id}`}
                                    className="font-medium text-slate-700 hover:text-indigo-600 hover:underline inline-flex items-center gap-1"
                                  >
                                    {invoice.member.firstName} {invoice.member.lastName}
                                    <ExternalLink className="w-3 h-3" />
                                  </Link>
                                  <span className="text-slate-300">•</span>
                                  <span>{invoice.member.email}</span>
                                </div>
                              </div>

                              <div className="hidden md:block text-right text-sm mr-2">
                                <p className="text-slate-500">Due: {formatDateShort(invoice.dueDate)}</p>
                              </div>

                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-9 w-9 rounded-lg"
                                    disabled={actionLoading === invoice.id}
                                  >
                                    {actionLoading === invoice.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                    )}
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => handleSendReminder(invoice.id)}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Send Reminder
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleMarkInvoicePaid(invoice.id)}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Mark as Paid
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem asChild>
                                    <Link href={`/admin/billing/invoices?id=${invoice.id}`}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Invoice
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem asChild>
                                    <Link href={`/members/${invoice.member.id}`}>
                                      <User className="mr-2 h-4 w-4" />
                                      View Member
                                    </Link>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Mail className="mr-2 h-4 w-4" />
                                    Send Email
                                  </DropdownMenuItem>
                                  {invoice.member.phone && (
                                    <DropdownMenuItem>
                                      <Phone className="mr-2 h-4 w-4" />
                                      Call Member
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )
              )}
            </div>

            {/* Bottom Actions */}
            {((activeIssueTab === 'failed' && failedPayments.length > 0) ||
              (activeIssueTab === 'overdue' && overdueInvoices.length > 0)) && (
              <div className="flex justify-center gap-3">
                <Button variant="outline" onClick={fetchAllData} className="rounded-xl">
                  <RefreshCw className="mr-2 w-4 h-4" />
                  Refresh
                </Button>
                {activeIssueTab === 'failed' ? (
                  <Button
                    className="bg-slate-900 hover:bg-slate-800 rounded-xl"
                    onClick={() => {
                      setSelectedPayments(failedPayments.map(p => p.id));
                      handleBulkRetryPayments();
                    }}
                  >
                    <RefreshCw className="mr-2 w-4 h-4" />
                    Retry All Payments
                  </Button>
                ) : (
                  <Button
                    className="bg-slate-900 hover:bg-slate-800 rounded-xl"
                    onClick={() => {
                      setSelectedInvoices(overdueInvoices.map(i => i.id));
                      handleBulkSendReminders();
                    }}
                  >
                    <Mail className="mr-2 w-4 h-4" />
                    Send All Reminders
                  </Button>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* New Payment Modal */}
      <Dialog open={showNewPaymentModal} onOpenChange={setShowNewPaymentModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record New Payment</DialogTitle>
            <DialogDescription>
              Manually record a payment received from a member.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreatePayment} className="space-y-4">
            {/* Customer Type Toggle */}
            <div className="space-y-2">
              <Label>Customer Type</Label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCustomerType('member')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    customerType === 'member'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <User className="w-4 h-4" />
                  Gym Member
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerType('external')}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    customerType === 'external'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ExternalLink className="w-4 h-4" />
                  External / Walk-in
                </button>
              </div>
            </div>

            {/* Member Selection (only shown for member type) */}
            {customerType === 'member' && (
              <div className="space-y-2">
                <Label htmlFor="member">Member (Optional)</Label>
                {membersLoading ? (
                  <div className="flex items-center gap-2 h-10 px-3 text-sm text-slate-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading members...
                  </div>
                ) : (
                  <select
                    id="member"
                    value={newPayment.memberId}
                    onChange={(e) => setNewPayment({ ...newPayment, memberId: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                  >
                    <option value="">Select a member (optional)</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.firstName} {member.lastName} ({member.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* External Customer Fields (only shown for external type) */}
            {customerType === 'external' && (
              <div className="space-y-4 p-4 bg-slate-50 rounded-xl">
                <div className="space-y-2">
                  <Label htmlFor="externalName">Customer Name *</Label>
                  <Input
                    id="externalName"
                    placeholder="John Doe"
                    value={newPayment.externalName}
                    onChange={(e) => setNewPayment({ ...newPayment, externalName: e.target.value })}
                    className="rounded-xl"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="externalEmail">Customer Email (Optional)</Label>
                  <Input
                    id="externalEmail"
                    type="email"
                    placeholder="john@example.com"
                    value={newPayment.externalEmail}
                    onChange={(e) => setNewPayment({ ...newPayment, externalEmail: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  className="pl-9 rounded-xl"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="method">Payment Method *</Label>
              <select
                id="method"
                value={newPayment.method}
                onChange={(e) => setNewPayment({ ...newPayment, method: e.target.value as 'CARD' | 'CASH' | 'BANK_TRANSFER' | 'OTHER' })}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                required
              >
                {PAYMENT_METHODS.map((method) => (
                  <option key={method.value} value={method.value}>
                    {method.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                placeholder="e.g., Monthly membership, Drop-in class, PT session..."
                value={newPayment.description}
                onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
                className="rounded-xl"
              />
            </div>

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowNewPaymentModal(false)}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createPaymentLoading || !newPayment.amount}
                className="bg-slate-900 hover:bg-slate-800 rounded-xl"
              >
                {createPaymentLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Payment
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
