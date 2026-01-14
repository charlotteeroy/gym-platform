"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MessageSquare,
  Plus,
  ArrowLeft,
  Send,
  Users,
  CheckCircle,
  Trash2,
  Pencil,
  Tag,
  UserPlus,
  Star,
  AlertTriangle,
  UserX,
  Clock,
  Gift,
} from "lucide-react";
import { Header } from "@/components/layout/header";

interface Campaign {
  id: string;
  name: string;
  type: "EMAIL" | "SMS";
  status: "DRAFT" | "SCHEDULED" | "SENDING" | "SENT" | "PAUSED" | "CANCELLED";
  subject: string | null;
  content: string;
  targetAudience: string;
  targetTagId: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  recipientCount: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  createdAt: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;
}

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SCHEDULED: "bg-blue-100 text-blue-600",
  SENDING: "bg-amber-100 text-amber-600",
  SENT: "bg-emerald-100 text-emerald-600",
  PAUSED: "bg-amber-100 text-amber-600",
  CANCELLED: "bg-red-100 text-red-600",
};

export default function SmsCampaignPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [targetAudience, setTargetAudience] = useState("all");
  const [targetTagId, setTargetTagId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [saving, setSaving] = useState(false);

  const MAX_SMS_LENGTH = 160;

  useEffect(() => {
    fetchCampaigns();
    fetchTags();
  }, []);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/campaigns?type=SMS");
      if (!response.ok) throw new Error("Failed to fetch campaigns");
      const data = await response.json();
      setCampaigns(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTags = async () => {
    try {
      const response = await fetch("/api/tags");
      if (!response.ok) throw new Error("Failed to fetch tags");
      const data = await response.json();
      setTags(data);
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setName("");
    setContent("");
    setTargetAudience("all");
    setTargetTagId("");
    setScheduledAt("");
    setEditingCampaign(null);
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setName(campaign.name);
    setContent(campaign.content);
    setTargetAudience(campaign.targetAudience);
    setTargetTagId(campaign.targetTagId || "");
    setScheduledAt(campaign.scheduledAt ? campaign.scheduledAt.slice(0, 16) : "");
    setShowForm(true);
  };

  const handleCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const url = editingCampaign
        ? `/api/campaigns/${editingCampaign.id}`
        : "/api/campaigns";
      const method = editingCampaign ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          type: "SMS",
          content,
          targetAudience,
          targetTagId: targetAudience === "tag" ? targetTagId : null,
          scheduledAt: scheduledAt || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to save campaign");
      await fetchCampaigns();
      setShowForm(false);
      resetForm();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete campaign");
      setCampaigns(campaigns.filter((c) => c.id !== id));
      setDeletingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSend = async (id: string) => {
    try {
      setSendingId(id);
      const response = await fetch(`/api/campaigns/${id}/send`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to send campaign");
      await fetchCampaigns();
    } catch (err) {
      console.error(err);
    } finally {
      setSendingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDeliveryRate = (campaign: Campaign) => {
    if (campaign.sentCount === 0) return 0;
    return ((campaign.deliveredCount / campaign.sentCount) * 100).toFixed(1);
  };

  if (showForm) {
    return (
      <>
        <Header
          title={editingCampaign ? "Edit SMS Campaign" : "Create SMS Campaign"}
          description="Send quick SMS messages to your members"
        />
        <div className="p-4 md:p-6">
          <button
            onClick={() => {
              setShowForm(false);
              resetForm();
            }}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to SMS Campaigns</span>
          </button>

          <div className="max-w-3xl space-y-6">
            {/* Campaign Details */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Campaign Details</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Campaign Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="e.g., Class Reminder"
                />
              </div>
            </div>

            {/* SMS Content */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">SMS Message</h2>
                <span
                  className={`text-sm font-medium ${
                    content.length > MAX_SMS_LENGTH ? "text-red-600" : "text-slate-500"
                  }`}
                >
                  {content.length}/{MAX_SMS_LENGTH}
                </span>
              </div>
              <p className="text-sm text-slate-500 mb-3">
                Use {"{{first_name}}"} and {"{{gym_name}}"} for personalization
              </p>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className={`w-full px-4 py-3 bg-slate-50 border rounded-xl text-slate-900 focus:outline-none focus:ring-2 resize-none ${
                  content.length > MAX_SMS_LENGTH
                    ? "border-red-300 focus:ring-red-500"
                    : "border-slate-200 focus:ring-emerald-500"
                }`}
                rows={4}
                placeholder="Write your SMS message here..."
                maxLength={MAX_SMS_LENGTH + 50}
              />
              {content.length > MAX_SMS_LENGTH && (
                <p className="text-sm text-red-600 mt-2">
                  Message exceeds {MAX_SMS_LENGTH} characters. It may be split into multiple SMS.
                </p>
              )}
            </div>

            {/* Target Audience */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Target Audience</h2>

              {/* Main Categories */}
              <p className="text-sm text-slate-500 mb-3">Select who should receive this SMS</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "all", label: "All Members", description: "Everyone in your gym", icon: Users },
                  { value: "new_members", label: "New Members", description: "Joined in last 30 days", icon: UserPlus },
                  { value: "super_active", label: "Super Active", description: "10+ check-ins this month", icon: Star },
                  { value: "regular", label: "Regular Members", description: "4-9 check-ins this month", icon: Users },
                  { value: "at_risk", label: "At Risk", description: "No check-in in 14+ days", icon: AlertTriangle },
                  { value: "inactive", label: "Inactive", description: "No check-in in 30+ days", icon: UserX },
                  { value: "expiring_soon", label: "Expiring Soon", description: "Membership ends in 14 days", icon: Clock },
                  { value: "birthday_this_month", label: "Birthday This Month", description: "Celebrate their day", icon: Gift },
                  { value: "tag", label: "Specific Tag", description: "Target by custom tag", icon: Tag },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTargetAudience(option.value)}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-colors text-left ${
                      targetAudience === option.value
                        ? "bg-emerald-50 border-emerald-500"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      targetAudience === option.value
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-slate-200 text-slate-500"
                    }`}>
                      <option.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${
                        targetAudience === option.value ? "text-emerald-700" : "text-slate-700"
                      }`}>{option.label}</p>
                      <p className="text-xs text-slate-500">{option.description}</p>
                    </div>
                  </button>
                ))}
              </div>
              {targetAudience === "tag" && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select Tag
                  </label>
                  <select
                    value={targetTagId}
                    onChange={(e) => setTargetTagId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">Choose a tag...</option>
                    {tags.map((tag) => (
                      <option key={tag.id} value={tag.id}>
                        {tag.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Schedule */}
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Schedule (Optional)</h2>
              <p className="text-sm text-slate-500 mb-3">
                Leave empty to send immediately, or set a date to schedule
              </p>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name || !content || content.length > MAX_SMS_LENGTH}
                className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
              >
                {saving ? "Saving..." : editingCampaign ? "Save Changes" : "Create Campaign"}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="SMS Campaigns" description="Create and manage SMS campaigns" />

      <div className="p-4 md:p-6 space-y-6">
        {/* Back button and Create */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/campaigns")}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Campaigns</span>
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Create SMS Campaign
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">{campaigns.length}</p>
                <p className="text-sm text-slate-500">Total Campaigns</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Send className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">
                  {campaigns.reduce((sum, c) => sum + c.sentCount, 0)}
                </p>
                <p className="text-sm text-slate-500">SMS Sent</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">
                  {campaigns.reduce((sum, c) => sum + c.deliveredCount, 0)}
                </p>
                <p className="text-sm text-slate-500">Delivered</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                <Users className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-3xl font-bold text-slate-900">
                  {campaigns.filter((c) => c.sentCount > 0).length > 0
                    ? (
                        campaigns.reduce((sum, c) => sum + c.deliveredCount, 0) /
                        campaigns.reduce((sum, c) => sum + c.sentCount, 0) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </p>
                <p className="text-sm text-slate-500">Delivery Rate</p>
              </div>
            </div>
          </div>
        </div>

        {/* Campaigns List */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p className="text-slate-500">No SMS campaigns yet</p>
            <button
              onClick={handleCreate}
              className="mt-4 text-emerald-600 hover:text-emerald-500 font-medium"
            >
              Create your first SMS campaign
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 border-b border-slate-100 bg-slate-50/50">
                <tr>
                  <th className="px-5 py-3 font-medium">Campaign</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Recipients</th>
                  <th className="px-5 py-3 font-medium">Delivered</th>
                  <th className="px-5 py-3 font-medium">Delivery Rate</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-900">{campaign.name}</p>
                      <p className="text-xs text-slate-500 truncate max-w-xs">
                        {campaign.content}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${
                          statusColors[campaign.status]
                        }`}
                      >
                        {campaign.status.charAt(0) + campaign.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {campaign.sentCount > 0 ? campaign.sentCount : campaign.recipientCount}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{campaign.deliveredCount}</td>
                    <td className="px-5 py-4">
                      <span
                        className={
                          Number(getDeliveryRate(campaign)) > 95
                            ? "text-emerald-600 font-medium"
                            : "text-slate-600"
                        }
                      >
                        {getDeliveryRate(campaign)}%
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-xs">
                      {campaign.sentAt
                        ? formatDate(campaign.sentAt)
                        : campaign.scheduledAt
                        ? `Scheduled: ${formatDate(campaign.scheduledAt)}`
                        : formatDate(campaign.createdAt)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1">
                        {campaign.status === "DRAFT" && (
                          <>
                            <button
                              onClick={() => handleSend(campaign.id)}
                              disabled={sendingId === campaign.id}
                              className="p-2 rounded-lg bg-emerald-100 text-emerald-600 hover:bg-emerald-200 transition-colors"
                              title="Send now"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(campaign)}
                              className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                          </>
                        )}
                        {deletingId === campaign.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(campaign.id)}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-500"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded hover:bg-slate-300"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingId(campaign.id)}
                            className="p-2 rounded-lg bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
