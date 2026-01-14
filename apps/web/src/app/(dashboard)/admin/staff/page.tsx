'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, UserCog, MoreHorizontal, Loader2, Mail, Phone, DollarSign, X } from 'lucide-react';
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

interface Staff {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'INSTRUCTOR' | 'FRONT_DESK';
  avatarUrl: string | null;
  hireDate: string;
  hourlyRate: number | null;
  isActive: boolean;
  createdAt: string;
}

const ROLES = [
  { value: 'OWNER', label: 'Owner', color: 'bg-purple-100 text-purple-700' },
  { value: 'ADMIN', label: 'Admin', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'MANAGER', label: 'Manager', color: 'bg-blue-100 text-blue-700' },
  { value: 'INSTRUCTOR', label: 'Instructor', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'FRONT_DESK', label: 'Front Desk', color: 'bg-amber-100 text-amber-700' },
];

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: 'INSTRUCTOR' as Staff['role'],
    hireDate: new Date().toISOString().split('T')[0],
    hourlyRate: '',
    isActive: true,
  });

  useEffect(() => {
    fetchStaff();
  }, [roleFilter]);

  const fetchStaff = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (roleFilter !== 'all') {
        params.set('role', roleFilter);
      }

      const response = await fetch(`/api/admin/staff?${params}`);
      const data = await response.json();

      if (data.success) {
        setStaff(data.data);
      } else {
        setError(data.error?.message || 'Failed to load staff');
      }
    } catch {
      setError('Failed to load staff');
    } finally {
      setIsLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingStaff(null);
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      role: 'INSTRUCTOR',
      hireDate: new Date().toISOString().split('T')[0],
      hourlyRate: '',
      isActive: true,
    });
    setShowModal(true);
  };

  const openEditModal = (member: Staff) => {
    setEditingStaff(member);
    setFormData({
      firstName: member.firstName,
      lastName: member.lastName,
      email: member.email,
      phone: member.phone || '',
      role: member.role,
      hireDate: new Date(member.hireDate).toISOString().split('T')[0],
      hourlyRate: member.hourlyRate?.toString() || '',
      isActive: member.isActive,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const url = editingStaff ? `/api/admin/staff/${editingStaff.id}` : '/api/admin/staff';
      const method = editingStaff ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          phone: formData.phone || null,
          hourlyRate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setShowModal(false);
        fetchStaff();
      } else {
        setError(data.error?.message || 'Failed to save staff member');
      }
    } catch {
      setError('Failed to save staff member');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/staff/${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        fetchStaff();
      } else {
        setError(data.error?.message || 'Failed to delete staff member');
      }
    } catch {
      setError('Failed to delete staff member');
    }
  };

  const toggleActive = async (member: Staff) => {
    try {
      const response = await fetch(`/api/admin/staff/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !member.isActive }),
      });

      const data = await response.json();

      if (data.success) {
        fetchStaff();
      } else {
        setError(data.error?.message || 'Failed to update staff member');
      }
    } catch {
      setError('Failed to update staff member');
    }
  };

  const getRoleBadge = (role: string) => {
    const roleConfig = ROLES.find((r) => r.value === role);
    return (
      <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${roleConfig?.color || 'bg-slate-100 text-slate-600'}`}>
        {roleConfig?.label || role}
      </span>
    );
  };

  const filteredStaff = staff.filter((member) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      member.firstName.toLowerCase().includes(searchLower) ||
      member.lastName.toLowerCase().includes(searchLower) ||
      member.email.toLowerCase().includes(searchLower)
    );
  });

  const stats = {
    total: staff.length,
    active: staff.filter((s) => s.isActive).length,
    byRole: ROLES.map((r) => ({
      ...r,
      count: staff.filter((s) => s.role === r.value).length,
    })),
  };

  return (
    <>
      <Header title="Staff Management" description="Manage your gym staff members" />

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <UserCog className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-sm text-slate-500">Total Staff</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <UserCog className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{stats.active}</p>
                <p className="text-sm text-slate-500">Active</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm col-span-2">
            <p className="text-sm text-slate-500 mb-3">By Role</p>
            <div className="flex flex-wrap gap-2">
              {stats.byRole.filter((r) => r.count > 0).map((r) => (
                <span key={r.value} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${r.color}`}>
                  {r.label}: {r.count}
                </span>
              ))}
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

        {/* Filters & Actions */}
        <div className="bg-white rounded-2xl shadow-sm p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search staff..."
                className="pl-10 rounded-xl"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="all">All Roles</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>

            <Button onClick={openAddModal} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
              <Plus className="mr-2 h-4 w-4" />
              Add Staff
            </Button>
          </div>
        </div>

        {/* Staff List */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="rounded-2xl bg-slate-100 p-5 mb-4">
                <UserCog className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No staff found</h3>
              <p className="text-sm text-slate-500 text-center mb-5 max-w-sm">
                {search || roleFilter !== 'all' ? 'Try adjusting your filters.' : 'Add your first staff member to get started.'}
              </p>
              {!search && roleFilter === 'all' && (
                <Button onClick={openAddModal} className="bg-slate-900 hover:bg-slate-800 rounded-xl">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Staff Member
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredStaff.map((member) => (
                <div key={member.id} className={`p-4 hover:bg-slate-50 transition-colors ${!member.isActive ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-lg font-semibold text-slate-600">
                        {member.firstName[0]}{member.lastName[0]}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-slate-900">
                          {member.firstName} {member.lastName}
                        </h3>
                        {getRoleBadge(member.role)}
                        {!member.isActive && (
                          <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-500">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          {member.email}
                        </span>
                        {member.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5" />
                            {member.phone}
                          </span>
                        )}
                        {member.hourlyRate && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5" />
                            ${Number(member.hourlyRate).toFixed(2)}/hr
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                          <MoreHorizontal className="h-4 w-4 text-slate-400" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditModal(member)}>
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleActive(member)}>
                          {member.isActive ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        {member.role !== 'OWNER' && (
                          <DropdownMenuItem
                            onClick={() => handleDelete(member.id)}
                            className="text-red-600"
                          >
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">
                {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-lg">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    required
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    required
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as Staff['role'] })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                    disabled={editingStaff?.role === 'OWNER'}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.hourlyRate}
                    onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                    placeholder="0.00"
                    className="rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hireDate">Hire Date</Label>
                <Input
                  id="hireDate"
                  type="date"
                  value={formData.hireDate}
                  onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                  className="rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300"
                />
                <Label htmlFor="isActive" className="font-normal">Active staff member</Label>
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
                    editingStaff ? 'Save Changes' : 'Add Staff'
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
