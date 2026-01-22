'use client';

import { useState, useEffect } from 'react';
import { ScrollText, Plus, Loader2, ArrowLeft, MoreHorizontal, Pencil, Trash2, X, Eye, EyeOff } from 'lucide-react';
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

interface Policy {
  id: string;
  type: 'rules' | 'cancellation' | 'terms' | 'privacy';
  title: string;
  content: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const POLICY_TYPES = [
  { value: 'rules', label: 'Gym Rules', description: 'General rules and regulations', color: 'bg-blue-100 text-blue-700' },
  { value: 'cancellation', label: 'Cancellation Policy', description: 'Booking and membership cancellation terms', color: 'bg-amber-100 text-amber-700' },
  { value: 'terms', label: 'Terms of Service', description: 'Legal terms and conditions', color: 'bg-purple-100 text-purple-700' },
  { value: 'privacy', label: 'Privacy Policy', description: 'How member data is handled', color: 'bg-emerald-100 text-emerald-700' },
] as const;

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    type: 'rules' as Policy['type'],
    title: '',
    content: '',
    isActive: true,
  });

  useEffect(() => {
    fetchPolicies();
  }, []);

  const fetchPolicies = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/gym/policies');
      const data = await response.json();

      if (data.success) {
        setPolicies(data.data);
      } else {
        setError(data.error?.message || 'Failed to load policies');
      }
    } catch {
      setError('Failed to load policies');
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingPolicy(null);
    setFormData({
      type: 'rules',
      title: '',
      content: '',
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (policy: Policy) => {
    setEditingPolicy(policy);
    setFormData({
      type: policy.type,
      title: policy.title,
      content: policy.content,
      isActive: policy.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const url = editingPolicy
        ? `/api/admin/gym/policies/${editingPolicy.id}`
        : '/api/admin/gym/policies';
      const method = editingPolicy ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        setShowModal(false);
        fetchPolicies();
      } else {
        setError(data.error?.message || 'Failed to save policy');
      }
    } catch {
      setError('Failed to save policy');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/gym/policies/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        fetchPolicies();
      } else {
        setError(data.error?.message || 'Failed to delete policy');
      }
    } catch {
      setError('Failed to delete policy');
    }
  };

  const toggleActive = async (policy: Policy) => {
    try {
      const response = await fetch(`/api/admin/gym/policies/${policy.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !policy.isActive }),
      });

      const data = await response.json();

      if (data.success) {
        fetchPolicies();
      } else {
        setError(data.error?.message || 'Failed to update policy');
      }
    } catch {
      setError('Failed to update policy');
    }
  };

  const getTypeConfig = (type: string) => {
    return POLICY_TYPES.find(t => t.value === type) || POLICY_TYPES[0];
  };

  if (isLoading) {
    return (
      <>
        <Header title="Policies" description="Manage gym rules and policies" />
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Policies" description="Manage gym rules and policies" />

      <div className="p-4 md:p-6 space-y-6 max-w-4xl">
        {/* Back Link */}
        <Link
          href="/admin/gym"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Gym Settings
        </Link>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
            {error}
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Add Policy Button */}
        <div className="flex justify-end">
          <Button onClick={openAddModal} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
            <Plus className="mr-2 h-4 w-4" />
            Add Policy
          </Button>
        </div>

        {/* Policies List */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <ScrollText className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">Gym Policies</h2>
                <p className="text-sm text-slate-500">Rules, terms, and policies for your members</p>
              </div>
            </div>
          </div>

          {policies.length === 0 ? (
            <div className="p-10 text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                <ScrollText className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No policies yet</h3>
              <p className="text-sm text-slate-500 mb-6">
                Add rules, terms of service, and other policies for your members.
              </p>
              <Button onClick={openAddModal} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Policy
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {policies.map((policy) => {
                const typeConfig = getTypeConfig(policy.type);
                return (
                  <div
                    key={policy.id}
                    className={`p-4 hover:bg-slate-50 transition-colors ${!policy.isActive ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-900">{policy.title}</h3>
                          <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium ${typeConfig.color}`}>
                            {typeConfig.label}
                          </span>
                          {!policy.isActive && (
                            <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">
                              Draft
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-slate-500 line-clamp-2">
                          {policy.content.substring(0, 200)}...
                        </p>
                        <p className="text-xs text-slate-400 mt-2">
                          Last updated: {new Date(policy.updatedAt).toLocaleDateString()}
                        </p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                            <MoreHorizontal className="h-4 w-4 text-slate-400" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditModal(policy)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleActive(policy)}>
                            {policy.isActive ? (
                              <>
                                <EyeOff className="mr-2 h-4 w-4" />
                                Make Draft
                              </>
                            ) : (
                              <>
                                <Eye className="mr-2 h-4 w-4" />
                                Publish
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(policy.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingPolicy ? 'Edit Policy' : 'Add Policy'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="type">Policy Type</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as Policy['type'] })}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  {POLICY_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500">
                  {POLICY_TYPES.find(t => t.value === formData.type)?.description}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Membership Cancellation Policy"
                  required
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Write your policy content here..."
                  rows={12}
                  required
                  className="rounded-xl resize-none font-mono text-sm"
                />
                <p className="text-xs text-slate-500">
                  {formData.content.length} characters
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <Label htmlFor="isActive" className="font-normal">
                  Publish immediately (visible to members)
                </Label>
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
                    editingPolicy ? 'Save Changes' : 'Add Policy'
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
