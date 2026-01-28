'use client';

import { useState, useEffect } from 'react';
import {
  Ticket,
  Plus,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  Users,
  Clock,
  ChevronRight,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
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
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

interface MemberPass {
  id: string;
  status: string;
  creditsTotal: number;
  creditsRemaining: number;
  expiresAt: string | null;
  createdAt: string;
  member: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  product: {
    name: string;
    type: string;
    priceAmount: number;
    classCredits: number | null;
  };
}

interface MemberPassStats {
  active: number;
  depleted: number;
  expired: number;
  totalCreditsInUse: number;
}

interface PassProduct {
  id: string;
  name: string;
  description: string | null;
  priceAmount: number;
  type: 'CLASS_PACK' | 'DROP_IN';
  classCredits: number | null;
  validityDays: number | null;
  isActive: boolean;
  _count: {
    passes: number;
  };
}

function PassStatusBadge({ status }: { status: string }) {
  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">
        Active
      </span>
    );
  }
  if (status === 'DEPLETED') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">
        Depleted
      </span>
    );
  }
  if (status === 'EXPIRED') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700">
        Expired
      </span>
    );
  }
  if (status === 'CANCELLED') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
        Cancelled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700">
      {status}
    </span>
  );
}

export default function PassesPage() {
  const [passProducts, setPassProducts] = useState<PassProduct[]>([]);
  const [memberPasses, setMemberPasses] = useState<MemberPass[]>([]);
  const [memberPassStats, setMemberPassStats] = useState<MemberPassStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPassModal, setShowPassModal] = useState(false);
  const [editingPass, setEditingPass] = useState<PassProduct | null>(null);
  const [isSavingPass, setIsSavingPass] = useState(false);
  const [passFormData, setPassFormData] = useState({
    name: '',
    description: '',
    priceAmount: '',
    type: 'CLASS_PACK' as 'CLASS_PACK' | 'DROP_IN',
    classCredits: '10',
    validityDays: '90',
    noExpiry: false,
    isActive: true,
  });

  useEffect(() => {
    fetchPassProducts();
    fetchMemberPasses();
  }, []);

  const fetchPassProducts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/passes');
      const data = await response.json();
      if (data.success) {
        setPassProducts(data.data);
      } else {
        setError(data.error?.message || 'Failed to load passes');
      }
    } catch {
      setError('Failed to load passes');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMemberPasses = async () => {
    try {
      const response = await fetch('/api/admin/passes/members');
      const data = await response.json();
      if (data.success) {
        setMemberPasses(data.data.passes);
        setMemberPassStats(data.data.stats);
      }
    } catch {
      // Member passes are secondary
    }
  };

  const openAddPassModal = () => {
    setEditingPass(null);
    setPassFormData({
      name: '',
      description: '',
      priceAmount: '',
      type: 'CLASS_PACK',
      classCredits: '10',
      validityDays: '90',
      noExpiry: false,
      isActive: true,
    });
    setShowPassModal(true);
  };

  const openEditPassModal = (pass: PassProduct) => {
    setEditingPass(pass);
    setPassFormData({
      name: pass.name,
      description: pass.description || '',
      priceAmount: Number(pass.priceAmount).toString(),
      type: pass.type,
      classCredits: (pass.classCredits ?? 1).toString(),
      validityDays: pass.validityDays ? pass.validityDays.toString() : '90',
      noExpiry: pass.validityDays === null,
      isActive: pass.isActive,
    });
    setShowPassModal(true);
  };

  const handlePassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPass(true);
    setError(null);

    try {
      const url = editingPass
        ? `/api/admin/passes/${editingPass.id}`
        : '/api/admin/passes';
      const method = editingPass ? 'PATCH' : 'POST';

      const payload: Record<string, unknown> = {
        name: passFormData.name,
        priceAmount: parseFloat(passFormData.priceAmount),
        type: passFormData.type,
        classCredits: parseInt(passFormData.classCredits),
        validityDays: passFormData.noExpiry ? null : parseInt(passFormData.validityDays),
        isActive: passFormData.isActive,
      };
      if (passFormData.description) {
        payload.description = passFormData.description;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.success) {
        setShowPassModal(false);
        fetchPassProducts();
      } else {
        setError(data.error?.message || 'Failed to save pass product');
      }
    } catch {
      setError('Failed to save pass product');
    } finally {
      setIsSavingPass(false);
    }
  };

  const handleDeletePass = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pass product?')) return;
    try {
      const response = await fetch(`/api/admin/passes/${id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        fetchPassProducts();
      } else {
        setError(data.error?.message || 'Failed to delete pass product');
      }
    } catch {
      setError('Failed to delete pass product');
    }
  };

  const togglePassActive = async (pass: PassProduct) => {
    try {
      const response = await fetch(`/api/admin/passes/${pass.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !pass.isActive }),
      });
      const data = await response.json();
      if (data.success) {
        fetchPassProducts();
      } else {
        setError(data.error?.message || 'Failed to update pass product');
      }
    } catch {
      setError('Failed to update pass product');
    }
  };

  if (isLoading) {
    return (
      <>
        <Header title="Passes & Drop-Ins" description="Manage class packs and drop-in options" />
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        </div>
      </>
    );
  }

  const activeProducts = passProducts.filter((p) => p.isActive);
  const totalActivePasses = passProducts.reduce((sum, p) => sum + p._count.passes, 0);

  return (
    <>
      <Header title="Passes & Drop-Ins" description="Manage class packs and drop-in options" />

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
                <Ticket className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{passProducts.length}</p>
                <p className="text-sm text-slate-500">Total Products</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Ticket className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{activeProducts.length}</p>
                <p className="text-sm text-slate-500">Active Products</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{totalActivePasses}</p>
                <p className="text-sm text-slate-500">Active Member Passes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Pass Button */}
        <div className="flex justify-end">
          <Button onClick={openAddPassModal} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Add Pass
          </Button>
        </div>

        {/* Pass Products Grid */}
        {passProducts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Ticket className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No passes yet</h3>
            <p className="text-sm text-slate-500 mb-6">
              Create class packs or drop-in options for members without subscriptions.
            </p>
            <Button onClick={openAddPassModal} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Pass
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {passProducts.map((pass) => (
              <div
                key={pass.id}
                className={`bg-white rounded-2xl shadow-sm overflow-hidden ${!pass.isActive ? 'opacity-60' : ''}`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-900">{pass.name}</h3>
                        <span
                          className={`inline-flex items-center rounded px-2 py-0.5 text-xs ${
                            pass.type === 'DROP_IN'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-indigo-100 text-indigo-700'
                          }`}
                        >
                          {pass.type === 'DROP_IN' ? 'Drop-In' : 'Class Pack'}
                        </span>
                        {!pass.isActive && (
                          <span className="inline-flex items-center rounded px-2 py-0.5 text-xs bg-slate-100 text-slate-500">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-2xl font-bold text-slate-900 mt-1">
                        ${Number(pass.priceAmount).toFixed(2)}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                          <MoreHorizontal className="h-4 w-4 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditPassModal(pass)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => togglePassActive(pass)}>
                          {pass.isActive ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        {pass._count.passes === 0 && (
                          <DropdownMenuItem
                            onClick={() => handleDeletePass(pass.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {pass.description && (
                    <p className="text-sm text-slate-500 mb-3">{pass.description}</p>
                  )}

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-indigo-500" />
                      <span>
                        {pass.classCredits ?? 1}{' '}
                        {(pass.classCredits ?? 1) === 1 ? 'credit' : 'credits'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span>
                        {pass.validityDays
                          ? `Valid for ${pass.validityDays} days`
                          : 'No expiry'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">
                      <Users className="w-4 h-4 inline mr-1" />
                      {pass._count.passes} active passes
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {/* All Member Passes */}
        {memberPasses.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                All Member Passes
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {memberPasses.length} total &middot;{' '}
                {memberPassStats?.active ?? 0} active
                {(memberPassStats?.depleted ?? 0) > 0 && (
                  <span> &middot; {memberPassStats?.depleted} depleted</span>
                )}
                {(memberPassStats?.expired ?? 0) > 0 && (
                  <span className="text-amber-600">
                    {' '}&middot; {memberPassStats?.expired} expired
                  </span>
                )}
              </p>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {memberPasses.map((mp) => {
                const isExpiringSoon = mp.expiresAt &&
                  new Date(mp.expiresAt).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 &&
                  mp.status === 'ACTIVE';
                return (
                  <Link
                    key={mp.id}
                    href={`/members/${mp.member.id}`}
                    className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <p className="font-medium text-sm truncate">
                          {mp.member.firstName} {mp.member.lastName}
                        </p>
                        <PassStatusBadge status={mp.status} />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{mp.product.name}</Badge>
                        <span>
                          {mp.creditsRemaining}/{mp.creditsTotal} credits
                        </span>
                        {isExpiringSoon && (
                          <span className="text-amber-600 flex items-center gap-0.5">
                            <AlertTriangle className="w-3 h-3" /> Expiring soon
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  </Link>
                );
              })}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block px-5 pb-5">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500 border-b">
                  <tr>
                    <th className="pb-3 font-medium">Member</th>
                    <th className="pb-3 font-medium">Pass</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Credits</th>
                    <th className="pb-3 font-medium">Expires</th>
                    <th className="pb-3 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {memberPasses.map((mp) => {
                    const pct = mp.creditsTotal > 0
                      ? Math.round((mp.creditsRemaining / mp.creditsTotal) * 100)
                      : 0;
                    return (
                      <tr key={mp.id} className="hover:bg-slate-50">
                        <td className="py-3">
                          <div className="font-medium">
                            {mp.member.firstName} {mp.member.lastName}
                          </div>
                          <div className="text-xs text-slate-500">{mp.member.email}</div>
                        </td>
                        <td className="py-3">
                          <Badge variant="outline">{mp.product.name}</Badge>
                        </td>
                        <td className="py-3">
                          <PassStatusBadge status={mp.status} />
                        </td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  pct > 50 ? 'bg-indigo-500' : pct > 20 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
                              {mp.creditsRemaining}/{mp.creditsTotal}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-slate-500">
                          {mp.expiresAt
                            ? new Date(mp.expiresAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : 'No expiry'}
                        </td>
                        <td className="py-3">
                          <Link href={`/members/${mp.member.id}`}>
                            <Button variant="ghost" size="icon">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Pass Add/Edit Modal */}
      {showPassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPassModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingPass ? 'Edit Pass Product' : 'Add Pass Product'}
              </h2>
              <button
                onClick={() => setShowPassModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handlePassSubmit} className="p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="passName">Name</Label>
                <Input
                  id="passName"
                  value={passFormData.name}
                  onChange={(e) => setPassFormData({ ...passFormData, name: e.target.value })}
                  placeholder="e.g., 10-Class Pack, Drop-In Session"
                  required
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passDescription">Description</Label>
                <Textarea
                  id="passDescription"
                  value={passFormData.description}
                  onChange={(e) =>
                    setPassFormData({ ...passFormData, description: e.target.value })
                  }
                  placeholder="Describe this pass..."
                  rows={2}
                  className="rounded-xl resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passPrice">Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                      $
                    </span>
                    <Input
                      id="passPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      value={passFormData.priceAmount}
                      onChange={(e) =>
                        setPassFormData({ ...passFormData, priceAmount: e.target.value })
                      }
                      className="rounded-xl pl-8"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passType">Type</Label>
                  <select
                    id="passType"
                    value={passFormData.type}
                    onChange={(e) => {
                      const type = e.target.value as 'CLASS_PACK' | 'DROP_IN';
                      setPassFormData({
                        ...passFormData,
                        type,
                        classCredits: type === 'DROP_IN' ? '1' : passFormData.classCredits,
                      });
                    }}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="CLASS_PACK">Class Pack</option>
                    <option value="DROP_IN">Drop-In</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passCredits">Credits</Label>
                  <Input
                    id="passCredits"
                    type="number"
                    min="1"
                    value={passFormData.classCredits}
                    onChange={(e) =>
                      setPassFormData({ ...passFormData, classCredits: e.target.value })
                    }
                    className="rounded-xl"
                    disabled={passFormData.type === 'DROP_IN'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passValidity">Validity (days)</Label>
                  <Input
                    id="passValidity"
                    type="number"
                    min="1"
                    value={passFormData.validityDays}
                    onChange={(e) =>
                      setPassFormData({ ...passFormData, validityDays: e.target.value })
                    }
                    className="rounded-xl"
                    disabled={passFormData.noExpiry}
                  />
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="checkbox"
                      id="noExpiry"
                      checked={passFormData.noExpiry}
                      onChange={(e) =>
                        setPassFormData({ ...passFormData, noExpiry: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-slate-300"
                    />
                    <label htmlFor="noExpiry" className="text-xs text-slate-500">
                      No expiry
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="passIsActive"
                  checked={passFormData.isActive}
                  onChange={(e) =>
                    setPassFormData({ ...passFormData, isActive: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-slate-300"
                />
                <Label htmlFor="passIsActive" className="font-normal">
                  Active (available for purchase)
                </Label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPassModal(false)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingPass}
                  className="bg-slate-900 hover:bg-slate-800 rounded-xl"
                >
                  {isSavingPass ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : editingPass ? (
                    'Save Changes'
                  ) : (
                    'Create Pass'
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
