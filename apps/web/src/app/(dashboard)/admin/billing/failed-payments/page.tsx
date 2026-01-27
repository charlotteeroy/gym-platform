'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  Search,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Ban,
  User,
  Mail,
  Calendar,
  DollarSign,
  Filter,
  ChevronDown,
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
} from '@/components/ui/dropdown-menu';

interface FailedPayment {
  id: string;
  amount: number;
  failureCode: string | null;
  failureMessage: string | null;
  attemptNumber: number;
  nextRetryAt: string | null;
  status: 'PENDING' | 'RECOVERED' | 'FAILED_FINAL' | 'WRITTEN_OFF';
  createdAt: string;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  subscription: {
    id: string;
    plan: {
      name: string;
    } | null;
  };
}

interface FailedPaymentsResponse {
  items: FailedPayment[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const STATUS_CONFIG = {
  PENDING: { label: 'Pending', color: 'bg-amber-100 text-amber-700', icon: Clock },
  RECOVERED: { label: 'Recovered', color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 },
  FAILED_FINAL: { label: 'Final Failure', color: 'bg-red-100 text-red-700', icon: XCircle },
  WRITTEN_OFF: { label: 'Written Off', color: 'bg-slate-100 text-slate-600', icon: Ban },
};

export default function FailedPaymentsPage() {
  const [failedPayments, setFailedPayments] = useState<FailedPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<FailedPaymentsResponse['meta'] | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [writingOffId, setWritingOffId] = useState<string | null>(null);

  useEffect(() => {
    fetchFailedPayments();
  }, [page, statusFilter]);

  const fetchFailedPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: '20' });
      if (statusFilter) params.set('status', statusFilter);

      const response = await fetch(`/api/admin/billing/failed-payments?${params}`);
      const data = await response.json();

