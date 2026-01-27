'use client';

import { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Loader2,
  X,
  MoreHorizontal,
  Calendar,
  TrendingDown,
  Target,
  Share2,
  Globe,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { ExportButton } from '@/components/ui/export-button';
import { type ExportColumn } from '@/lib/export';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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

interface ExpenseStats {
  totalExpenses: number;
  thisMonthExpenses: number;
  byCategory: Record<string, number>;
  count: number;
}

export default function MarketingExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<ExpenseStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [form, setForm] = useState({
    amount: '',
    description: '',
    vendor: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/expenses?categories=MARKETING');
      const data = await response.json();

      if (data.success) {
        setExpenses(data.data.expenses);
        setStats(data.data.stats);
      } else {
        setError(data.error?.message || 'Failed to load expenses');
      }
    } catch {
      setError('Failed to load expenses');
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (expense?: Expense) => {
    if (expense) {
      setEditingExpense(expense);
      setForm({
        amount: expense.amount.toString(),
        description: expense.description,
        vendor: expense.vendor || '',
        date: new Date(expense.date).toISOString().split('T')[0],
      });
    } else {
      setEditingExpense(null);
      setForm({
        amount: '',
        description: '',
        vendor: '',
        date: new Date().toISOString().split('T')[0],
      });
    }
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
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
          amount: parseFloat(form.amount),
          category: 'MARKETING',
          description: form.description,
          vendor: form.vendor || null,
          date: form.date,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowModal(false);
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

  const handleDelete = async (id: string) => {
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

  const marketingExportColumns: ExportColumn[] = [
    { header: 'Date', accessor: (e) => formatDate(e.date) },
    { header: 'Description', accessor: (e) => e.description || '' },
    { header: 'Channel/Platform', accessor: (e) => e.vendor || '' },
    { header: 'Amount', accessor: (e) => formatCurrency(Number(e.amount)), align: 'right' },
  ];

  const totalMarketing = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const thisMonthMarketing = expenses
    .filter(e => {
      const expDate = new Date(e.date);
      const now = new Date();
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    })
    .reduce((sum, e) => sum + Number(e.amount), 0);

  // Group by vendor
  const byVendor = expenses.reduce((acc, exp) => {
    const key = exp.vendor || 'Other';
    acc[key] = (acc[key] || 0) + Number(exp.amount);
    return acc;
  }, {} as Record<string, number>);

  const topVendors = Object.entries(byVendor)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <>
      <Header title="Marketing Expenditure" description="Track advertising, promotions, and campaigns" />

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center">
                <Megaphone className="w-6 h-6 text-pink-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalMarketing)}</p>
                <p className="text-sm text-slate-500">Total Marketing</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(thisMonthMarketing)}</p>
                <p className="text-sm text-slate-500">This Month</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{expenses.length}</p>
                <p className="text-sm text-slate-500">Campaigns</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Share2 className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{Object.keys(byVendor).length}</p>
                <p className="text-sm text-slate-500">Channels</p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Top Channels */}
        {topVendors.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-semibold text-slate-900 mb-4">Top Marketing Channels</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {topVendors.map(([vendor, amount], index) => (
                <div key={vendor} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold text-sm ${
                    index === 0 ? 'bg-pink-500' : index === 1 ? 'bg-purple-500' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 truncate">{vendor}</p>
                    <p className="text-sm text-slate-500">{formatCurrency(amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Marketing Expenditure</h2>
              <p className="text-sm text-slate-500">{expenses.length} entries</p>
            </div>
          </div>
          <div className="flex gap-2">
            <ExportButton
              data={expenses}
              columns={marketingExportColumns}
              filename="marketing-expenses"
              pdfTitle="Marketing Expenses Report"
              pdfSummary={[
                { label: 'Total Entries', value: `${expenses.length}` },
                { label: 'Total Amount', value: formatCurrency(totalMarketing) },
              ]}
            />
            <Button onClick={() => openModal()} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Add Expense
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="rounded-2xl bg-slate-100 p-5 mb-4">
                <TrendingDown className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No marketing expenses yet</h3>
              <p className="text-sm text-slate-500 text-center mb-5 max-w-sm">
                Track your advertising, social media, and promotional costs.
              </p>
              <Button onClick={() => openModal()} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Add Expense
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {expenses.map((expense) => (
                <div key={expense.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
                      <Megaphone className="w-5 h-5 text-pink-600" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(Number(expense.amount))}
                        </span>
                        {expense.vendor && (
                          <span className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium bg-pink-100 text-pink-700">
                            {expense.vendor}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 truncate">
                        {expense.description}
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
                          <DropdownMenuItem onClick={() => openModal(expense)}>
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(expense.id)}
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
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingExpense ? 'Edit Expense' : 'Add Marketing Expense'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                    className="rounded-xl"
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    required
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="vendor">Channel / Platform</Label>
                <Input
                  id="vendor"
                  value={form.vendor}
                  onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                  className="rounded-xl"
                  placeholder="e.g., Google Ads, Facebook, Instagram"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  required
                  className="rounded-xl"
                  placeholder="e.g., January ad campaign, Promotional flyers"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="rounded-xl">
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
