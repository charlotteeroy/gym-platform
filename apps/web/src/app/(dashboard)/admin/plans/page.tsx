'use client';

import { useState, useEffect } from 'react';
import { Tag, Plus, Loader2, MoreHorizontal, Pencil, Trash2, X, Users, Check, Infinity } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface MembershipPlan {
  id: string;
  name: string;
  description: string | null;
  priceAmount: number;
  priceCurrency: string;
  billingInterval: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  classCredits: number;
  guestPasses: number;
  features: string[];
  isActive: boolean;
  createdAt: string;
  _count: {
    subscriptions: number;
  };
}

const BILLING_INTERVALS = [
  { value: 'WEEKLY', label: 'Weekly', short: '/wk' },
  { value: 'MONTHLY', label: 'Monthly', short: '/mo' },
  { value: 'QUARTERLY', label: 'Quarterly', short: '/qtr' },
  { value: 'YEARLY', label: 'Yearly', short: '/yr' },
] as const;

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
  CAD: 'C$',
  AUD: 'A$',
};

export default function PlansPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newFeature, setNewFeature] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priceAmount: '',
    priceCurrency: 'USD',
    billingInterval: 'MONTHLY' as MembershipPlan['billingInterval'],
    classCredits: '-1', // -1 for unlimited
    guestPasses: '0',
    features: [] as string[],
    isActive: true,
  });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/plans');
      const data = await response.json();

      if (data.success) {
        setPlans(data.data);
      } else {
        setError(data.error?.message || 'Failed to load plans');
      }
    } catch {
      setError('Failed to load plans');
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      description: '',
      priceAmount: '',
      priceCurrency: 'USD',
      billingInterval: 'MONTHLY',
      classCredits: '-1',
      guestPasses: '0',
      features: [],
      isActive: true,
    });
    setNewFeature('');
    setShowModal(true);
  };

  const openEditModal = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      priceAmount: plan.priceAmount.toString(),
      priceCurrency: plan.priceCurrency,
      billingInterval: plan.billingInterval,
      classCredits: plan.classCredits.toString(),
      guestPasses: plan.guestPasses.toString(),
      features: plan.features || [],
      isActive: plan.isActive,
    });
    setNewFeature('');
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const url = editingPlan
        ? `/api/admin/plans/${editingPlan.id}`
        : '/api/admin/plans';
      const method = editingPlan ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
          priceAmount: parseFloat(formData.priceAmount),
          priceCurrency: formData.priceCurrency,
          billingInterval: formData.billingInterval,
          classCredits: parseInt(formData.classCredits),
          guestPasses: parseInt(formData.guestPasses),
          features: formData.features,
          isActive: formData.isActive,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowModal(false);
        fetchPlans();
      } else {
        setError(data.error?.message || 'Failed to save plan');
      }
    } catch {
      setError('Failed to save plan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/plans/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        fetchPlans();
      } else {
        setError(data.error?.message || 'Failed to delete plan');
      }
    } catch {
      setError('Failed to delete plan');
    }
  };

  const toggleActive = async (plan: MembershipPlan) => {
    try {
      const response = await fetch(`/api/admin/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !plan.isActive }),
      });

      const data = await response.json();

      if (data.success) {
        fetchPlans();
      } else {
        setError(data.error?.message || 'Failed to update plan');
      }
    } catch {
      setError('Failed to update plan');
    }
  };

  const formatPrice = (amount: number, currency: string) => {
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    return `${symbol}${amount.toFixed(2)}`;
  };

  const addFeature = () => {
    if (newFeature.trim() && !formData.features.includes(newFeature.trim())) {
      setFormData({
        ...formData,
        features: [...formData.features, newFeature.trim()],
      });
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  if (isLoading) {
    return (
      <>
        <Header title="Membership Plans" description="Configure your gym's membership options" />
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        </div>
      </>
    );
  }

  const activePlans = plans.filter(p => p.isActive);
  const inactivePlans = plans.filter(p => !p.isActive);

  return (
    <>
      <Header title="Membership Plans" description="Configure your gym's membership options" />

      <div className="p-4 md:p-6 space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <Tag className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{plans.length}</p>
                <p className="text-sm text-slate-500">Total Plans</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Check className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{activePlans.length}</p>
                <p className="text-sm text-slate-500">Active Plans</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">
                  {plans.reduce((sum, p) => sum + p._count.subscriptions, 0)}
                </p>
                <p className="text-sm text-slate-500">Active Subscriptions</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Plan Button */}
        <div className="flex justify-end">
          <Button onClick={openAddModal} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Add Plan
          </Button>
        </div>

        {/* Plans Grid */}
        {plans.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Tag className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No membership plans</h3>
            <p className="text-sm text-slate-500 mb-6">
              Create your first membership plan to start accepting subscriptions.
            </p>
            <Button onClick={openAddModal} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Plan
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => {
              const interval = BILLING_INTERVALS.find(i => i.value === plan.billingInterval);
              return (
                <div
                  key={plan.id}
                  className={`bg-white rounded-2xl shadow-sm overflow-hidden ${!plan.isActive ? 'opacity-60' : ''}`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-900">{plan.name}</h3>
                          {!plan.isActive && (
                            <span className="inline-flex items-center rounded px-2 py-0.5 text-xs bg-slate-100 text-slate-500">
                              Inactive
                            </span>
                          )}
                        </div>
                        <p className="text-2xl font-bold text-slate-900 mt-1">
                          {formatPrice(Number(plan.priceAmount), plan.priceCurrency)}
                          <span className="text-sm font-normal text-slate-500">{interval?.short}</span>
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                            <MoreHorizontal className="h-4 w-4 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(plan)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleActive(plan)}>
                            {plan.isActive ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          {plan._count.subscriptions === 0 && (
                            <DropdownMenuItem
                              onClick={() => handleDelete(plan.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {plan.description && (
                      <p className="text-sm text-slate-500 mb-4">{plan.description}</p>
                    )}

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        {plan.classCredits === -1 ? (
                          <>
                            <Infinity className="w-4 h-4 text-emerald-500" />
                            <span>Unlimited classes</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 text-emerald-500" />
                            <span>{plan.classCredits} classes/month</span>
                          </>
                        )}
                      </div>
                      {plan.guestPasses > 0 && (
                        <div className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500" />
                          <span>{plan.guestPasses} guest passes/month</span>
                        </div>
                      )}
                      {plan.features?.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Check className="w-4 h-4 text-emerald-500" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">
                        <Users className="w-4 h-4 inline mr-1" />
                        {plan._count.subscriptions} subscribers
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingPlan ? 'Edit Plan' : 'Add Plan'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Plan Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Basic, Premium, VIP"
                  required
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what's included..."
                  rows={2}
                  className="rounded-xl resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priceAmount">Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                      {CURRENCY_SYMBOLS[formData.priceCurrency] || '$'}
                    </span>
                    <Input
                      id="priceAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.priceAmount}
                      onChange={(e) => setFormData({ ...formData, priceAmount: e.target.value })}
                      className="rounded-xl pl-8"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billingInterval">Billing Interval</Label>
                  <select
                    id="billingInterval"
                    value={formData.billingInterval}
                    onChange={(e) => setFormData({ ...formData, billingInterval: e.target.value as MembershipPlan['billingInterval'] })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    {BILLING_INTERVALS.map((interval) => (
                      <option key={interval.value} value={interval.value}>
                        {interval.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="classCredits">Class Credits</Label>
                  <Input
                    id="classCredits"
                    type="number"
                    value={formData.classCredits}
                    onChange={(e) => setFormData({ ...formData, classCredits: e.target.value })}
                    className="rounded-xl"
                  />
                  <p className="text-xs text-slate-500">-1 for unlimited</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guestPasses">Guest Passes/Month</Label>
                  <Input
                    id="guestPasses"
                    type="number"
                    min="0"
                    value={formData.guestPasses}
                    onChange={(e) => setFormData({ ...formData, guestPasses: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Features</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.features.map((feature, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs"
                    >
                      {feature}
                      <button type="button" onClick={() => removeFeature(index)} className="hover:text-slate-900">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    placeholder="e.g., Access to sauna, Free towels"
                    className="rounded-xl"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addFeature();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addFeature} className="rounded-xl">
                    Add
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <Label htmlFor="isActive" className="font-normal">Active (visible to new members)</Label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="rounded-xl">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingPlan ? 'Save Changes' : 'Create Plan'
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
