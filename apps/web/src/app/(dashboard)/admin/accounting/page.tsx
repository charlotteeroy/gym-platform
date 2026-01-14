'use client';

import { useState, useEffect } from 'react';
import {
  Receipt,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Loader2,
  X,
  CreditCard,
  Banknote,
  Building,
  MoreHorizontal,
  FileText,
  Calendar,
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
} from '@/components/ui/dropdown-menu';

interface Payment {
  id: string;
  amount: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';
  method: 'CARD' | 'CASH' | 'BANK_TRANSFER' | 'OTHER';
  description: string | null;
  createdAt: string;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  vendor: string | null;
  date: string;
  staff: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface PaymentStats {
  totalRevenue: number;
  thisMonthRevenue: number;
  pendingAmount: number;
  totalPayments: number;
}

interface ExpenseStats {
  totalExpenses: number;
  thisMonthExpenses: number;
  byCategory: Record<string, number>;
  count: number;
}

const TABS = [
  { id: 'payments', label: 'Payments', icon: DollarSign },
  { id: 'expenses', label: 'Expenses', icon: TrendingDown },
];

const PAYMENT_METHODS = [
  { value: 'CARD', label: 'Card', icon: CreditCard },
  { value: 'CASH', label: 'Cash', icon: Banknote },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building },
  { value: 'OTHER', label: 'Other', icon: Receipt },
];

const PAYMENT_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'FAILED', label: 'Failed', color: 'bg-red-100 text-red-700' },
  { value: 'REFUNDED', label: 'Refunded', color: 'bg-slate-100 text-slate-600' },
];

const EXPENSE_CATEGORIES = [
  { value: 'RENT', label: 'Rent', color: 'bg-purple-100 text-purple-700' },
  { value: 'UTILITIES', label: 'Utilities', color: 'bg-blue-100 text-blue-700' },
  { value: 'EQUIPMENT', label: 'Equipment', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'MAINTENANCE', label: 'Maintenance', color: 'bg-amber-100 text-amber-700' },
  { value: 'MARKETING', label: 'Marketing', color: 'bg-pink-100 text-pink-700' },
  { value: 'PAYROLL', label: 'Payroll', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'SUPPLIES', label: 'Supplies', color: 'bg-cyan-100 text-cyan-700' },
  { value: 'INSURANCE', label: 'Insurance', color: 'bg-orange-100 text-orange-700' },
  { value: 'OTHER', label: 'Other', color: 'bg-slate-100 text-slate-600' },
];

