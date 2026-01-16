'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  Plus,
  Search,
  Download,
  Loader2,
  MoreHorizontal,
  Send,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Pencil,
  Trash2,
  X,
  User,
  Mail,
  Printer,
  ArrowUpDown,
  Check,
  ExternalLink,
  Calendar,
  DollarSign,
  Building2,
  ChevronDown,
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

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  createdAt: string;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  items: {
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  payments?: {
    id: string;
    amount: number;
    status: string;
    method: string;
    createdAt: string;
  }[];
}

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface InvoiceStats {
  totalInvoices: number;
  draftCount: number;
  sentCount: number;
  paidCount: number;
  overdueCount: number;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
}

type SortOption = 'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc' | 'due_date';

const INVOICE_STATUSES = [
  { value: 'DRAFT', label: 'Draft', color: 'bg-slate-100 text-slate-600', icon: FileText },
  { value: 'SENT', label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: Send },
  { value: 'PAID', label: 'Paid', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  { value: 'OVERDUE', label: 'Overdue', color: 'bg-red-100 text-red-700', icon: Clock },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-slate-100 text-slate-500', icon: XCircle },
];

const SORT_OPTIONS = [
  { value: 'date_desc', label: 'Newest First' },
  { value: 'date_asc', label: 'Oldest First' },
  { value: 'amount_desc', label: 'Highest Amount' },
  { value: 'amount_asc', label: 'Lowest Amount' },
  { value: 'due_date', label: 'Due Date' },
];

export default function InvoicesPage() {
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');
  const [error, setError] = useState<string | null>(null);
  const [selectedInvoices, setSelectedInvoices] = useState<string[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [viewingInvoice, setViewingInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [invoiceForm, setInvoiceForm] = useState({
    memberId: '',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: [{ description: '', quantity: 1, unitPrice: 0 }],
    notes: '',
    status: 'DRAFT' as 'DRAFT' | 'SENT',
  });

  useEffect(() => {
    fetchInvoices();
    fetchMembers();
  }, []);

  // Handle URL param for direct invoice view
  useEffect(() => {
    const invoiceId = searchParams.get('id');
    if (invoiceId && invoices.length > 0) {
      const invoice = invoices.find(i => i.id === invoiceId);
      if (invoice) {
        openDetailModal(invoice);
      }
    }
  }, [searchParams, invoices]);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/invoices');
      const data = await response.json();

      if (data.success) {
        setInvoices(data.data.invoices);
        setStats(data.data.stats);
      } else {
        setError(data.error?.message || 'Failed to load invoices');
      }
    } catch {
      setError('Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/members?limit=100');
      const data = await response.json();
      if (data.success) {
        // API returns { items, meta } structure
        setMembers(data.data.items || data.data.members || []);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    }
  };

  const openModal = (invoice?: Invoice) => {
    if (invoice) {
      setEditingInvoice(invoice);
      setInvoiceForm({
        memberId: invoice.member.id,
        dueDate: new Date(invoice.dueDate).toISOString().split('T')[0],
        items: invoice.items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
        })),
        notes: invoice.notes || '',
        status: invoice.status as 'DRAFT' | 'SENT',
      });
    } else {
      setEditingInvoice(null);
      setInvoiceForm({
        memberId: '',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        items: [{ description: '', quantity: 1, unitPrice: 0 }],
        notes: '',
        status: 'DRAFT',
      });
    }
    setShowModal(true);
  };

  const openDetailModal = (invoice: Invoice) => {
    setViewingInvoice(invoice);
    setShowDetailModal(true);
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const url = editingInvoice
        ? `/api/admin/invoices/${editingInvoice.id}`
        : '/api/admin/invoices';
      const method = editingInvoice ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: invoiceForm.memberId,
          dueDate: invoiceForm.dueDate,
          items: invoiceForm.items.filter(item => item.description && item.unitPrice > 0),
          notes: invoiceForm.notes || undefined,
          status: invoiceForm.status,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowModal(false);
        fetchInvoices();
      } else {
        setError(data.error?.message || 'Failed to save invoice');
      }
    } catch {
      setError('Failed to save invoice');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    try {
      const response = await fetch(`/api/admin/invoices/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        fetchInvoices();
        if (showDetailModal && viewingInvoice?.id === id) {
          setShowDetailModal(false);
          setViewingInvoice(null);
        }
      } else {
        setError(data.error?.message || 'Failed to delete invoice');
      }
    } catch {
      setError('Failed to delete invoice');
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (data.success) {
        fetchInvoices();
        if (viewingInvoice?.id === id) {
          setViewingInvoice({ ...viewingInvoice, status: status as Invoice['status'] });
        }
      } else {
        setError(data.error?.message || 'Failed to update invoice');
      }
    } catch {
      setError('Failed to update invoice');
    }
  };

  const handleBulkSend = async () => {
    const draftInvoices = selectedInvoices.filter(id => {
      const invoice = invoices.find(i => i.id === id);
      return invoice?.status === 'DRAFT';
    });

    if (draftInvoices.length === 0) {
      alert('No draft invoices selected to send.');
      return;
    }

    setBulkActionLoading(true);
    try {
      await Promise.all(
        draftInvoices.map(id =>
          fetch(`/api/admin/invoices/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'SENT' }),
          })
        )
      );
      fetchInvoices();
      setSelectedInvoices([]);
    } catch (error) {
      setError('Failed to send invoices');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleSelectAllInvoices = () => {
    if (selectedInvoices.length === filteredInvoices.length) {
      setSelectedInvoices([]);
    } else {
      setSelectedInvoices(filteredInvoices.map(i => i.id));
    }
  };

  const printInvoice = (invoice: Invoice) => {
    const printContent = `
      <html>
        <head>
          <title>Invoice #${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .company { font-size: 24px; font-weight: bold; }
            .invoice-info { text-align: right; }
            .invoice-number { font-size: 20px; font-weight: bold; color: #333; }
            .status { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; margin-top: 8px; }
            .status.paid { background: #d1fae5; color: #059669; }
            .status.sent { background: #dbeafe; color: #2563eb; }
            .status.draft { background: #f1f5f9; color: #64748b; }
            .status.overdue { background: #fee2e2; color: #dc2626; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 12px; color: #64748b; text-transform: uppercase; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            th { background: #f8fafc; font-weight: 600; color: #64748b; font-size: 12px; }
            .amount { text-align: right; }
            .total-row { font-weight: bold; font-size: 16px; }
            .notes { background: #f8fafc; padding: 16px; border-radius: 8px; margin-top: 30px; }
            .notes-title { font-weight: 600; margin-bottom: 8px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company">GymFlow</div>
              <p style="color: #64748b; margin-top: 8px;">Invoice</p>
            </div>
            <div class="invoice-info">
              <div class="invoice-number">#${invoice.invoiceNumber}</div>
              <p style="color: #64748b; margin: 8px 0;">Created: ${formatDate(invoice.createdAt)}</p>
              <p style="color: #64748b; margin: 0;">Due: ${formatDate(invoice.dueDate)}</p>
              <span class="status ${invoice.status.toLowerCase()}">${invoice.status}</span>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Bill To</div>
            <p style="font-weight: 600; margin: 0;">${invoice.member.firstName} ${invoice.member.lastName}</p>
            <p style="color: #64748b; margin: 4px 0;">${invoice.member.email}</p>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th class="amount">Unit Price</th>
                <th class="amount">Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoice.items.map(item => `
                <tr>
                  <td>${item.description}</td>
                  <td>${item.quantity}</td>
                  <td class="amount">${formatCurrency(Number(item.unitPrice))}</td>
                  <td class="amount">${formatCurrency(Number(item.total))}</td>
                </tr>
              `).join('')}
              <tr>
                <td colspan="3" style="text-align: right; padding-top: 20px;">Subtotal</td>
                <td class="amount" style="padding-top: 20px;">${formatCurrency(Number(invoice.subtotal))}</td>
              </tr>
              ${Number(invoice.tax) > 0 ? `
                <tr>
                  <td colspan="3" style="text-align: right;">Tax</td>
                  <td class="amount">${formatCurrency(Number(invoice.tax))}</td>
                </tr>
              ` : ''}
              <tr class="total-row">
                <td colspan="3" style="text-align: right; border-top: 2px solid #e2e8f0; padding-top: 16px;">Total</td>
                <td class="amount" style="border-top: 2px solid #e2e8f0; padding-top: 16px;">${formatCurrency(Number(invoice.total))}</td>
              </tr>
            </tbody>
          </table>

          ${invoice.notes ? `
            <div class="notes">
              <div class="notes-title">Notes</div>
              <p style="margin: 0; color: #64748b;">${invoice.notes}</p>
            </div>
          ` : ''}
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const exportInvoices = () => {
    const data = filteredInvoices.map(i => ({
      'Invoice #': i.invoiceNumber,
      'Member': `${i.member.firstName} ${i.member.lastName}`,
      'Email': i.member.email,
      'Status': i.status,
      'Created': formatDate(i.createdAt),
      'Due Date': formatDate(i.dueDate),
      'Subtotal': Number(i.subtotal),
      'Tax': Number(i.tax),
      'Total': Number(i.total),
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
    a.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addLineItem = () => {
    setInvoiceForm({
      ...invoiceForm,
      items: [...invoiceForm.items, { description: '', quantity: 1, unitPrice: 0 }],
    });
  };

  const removeLineItem = (index: number) => {
    setInvoiceForm({
      ...invoiceForm,
      items: invoiceForm.items.filter((_, i) => i !== index),
    });
  };

  const updateLineItem = (index: number, field: string, value: string | number) => {
    const newItems = [...invoiceForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setInvoiceForm({ ...invoiceForm, items: newItems });
  };

  const calculateTotal = () => {
    return invoiceForm.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
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
    return INVOICE_STATUSES.find(s => s.value === status);
  };

  const getSortedInvoices = (list: Invoice[]): Invoice[] => {
    const sorted = [...list];
    switch (sortBy) {
      case 'date_desc':
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'date_asc':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'amount_desc':
        return sorted.sort((a, b) => Number(b.total) - Number(a.total));
      case 'amount_asc':
        return sorted.sort((a, b) => Number(a.total) - Number(b.total));
      case 'due_date':
        return sorted.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      default:
        return sorted;
    }
  };

  const filteredInvoices = getSortedInvoices(invoices.filter(invoice => {
    const matchesSearch = searchQuery === '' ||
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.member.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.member.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.member.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter;

    return matchesSearch && matchesStatus;
  }));

  const selectedTotalAmount = filteredInvoices
    .filter(i => selectedInvoices.includes(i.id))
    .reduce((sum, i) => sum + Number(i.total), 0);

  return (
    <>
      <Header title="Invoices" description="Create and manage invoices" />

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center">
                <FileText className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats?.totalInvoices || 0}</p>
                <p className="text-sm text-slate-500">Total Invoices</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.paidAmount || 0)}</p>
                <p className="text-sm text-slate-500">Paid</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(stats?.outstandingAmount || 0)}</p>
                <p className="text-sm text-slate-500">Outstanding</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats?.overdueCount || 0}</p>
                <p className="text-sm text-slate-500">Overdue</p>
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

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-xl"
              />
            </div>

            <div className="flex gap-3 flex-wrap">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm min-w-[130px]"
              >
                <option value="all">All Status</option>
                {INVOICE_STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
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

              <Button variant="outline" onClick={exportInvoices} className="rounded-xl">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>

              <Button onClick={() => openModal()} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Create Invoice
              </Button>
            </div>
          </div>
        </div>

        {/* Selection Bar */}
        {selectedInvoices.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-indigo-900 font-medium">
                {selectedInvoices.length} selected
              </span>
              <span className="text-indigo-600 text-sm">
                ({formatCurrency(selectedTotalAmount)})
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkSend}
                disabled={bulkActionLoading}
                className="rounded-lg"
              >
                {bulkActionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                Send Drafts
              </Button>
              <Button
                size="sm"
                onClick={() => setSelectedInvoices([])}
                className="bg-slate-900 hover:bg-slate-800 rounded-lg"
              >
                Clear Selection
              </Button>
            </div>
          </div>
        )}

        {/* Invoices List */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="rounded-2xl bg-slate-100 p-5 mb-4">
                <FileText className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No invoices found</h3>
              <p className="text-sm text-slate-500 text-center max-w-sm mb-5">
                Create your first invoice to start billing members.
              </p>
              <Button onClick={() => openModal()} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Create Invoice
              </Button>
            </div>
          ) : (
            <>
              {/* Select All Header */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-3">
                <button
                  onClick={handleSelectAllInvoices}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                    selectedInvoices.length === filteredInvoices.length
                      ? 'bg-slate-900 border-slate-900'
                      : selectedInvoices.length > 0
                      ? 'bg-slate-400 border-slate-400'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  {selectedInvoices.length > 0 && <Check className="w-3 h-3 text-white" />}
                </button>
                <span className="text-sm text-slate-600">
                  {selectedInvoices.length === filteredInvoices.length
                    ? 'All selected'
                    : 'Select all'}
                </span>
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-slate-500 border-b border-slate-100 bg-slate-50/50">
                    <tr>
                      <th className="px-5 py-3 font-medium w-10"></th>
                      <th className="px-5 py-3 font-medium">Invoice</th>
                      <th className="px-5 py-3 font-medium">Member</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Due Date</th>
                      <th className="px-5 py-3 font-medium text-right">Amount</th>
                      <th className="px-5 py-3 font-medium w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices.map((invoice) => {
                      const statusConfig = getStatusConfig(invoice.status);
                      const isOverdue = invoice.status === 'SENT' && new Date(invoice.dueDate) < new Date();
                      const isSelected = selectedInvoices.includes(invoice.id);

                      return (
                        <tr
                          key={invoice.id}
                          className={`hover:bg-slate-50 transition-colors cursor-pointer ${isSelected ? 'bg-indigo-50/50' : ''}`}
                          onClick={() => openDetailModal(invoice)}
                        >
                          <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
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
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-medium text-slate-900">#{invoice.invoiceNumber}</p>
                            <p className="text-xs text-slate-500">{formatDate(invoice.createdAt)}</p>
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-medium text-slate-900">
                              {invoice.member.firstName} {invoice.member.lastName}
                            </p>
                            <p className="text-xs text-slate-500">{invoice.member.email}</p>
                          </td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${
                              isOverdue ? 'bg-red-100 text-red-700' : statusConfig?.color
                            }`}>
                              {isOverdue ? 'Overdue' : statusConfig?.label}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <span className={isOverdue ? 'text-red-600 font-medium' : 'text-slate-600'}>
                              {formatDate(invoice.dueDate)}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="font-semibold text-slate-900">
                              {formatCurrency(Number(invoice.total))}
                            </span>
                          </td>
                          <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                                  <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openDetailModal(invoice)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => printInvoice(invoice)}>
                                  <Printer className="mr-2 h-4 w-4" />
                                  Print / Download
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openModal(invoice)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                {invoice.status === 'DRAFT' && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'SENT')}>
                                    <Send className="mr-2 h-4 w-4" />
                                    Mark as Sent
                                  </DropdownMenuItem>
                                )}
                                {(invoice.status === 'SENT' || invoice.status === 'OVERDUE') && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(invoice.id, 'PAID')}>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Mark as Paid
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <Link href={`/members/${invoice.member.id}`}>
                                    <User className="mr-2 h-4 w-4" />
                                    View Member
                                  </Link>
                                </DropdownMenuItem>
                                {['DRAFT', 'CANCELLED'].includes(invoice.status) && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteInvoice(invoice.id)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Delete
                                    </DropdownMenuItem>
                                  </>
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
                {filteredInvoices.map((invoice) => {
                  const statusConfig = getStatusConfig(invoice.status);
                  const isOverdue = invoice.status === 'SENT' && new Date(invoice.dueDate) < new Date();
                  const isSelected = selectedInvoices.includes(invoice.id);

                  return (
                    <div
                      key={invoice.id}
                      className={`p-4 ${isSelected ? 'bg-indigo-50/50' : ''}`}
                      onClick={() => openDetailModal(invoice)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedInvoices(prev =>
                                prev.includes(invoice.id)
                                  ? prev.filter(id => id !== invoice.id)
                                  : [...prev, invoice.id]
                              );
                            }}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-slate-900 border-slate-900'
                                : 'border-slate-300'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </button>
                          <div>
                            <p className="font-semibold text-slate-900">#{invoice.invoiceNumber}</p>
                            <p className="text-sm text-slate-600">
                              {invoice.member.firstName} {invoice.member.lastName}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ${
                          isOverdue ? 'bg-red-100 text-red-700' : statusConfig?.color
                        }`}>
                          {isOverdue ? 'Overdue' : statusConfig?.label}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pl-8">
                        <span className="text-lg font-bold text-slate-900">
                          {formatCurrency(Number(invoice.total))}
                        </span>
                        <span className="text-sm text-slate-500">
                          Due: {formatDate(invoice.dueDate)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && viewingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDetailModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-slate-900">
                  Invoice #{viewingInvoice.invoiceNumber}
                </h2>
                <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${
                  getStatusConfig(viewingInvoice.status)?.color
                }`}>
                  {getStatusConfig(viewingInvoice.status)?.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => printInvoice(viewingInvoice)} className="rounded-lg">
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <button onClick={() => setShowDetailModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium mb-2">Bill To</p>
                  <Link
                    href={`/members/${viewingInvoice.member.id}`}
                    className="font-semibold text-slate-900 hover:text-indigo-600 inline-flex items-center gap-1"
                    onClick={() => setShowDetailModal(false)}
                  >
                    {viewingInvoice.member.firstName} {viewingInvoice.member.lastName}
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <p className="text-sm text-slate-600">{viewingInvoice.member.email}</p>
                </div>
                <div className="text-right">
                  <div className="space-y-1">
                    <div className="flex justify-end gap-3 text-sm">
                      <span className="text-slate-500">Created:</span>
                      <span className="text-slate-900">{formatDate(viewingInvoice.createdAt)}</span>
                    </div>
                    <div className="flex justify-end gap-3 text-sm">
                      <span className="text-slate-500">Due:</span>
                      <span className={`font-medium ${
                        viewingInvoice.status === 'SENT' && new Date(viewingInvoice.dueDate) < new Date()
                          ? 'text-red-600'
                          : 'text-slate-900'
                      }`}>
                        {formatDate(viewingInvoice.dueDate)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <p className="text-xs text-slate-500 uppercase font-medium mb-3">Line Items</p>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Description</th>
                        <th className="px-4 py-3 text-center font-medium w-20">Qty</th>
                        <th className="px-4 py-3 text-right font-medium w-28">Unit Price</th>
                        <th className="px-4 py-3 text-right font-medium w-28">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingInvoice.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-slate-900">{item.description}</td>
                          <td className="px-4 py-3 text-center text-slate-600">{item.quantity}</td>
                          <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(Number(item.unitPrice))}</td>
                          <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(Number(item.total))}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 text-right text-slate-600">Subtotal</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">
                          {formatCurrency(Number(viewingInvoice.subtotal))}
                        </td>
                      </tr>
                      {Number(viewingInvoice.tax) > 0 && (
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-right text-slate-600">Tax</td>
                          <td className="px-4 py-2 text-right text-slate-900">
                            {formatCurrency(Number(viewingInvoice.tax))}
                          </td>
                        </tr>
                      )}
                      <tr className="border-t-2 border-slate-200">
                        <td colSpan={3} className="px-4 py-3 text-right font-semibold text-slate-900">Total</td>
                        <td className="px-4 py-3 text-right text-xl font-bold text-slate-900">
                          {formatCurrency(Number(viewingInvoice.total))}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {viewingInvoice.notes && (
                <div>
                  <p className="text-xs text-slate-500 uppercase font-medium mb-2">Notes</p>
                  <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
                    {viewingInvoice.notes}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                {viewingInvoice.status === 'DRAFT' && (
                  <Button
                    onClick={() => handleStatusChange(viewingInvoice.id, 'SENT')}
                    className="bg-indigo-600 hover:bg-indigo-700 rounded-xl"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Send Invoice
                  </Button>
                )}
                {(viewingInvoice.status === 'SENT' || viewingInvoice.status === 'OVERDUE') && (
                  <Button
                    onClick={() => handleStatusChange(viewingInvoice.id, 'PAID')}
                    className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Mark as Paid
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDetailModal(false);
                    openModal(viewingInvoice);
                  }}
                  className="rounded-xl"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit Invoice
                </Button>
                {['DRAFT', 'CANCELLED'].includes(viewingInvoice.status) && (
                  <Button
                    variant="outline"
                    onClick={() => handleDeleteInvoice(viewingInvoice.id)}
                    className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingInvoice ? `Edit Invoice #${editingInvoice.invoiceNumber}` : 'Create Invoice'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="p-5 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="member">Member</Label>
                  <select
                    id="member"
                    value={invoiceForm.memberId}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, memberId: e.target.value })}
                    required
                    disabled={!!editingInvoice}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                  >
                    <option value="">Select member...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.firstName} {m.lastName} ({m.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    required
                    className="rounded-xl"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Line Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="rounded-lg">
                    <Plus className="mr-1 h-3 w-3" />
                    Add Item
                  </Button>
                </div>

                <div className="space-y-2">
                  {invoiceForm.items.map((item, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <Input
                        placeholder="Description"
                        value={item.description}
                        onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                        className="flex-1 rounded-lg"
                        required
                      />
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-20 rounded-lg"
                        required
                      />
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Price"
                        value={item.unitPrice || ''}
                        onChange={(e) => updateLineItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-28 rounded-lg"
                        required
                      />
                      <span className="w-24 text-right font-medium text-slate-900">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </span>
                      {invoiceForm.items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(index)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4 text-slate-400" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-200">
                  <div className="text-right">
                    <span className="text-sm text-slate-500">Total: </span>
                    <span className="text-xl font-bold text-slate-900">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <textarea
                  id="notes"
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                  className="w-full h-20 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm resize-none"
                  placeholder="Add any notes for the member..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={invoiceForm.status}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, status: e.target.value as 'DRAFT' | 'SENT' })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="SENT">Send Immediately</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingInvoice ? (
                    'Save Changes'
                  ) : invoiceForm.status === 'SENT' ? (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Create & Send
                    </>
                  ) : (
                    'Create Draft'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
