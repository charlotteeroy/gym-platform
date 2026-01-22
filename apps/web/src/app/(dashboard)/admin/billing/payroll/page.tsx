'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  DollarSign,
  Calendar,
  FileText,
  Trash2,
  Play,
  Check,
  AlertTriangle,
  ChevronDown,
  Filter,
  User,
  Edit2,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PayrollPeriod {
  id: string;
  startDate: string;
  endDate: string;
  status: 'DRAFT' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'FAILED';
  totalAmount: number;
  paidAt: string | null;
  entriesCount: number;
  createdAt: string;
}

interface PayrollEntry {
  id: string;
  baseAmount: number;
  commissionsAmount: number;
  bonusAmount: number;
  deductionsAmount: number;
  totalAmount: number;
  stripeTransferId: string | null;
  paidAt: string | null;
  notes: string | null;
  staff: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

const STATUS_CONFIG = {
  DRAFT: { label: 'Draft', color: 'bg-slate-100 text-slate-600', icon: FileText },
  APPROVED: { label: 'Approved', color: 'bg-blue-100 text-blue-700', icon: Check },
  PROCESSING: { label: 'Processing', color: 'bg-amber-100 text-amber-700', icon: Clock },
  PAID: { label: 'Paid', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  FAILED: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function PayrollPage() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{ total: number; totalPages: number } | null>(null);

  // Create period modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createStartDate, setCreateStartDate] = useState('');
  const [createEndDate, setCreateEndDate] = useState('');
  const [creating, setCreating] = useState(false);

  // Period detail modal
  const [selectedPeriod, setSelectedPeriod] = useState<PayrollPeriod | null>(null);
  const [periodDetail, setPeriodDetail] = useState<{
    period: PayrollPeriod;
    entries: PayrollEntry[];
  } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Add entry modal
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [entryBaseAmount, setEntryBaseAmount] = useState('');
  const [entryCommissions, setEntryCommissions] = useState('');
  const [entryBonus, setEntryBonus] = useState('');
  const [entryDeductions, setEntryDeductions] = useState('');
  const [entryNotes, setEntryNotes] = useState('');
  const [addingEntry, setAddingEntry] = useState(false);

  // Action states
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  useEffect(() => {
    fetchPeriods();
  }, [page, statusFilter]);

  const fetchPeriods = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);

      const response = await fetch(`/api/admin/payroll?${params}`);
      const data = await response.json();

      if (data.success) {
        setPeriods(data.data.items);
        setMeta(data.data.meta);
      }
    } catch (error) {
      console.error('Failed to fetch payroll periods:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPeriodDetail = async (periodId: string) => {
    setLoadingDetail(true);
    try {
      const response = await fetch(`/api/admin/payroll/${periodId}`);
      const data = await response.json();

      if (data.success) {
        setPeriodDetail({
          period: data.data,
          entries: data.data.entries,
        });
      }
    } catch (error) {
      console.error('Failed to fetch period detail:', error);
    } finally {
      setLoadingDetail(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await fetch('/api/admin/staff');
      const data = await response.json();
      if (data.success) {
        setStaff(data.data.items || data.data);
      }
    } catch (error) {
      console.error('Failed to fetch staff:', error);
    }
  };

  const handleCreatePeriod = async () => {
    if (!createStartDate || !createEndDate) return;

    setCreating(true);
    try {
      const response = await fetch('/api/admin/payroll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: createStartDate,
          endDate: createEndDate,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setShowCreateModal(false);
        setCreateStartDate('');
        setCreateEndDate('');
        fetchPeriods();
      } else {
        alert(data.error?.message || 'Failed to create payroll period');
      }
    } catch (error) {
      console.error('Failed to create period:', error);
      alert('Failed to create payroll period');
    } finally {
      setCreating(false);
    }
  };

  const handleAddEntry = async () => {
    if (!selectedPeriod || !selectedStaffId || !entryBaseAmount) return;

    setAddingEntry(true);
    try {
      const response = await fetch(`/api/admin/payroll/${selectedPeriod.id}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: selectedStaffId,
          baseAmount: parseFloat(entryBaseAmount) || 0,
          commissionsAmount: parseFloat(entryCommissions) || 0,
          bonusAmount: parseFloat(entryBonus) || 0,
          deductionsAmount: parseFloat(entryDeductions) || 0,
          notes: entryNotes || undefined,
        }),
      });
      const data = await response.json();

      if (data.success) {
        setShowAddEntryModal(false);
        resetEntryForm();
        fetchPeriodDetail(selectedPeriod.id);
        fetchPeriods();
      } else {
        alert(data.error?.message || 'Failed to add entry');
      }
    } catch (error) {
      console.error('Failed to add entry:', error);
      alert('Failed to add entry');
    } finally {
      setAddingEntry(false);
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!selectedPeriod || !confirm('Are you sure you want to delete this entry?')) return;

    try {
      const response = await fetch(`/api/admin/payroll/${selectedPeriod.id}/entries/${entryId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        fetchPeriodDetail(selectedPeriod.id);
        fetchPeriods();
      } else {
        alert(data.error?.message || 'Failed to delete entry');
      }
    } catch (error) {
      console.error('Failed to delete entry:', error);
      alert('Failed to delete entry');
    }
  };

  const handleApprovePeriod = async (periodId: string) => {
    setProcessingAction(`approve-${periodId}`);
    try {
      const response = await fetch(`/api/admin/payroll/${periodId}/approve`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        fetchPeriods();
        if (selectedPeriod?.id === periodId) {
          fetchPeriodDetail(periodId);
        }
      } else {
        alert(data.error?.message || 'Failed to approve payroll');
      }
    } catch (error) {
      console.error('Failed to approve:', error);
      alert('Failed to approve payroll');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleProcessPeriod = async (periodId: string) => {
    if (!confirm('Are you sure you want to process this payroll? This will create payouts.')) return;

    setProcessingAction(`process-${periodId}`);
    try {
      const response = await fetch(`/api/admin/payroll/${periodId}/process`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        fetchPeriods();
        if (selectedPeriod?.id === periodId) {
          fetchPeriodDetail(periodId);
        }
        alert(`Payroll processed. ${data.data.processedCount} entries paid.`);
      } else {
        alert(data.error?.message || 'Failed to process payroll');
      }
    } catch (error) {
      console.error('Failed to process:', error);
      alert('Failed to process payroll');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleDeletePeriod = async (periodId: string) => {
    if (!confirm('Are you sure you want to delete this payroll period?')) return;

    setProcessingAction(`delete-${periodId}`);
    try {
      const response = await fetch(`/api/admin/payroll/${periodId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        setSelectedPeriod(null);
        setPeriodDetail(null);
        fetchPeriods();
      } else {
        alert(data.error?.message || 'Failed to delete payroll period');
      }
    } catch (error) {
      console.error('Failed to delete:', error);
      alert('Failed to delete payroll period');
    } finally {
      setProcessingAction(null);
    }
  };

  const resetEntryForm = () => {
    setSelectedStaffId('');
    setEntryBaseAmount('');
    setEntryCommissions('');
    setEntryBonus('');
    setEntryDeductions('');
    setEntryNotes('');
  };

  const openAddEntryModal = () => {
    fetchStaff();
    setShowAddEntryModal(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateRange = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  // Calculate totals for period detail
  const totalBase = periodDetail?.entries.reduce((sum, e) => sum + e.baseAmount, 0) || 0;
  const totalCommissions = periodDetail?.entries.reduce((sum, e) => sum + e.commissionsAmount, 0) || 0;
  const totalBonus = periodDetail?.entries.reduce((sum, e) => sum + e.bonusAmount, 0) || 0;
  const totalDeductions = periodDetail?.entries.reduce((sum, e) => sum + e.deductionsAmount, 0) || 0;

  return (
    <>
      <Header title="Payroll Management" />

      <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Payroll</h1>
              <p className="text-sm text-slate-500">Manage staff payroll and process payments</p>
            </div>
            <div className="flex gap-2">
              <Link href="/admin/billing">
                <Button variant="outline">Back to Accounting</Button>
              </Link>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Period
              </Button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Periods List */}
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Payroll Periods</h2>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Filter className="h-4 w-4" />
                      {statusFilter ? STATUS_CONFIG[statusFilter as keyof typeof STATUS_CONFIG]?.label : 'All Status'}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setStatusFilter(null)}>All Status</DropdownMenuItem>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <DropdownMenuItem key={key} onClick={() => setStatusFilter(key)}>
                        <config.icon className="mr-2 h-4 w-4" />
                        {config.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Periods */}
              <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  </div>
                ) : periods.length === 0 ? (
                  <div className="py-12 text-center">
                    <Calendar className="mx-auto h-12 w-12 text-slate-300" />
                    <p className="mt-4 text-slate-500">No payroll periods found</p>
                    <Button className="mt-4" onClick={() => setShowCreateModal(true)}>
                      Create First Period
                    </Button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {periods.map((period) => {
                      const statusConfig = STATUS_CONFIG[period.status];
                      const StatusIcon = statusConfig.icon;
                      const isSelected = selectedPeriod?.id === period.id;

                      return (
                        <div
                          key={period.id}
                          className={`cursor-pointer p-4 transition-colors hover:bg-slate-50 ${
                            isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                          }`}
                          onClick={() => {
                            setSelectedPeriod(period);
                            fetchPeriodDetail(period.id);
                          }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-900">
                                {formatDateRange(period.startDate, period.endDate)}
                              </p>
                              <p className="text-sm text-slate-500">
                                {period.entriesCount} {period.entriesCount === 1 ? 'entry' : 'entries'}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-slate-900">
                                {formatCurrency(period.totalAmount)}
                              </p>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.color}`}
                              >
                                <StatusIcon className="h-3 w-3" />
                                {statusConfig.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Period Detail */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">Period Details</h2>

              {!selectedPeriod ? (
                <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <Users className="mx-auto h-12 w-12 text-slate-300" />
                  <p className="mt-4 text-slate-500">Select a period to view details</p>
                </div>
              ) : loadingDetail ? (
                <div className="rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
                </div>
              ) : periodDetail ? (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">Period Total</p>
                        <p className="text-2xl font-bold text-slate-900">
                          {formatCurrency(periodDetail.period.totalAmount)}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {selectedPeriod.status === 'DRAFT' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeletePeriod(selectedPeriod.id)}
                              disabled={processingAction === `delete-${selectedPeriod.id}`}
                            >
                              {processingAction === `delete-${selectedPeriod.id}` ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApprovePeriod(selectedPeriod.id)}
                              disabled={
                                processingAction === `approve-${selectedPeriod.id}` ||
                                periodDetail.entries.length === 0
                              }
                            >
                              {processingAction === `approve-${selectedPeriod.id}` ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Check className="mr-2 h-4 w-4" />
                              )}
                              Approve
                            </Button>
                          </>
                        )}
                        {selectedPeriod.status === 'APPROVED' && (
                          <Button
                            size="sm"
                            onClick={() => handleProcessPeriod(selectedPeriod.id)}
                            disabled={processingAction === `process-${selectedPeriod.id}`}
                          >
                            {processingAction === `process-${selectedPeriod.id}` ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Play className="mr-2 h-4 w-4" />
                            )}
                            Process
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Breakdown */}
                    <div className="mt-4 grid grid-cols-4 gap-2 border-t border-slate-100 pt-4 text-sm">
                      <div>
                        <p className="text-slate-500">Base</p>
                        <p className="font-medium">{formatCurrency(totalBase)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Commissions</p>
                        <p className="font-medium text-emerald-600">+{formatCurrency(totalCommissions)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Bonus</p>
                        <p className="font-medium text-emerald-600">+{formatCurrency(totalBonus)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Deductions</p>
                        <p className="font-medium text-red-600">-{formatCurrency(totalDeductions)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Entries */}
                  <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center justify-between border-b border-slate-200 p-4">
                      <h3 className="font-medium text-slate-900">Staff Entries</h3>
                      {selectedPeriod.status === 'DRAFT' && (
                        <Button size="sm" variant="outline" onClick={openAddEntryModal}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add Entry
                        </Button>
                      )}
                    </div>

                    {periodDetail.entries.length === 0 ? (
                      <div className="p-8 text-center">
                        <User className="mx-auto h-8 w-8 text-slate-300" />
                        <p className="mt-2 text-sm text-slate-500">No entries yet</p>
                        {selectedPeriod.status === 'DRAFT' && (
                          <Button className="mt-4" size="sm" onClick={openAddEntryModal}>
                            Add First Entry
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {periodDetail.entries.map((entry) => (
                          <div key={entry.id} className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                                  <User className="h-5 w-5 text-slate-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900">
                                    {entry.staff.firstName} {entry.staff.lastName}
                                  </p>
                                  <p className="text-sm text-slate-500">{entry.staff.role}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="font-semibold text-slate-900">
                                    {formatCurrency(entry.totalAmount)}
                                  </p>
                                  {entry.paidAt && (
                                    <p className="text-xs text-emerald-600">
                                      Paid {formatDate(entry.paidAt)}
                                    </p>
                                  )}
                                </div>
                                {selectedPeriod.status === 'DRAFT' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:bg-red-50"
                                    onClick={() => handleDeleteEntry(entry.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                            {entry.notes && (
                              <p className="mt-2 text-sm text-slate-500">{entry.notes}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>

      {/* Create Period Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Payroll Period</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Start Date</label>
              <Input
                type="date"
                value={createStartDate}
                onChange={(e) => setCreateStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">End Date</label>
              <Input
                type="date"
                value={createEndDate}
                onChange={(e) => setCreateEndDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreatePeriod}
                disabled={!createStartDate || !createEndDate || creating}
              >
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Period
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Entry Modal */}
      <Dialog open={showAddEntryModal} onOpenChange={setShowAddEntryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payroll Entry</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium text-slate-700">Staff Member</label>
              <select
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
              >
                <option value="">Select staff member</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} ({s.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Base Amount</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={entryBaseAmount}
                  onChange={(e) => setEntryBaseAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Commissions</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={entryCommissions}
                  onChange={(e) => setEntryCommissions(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Bonus</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={entryBonus}
                  onChange={(e) => setEntryBonus(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Deductions</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={entryDeductions}
                  onChange={(e) => setEntryDeductions(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Notes</label>
              <Input
                placeholder="Optional notes"
                value={entryNotes}
                onChange={(e) => setEntryNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddEntryModal(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddEntry}
                disabled={!selectedStaffId || !entryBaseAmount || addingEntry}
              >
                {addingEntry ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Add Entry
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