export default function AccountingPage() {
  const [activeTab, setActiveTab] = useState('payments');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseStats, setExpenseStats] = useState<ExpenseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'CASH' as Payment['method'],
    status: 'COMPLETED' as Payment['status'],
    description: '',
  });

  // Expense Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState({
    amount: '',
    category: 'OTHER' as string,
    description: '',
    vendor: '',
    date: new Date().toISOString().split('T')[0],
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (activeTab === 'payments') {
      fetchPayments();
    } else if (activeTab === 'expenses') {
      fetchExpenses();
    }
  }, [activeTab]);

  const fetchPayments = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/payments');
      const data = await response.json();

      if (data.success) {
        setPayments(data.data.payments);
        setPaymentStats(data.data.stats);
      } else {
        setError(data.error?.message || 'Failed to load payments');
      }
    } catch {
      setError('Failed to load payments');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchExpenses = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/expenses');
      const data = await response.json();

      if (data.success) {
        setExpenses(data.data.expenses);
        setExpenseStats(data.data.stats);
      } else {
        setError(data.error?.message || 'Failed to load expenses');
      }
    } catch {
      setError('Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(paymentForm.amount),
          method: paymentForm.method,
          status: paymentForm.status,
          description: paymentForm.description || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowPaymentModal(false);
        setPaymentForm({ amount: '', method: 'CASH', status: 'COMPLETED', description: '' });
        fetchPayments();
      } else {
        setError(data.error?.message || 'Failed to create payment');
      }
    } catch {
      setError('Failed to create payment');
    } finally {
      setIsSaving(false);
    }
  };

  const openExpenseModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setExpenseForm({
        amount: expense.amount.toString(),
        category: expense.category,
        description: expense.description,
        vendor: expense.vendor || '',
        date: new Date(expense.date).toISOString().split('T')[0],
      });
    } else {
      setEditingExpense(null);
      setExpenseForm({
        amount: '',
        category: 'OTHER',
        description: '',
        vendor: '',
        date: new Date().toISOString().split('T')[0],
      });
    }
    setShowExpenseModal(true);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const url = editingExpense ? `/api/admin/expenses/${editingExpense.id}` : '/api/admin/expenses';
      const method = editingExpense ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(expenseForm.amount),
          category: expenseForm.category,
          description: expenseForm.description,
          vendor: expenseForm.vendor || null,
          date: expenseForm.date,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowExpenseModal(false);
        fetchExpenses();
      } else {
        setError(data.error?.message || 'Failed to save expense');
      }
    } catch {
      setError('Failed to save expense');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const response = await fetch(`/api/admin/expenses/${id}`, { method: 'DELETE' });
      const data = await response.json();

      if (data.success) {
        fetchExpenses();
      } else {
        setError(data.error?.message || 'Failed to delete expense');
      }
    } catch {
      setError('Failed to delete expense');
    }
  };

  const getStatusBadge = (status: string) => {
    const config = PAYMENT_STATUSES.find((s) => s.value === status);
    return (
      <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${config?.color || 'bg-slate-100 text-slate-600'}`}>
        {config?.label || status}
      </span>
    );
  };

  const getCategoryBadge = (category: string) => {
    const config = EXPENSE_CATEGORIES.find((c) => c.value === category);
    return (
      <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${config?.color || 'bg-slate-100 text-slate-600'}`}>
        {config?.label || category}
      </span>
    );
  };

  const getMethodIcon = (method: string) => {
    const config = PAYMENT_METHODS.find((m) => m.value === method);
    const Icon = config?.icon || Receipt;
    return <Icon className="w-4 h-4" />;
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

  return (
    <>
      <Header title="Accounting" description="Manage payments and expenses" />

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(paymentStats?.totalRevenue || 0)}
                </p>
                <p className="text-sm text-slate-500">Total Revenue</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(paymentStats?.thisMonthRevenue || 0)}
                </p>
                <p className="text-sm text-slate-500">This Month</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(expenseStats?.thisMonthExpenses || 0)}
                </p>
                <p className="text-sm text-slate-500">Expenses (Month)</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {formatCurrency(paymentStats?.pendingAmount || 0)}
                </p>
                <p className="text-sm text-slate-500">Pending</p>
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

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm p-2">
          <div className="flex gap-2">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}

            <div className="flex-1" />

            {activeTab === 'payments' && (
              <Button onClick={() => setShowPaymentModal(true)} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Add Payment
              </Button>
            )}
            {activeTab === 'expenses' && (
              <Button onClick={() => openExpenseModal()} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : activeTab === 'payments' ? (
            payments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="rounded-2xl bg-slate-100 p-5 mb-4">
                  <DollarSign className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No payments yet</h3>
                <p className="text-sm text-slate-500 text-center mb-5 max-w-sm">
                  Record your first payment to start tracking revenue.
                </p>
                <Button onClick={() => setShowPaymentModal(true)} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Payment
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {payments.map((payment) => (
                  <div key={payment.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        payment.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' :
                        payment.status === 'PENDING' ? 'bg-amber-100 text-amber-600' :
                        payment.status === 'FAILED' ? 'bg-red-100 text-red-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {getMethodIcon(payment.method)}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(Number(payment.amount))}
                          </span>
                          {getStatusBadge(payment.status)}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                          {payment.member ? (
                            <span>{payment.member.firstName} {payment.member.lastName}</span>
                          ) : (
                            <span className="italic">No member</span>
                          )}
                          {payment.description && (
                            <>
                              <span className="w-1 h-1 bg-slate-300 rounded-full" />
                              <span className="truncate">{payment.description}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-right text-sm text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(payment.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'expenses' ? (
            expenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <div className="rounded-2xl bg-slate-100 p-5 mb-4">
                  <TrendingDown className="h-10 w-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">No expenses yet</h3>
                <p className="text-sm text-slate-500 text-center mb-5 max-w-sm">
                  Track your gym expenses to monitor spending.
                </p>
                <Button onClick={() => openExpenseModal()} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Expense
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {expenses.map((expense) => (
                  <div key={expense.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900">
                            {formatCurrency(Number(expense.amount))}
                          </span>
                          {getCategoryBadge(expense.category)}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                          <span className="truncate">{expense.description}</span>
                          {expense.vendor && (
                            <>
                              <span className="w-1 h-1 bg-slate-300 rounded-full" />
                              <span>{expense.vendor}</span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right text-sm text-slate-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(expense.date)}
                          </div>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                              <MoreHorizontal className="h-4 w-4 text-slate-400" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openExpenseModal(expense)}>
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="text-red-600"
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : null}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPaymentModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Record Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleAddPayment} className="p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  required
                  className="rounded-xl"
                  placeholder="0.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="method">Method</Label>
                  <select
                    id="method"
                    value={paymentForm.method}
                    onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value as Payment['method'] })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={paymentForm.status}
                    onChange={(e) => setPaymentForm({ ...paymentForm, status: e.target.value as Payment['status'] })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                  >
                    {PAYMENT_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  value={paymentForm.description}
                  onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                  className="rounded-xl"
                  placeholder="e.g., Monthly membership"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowPaymentModal(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add Payment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowExpenseModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingExpense ? 'Edit Expense' : 'Add Expense'}
              </h2>
              <button onClick={() => setShowExpenseModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expenseAmount">Amount ($)</Label>
                  <Input
                    id="expenseAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    required
                    className="rounded-xl"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expenseDate">Date</Label>
                  <Input
                    id="expenseDate"
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    required
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expenseDescription">Description</Label>
                <Input
                  id="expenseDescription"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  required
                  className="rounded-xl"
                  placeholder="e.g., Monthly rent payment"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor">Vendor (optional)</Label>
                <Input
                  id="vendor"
                  value={expenseForm.vendor}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                  className="rounded-xl"
                  placeholder="e.g., ABC Supplies"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowExpenseModal(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingExpense ? 'Save Changes' : 'Add Expense'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