      if (data.success) {
        setFailedPayments(data.data.items);
        setMeta(data.data.meta);
      }
    } catch (error) {
      console.error('Failed to fetch failed payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      const response = await fetch(`/api/admin/billing/failed-payments/${id}/retry`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        // Refresh the list
        fetchFailedPayments();
      } else {
        alert(data.error?.message || 'Failed to retry payment');
      }
    } catch (error) {
      console.error('Failed to retry payment:', error);
      alert('Failed to retry payment');
    } finally {
      setRetryingId(null);
    }
  };

  const handleWriteOff = async (id: string) => {
    if (!confirm('Are you sure you want to write off this payment? This action cannot be undone.')) {
      return;
    }

    setWritingOffId(id);
    try {
      const response = await fetch(`/api/admin/billing/failed-payments/${id}/write-off`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        // Refresh the list
        fetchFailedPayments();
      } else {
        alert(data.error?.message || 'Failed to write off payment');
      }
    } catch (error) {
      console.error('Failed to write off payment:', error);
      alert('Failed to write off payment');
    } finally {
      setWritingOffId(null);
    }
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

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const failedPaymentExportColumns: ExportColumn[] = [
    { header: 'Member', accessor: (p) => `${p.member.firstName} ${p.member.lastName}` },
    { header: 'Email', accessor: (p) => p.member.email },
    { header: 'Plan', accessor: (p) => p.subscription?.plan?.name || '' },
    { header: 'Amount', accessor: (p) => formatCurrency(Number(p.amount)), align: 'right' },
    { header: 'Status', accessor: (p) => p.status },
    { header: 'Attempts', accessor: (p) => `${p.attemptNumber}/4` },
    { header: 'Failure Reason', accessor: (p) => p.failureMessage || p.failureCode || '' },
    { header: 'Failed Date', accessor: (p) => formatDate(p.createdAt) },
    { header: 'Next Retry', accessor: (p) => p.nextRetryAt ? formatDate(p.nextRetryAt) : '' },
  ];

  const filteredPayments = failedPayments.filter((payment) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      payment.member.firstName.toLowerCase().includes(searchLower) ||
      payment.member.lastName.toLowerCase().includes(searchLower) ||
      payment.member.email.toLowerCase().includes(searchLower)
    );
  });

  // Calculate summary stats
  const pendingCount = failedPayments.filter((p) => p.status === 'PENDING').length;
  const pendingAmount = failedPayments
    .filter((p) => p.status === 'PENDING')
    .reduce((sum, p) => sum + p.amount, 0);
  const recoveredCount = failedPayments.filter((p) => p.status === 'RECOVERED').length;

  return (
    <>
      <Header title="Failed Payments" />

      <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Failed Payments</h1>
              <p className="text-sm text-slate-500">
                Manage and recover failed subscription payments
              </p>
            </div>
            <Link href="/admin/billing">
              <Button variant="outline">Back to Accounting</Button>
            </Link>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-100 p-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-amber-600">Pending Recovery</p>
                  <p className="text-2xl font-bold text-amber-700">{pendingCount}</p>
                  <p className="text-sm text-amber-600">{formatCurrency(pendingAmount)} at risk</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 p-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-emerald-600">Recovered</p>
                  <p className="text-2xl font-bold text-emerald-700">{recoveredCount}</p>
                  <p className="text-sm text-emerald-600">Successfully collected</p>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-slate-100 p-2">
                  <AlertTriangle className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Total Failed</p>
                  <p className="text-2xl font-bold text-slate-900">{meta?.total || 0}</p>
                  <p className="text-sm text-slate-500">All time</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by member name or email..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  {statusFilter ? STATUS_CONFIG[statusFilter as keyof typeof STATUS_CONFIG]?.label : 'All Status'}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                  All Status
                </DropdownMenuItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <DropdownMenuItem key={key} onClick={() => setStatusFilter(key)}>
                    <config.icon className="mr-2 h-4 w-4" />
                    {config.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <ExportButton
              data={filteredPayments}
              columns={failedPaymentExportColumns}
              filename="failed-payments"
              pdfTitle="Failed Payments Report"
              pdfSummary={[
                { label: 'Total Failed', value: `${filteredPayments.length}` },
                { label: 'Total Amount', value: formatCurrency(filteredPayments.reduce((sum, p) => sum + Number(p.amount), 0)) },
              ]}
            />
          </div>

          {/* Table */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="py-12 text-center">
                <AlertTriangle className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-4 text-slate-500">No failed payments found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">
                        Member
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">
                        Plan
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">
                        Attempts
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">
                        Next Retry
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">
                        Failed
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPayments.map((payment) => {
                      const statusConfig = STATUS_CONFIG[payment.status];
                      const StatusIcon = statusConfig.icon;
                      const isRetrying = retryingId === payment.id;
                      const isWritingOff = writingOffId === payment.id;

                      return (
                        <tr key={payment.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
                                <User className="h-4 w-4 text-slate-600" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">
                                  {payment.member.firstName} {payment.member.lastName}
                                </p>
                                <p className="text-sm text-slate-500">{payment.member.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-slate-900">
                              {payment.subscription.plan?.name || 'Unknown Plan'}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-slate-900">
                              {formatCurrency(payment.amount)}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig.color}`}
                            >
                              <StatusIcon className="h-3.5 w-3.5" />
                              {statusConfig.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-slate-600">{payment.attemptNumber} / 4</p>
                          </td>
                          <td className="px-4 py-3">
                            {payment.nextRetryAt && payment.status === 'PENDING' ? (
                              <p className="text-sm text-slate-600">
                                {formatDate(payment.nextRetryAt)}
                              </p>
                            ) : (
                              <p className="text-sm text-slate-400">-</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm text-slate-600">{formatDate(payment.createdAt)}</p>
                            {payment.failureMessage && (
                              <p className="text-xs text-red-500 truncate max-w-[150px]" title={payment.failureMessage}>
                                {payment.failureMessage}
                              </p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {payment.status === 'PENDING' && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleRetry(payment.id)}
                                    disabled={isRetrying}
                                  >
                                    {isRetrying ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <RefreshCw className="mr-1 h-4 w-4" />
                                        Retry
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                    onClick={() => handleWriteOff(payment.id)}
                                    disabled={isWritingOff}
                                  >
                                    {isWritingOff ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <Ban className="mr-1 h-4 w-4" />
                                        Write Off
                                      </>
                                    )}
                                  </Button>
                                </>
                              )}
                              {payment.status === 'FAILED_FINAL' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                  onClick={() => handleWriteOff(payment.id)}
                                  disabled={isWritingOff}
                                >
                                  {isWritingOff ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Ban className="mr-1 h-4 w-4" />
                                      Write Off
                                    </>
                                  )}
                                </Button>
                              )}
                              <Link href={`/members/${payment.member.id}`}>
                                <Button variant="ghost" size="sm">
                                  <User className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
                <p className="text-sm text-slate-500">
                  Showing {(page - 1) * meta.limit + 1} to{' '}
                  {Math.min(page * meta.limit, meta.total)} of {meta.total} failed payments
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === meta.totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Dunning Info */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h3 className="font-medium text-blue-900">Automatic Dunning Schedule</h3>
            <div className="mt-2 grid gap-2 text-sm text-blue-800 sm:grid-cols-4">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Day 0: Payment fails</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Day 3: First retry</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span>Day 7: Second retry</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span>Day 14: Final retry + pause</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
