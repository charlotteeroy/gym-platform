"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Plus,
  Play,
  Pause,
  Pencil,
  Trash2,
  Mail,
  MessageSquare,
  Clock,
  Tag,
  UserPlus,
  CalendarHeart,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { Header } from "@/components/layout/header";

type FlowTriggerType =
  | "NO_CHECKIN"
  | "MEMBERSHIP_EXPIRING"
  | "NEW_SIGNUP"
  | "BIRTHDAY"
  | "CUSTOM";

type FlowActionType =
  | "SEND_EMAIL"
  | "SEND_SMS"
  | "WAIT"
  | "ADD_TAG"
  | "REMOVE_TAG";

type FlowChannel = "EMAIL" | "SMS" | "PUSH";

interface FlowStep {
  id: string;
  order: number;
  actionType: FlowActionType;
  channel?: FlowChannel | null;
  subject?: string | null;
  content?: string | null;
  waitDays?: number | null;
  tagId?: string | null;
}

interface AutomatedFlow {
  id: string;
  name: string;
  description?: string | null;
  triggerType: FlowTriggerType;
  triggerValue?: number | null;
  isActive: boolean;
  isTemplate: boolean;
  steps: FlowStep[];
  createdAt: string;
  updatedAt: string;
}

const triggerIcons: Record<FlowTriggerType, React.ReactNode> = {
  NO_CHECKIN: <AlertCircle className="h-5 w-5" />,
  MEMBERSHIP_EXPIRING: <RefreshCw className="h-5 w-5" />,
  NEW_SIGNUP: <UserPlus className="h-5 w-5" />,
  BIRTHDAY: <CalendarHeart className="h-5 w-5" />,
  CUSTOM: <Zap className="h-5 w-5" />,
};

const triggerLabels: Record<FlowTriggerType, string> = {
  NO_CHECKIN: "No Check-in",
  MEMBERSHIP_EXPIRING: "Membership Expiring",
  NEW_SIGNUP: "New Signup",
  BIRTHDAY: "Birthday",
  CUSTOM: "Custom Trigger",
};

const triggerColors: Record<FlowTriggerType, string> = {
  NO_CHECKIN: "bg-red-100 text-red-600",
  MEMBERSHIP_EXPIRING: "bg-amber-100 text-amber-600",
  NEW_SIGNUP: "bg-emerald-100 text-emerald-600",
  BIRTHDAY: "bg-pink-100 text-pink-600",
  CUSTOM: "bg-indigo-100 text-indigo-600",
};

export default function AutomatedFlowsPage() {
  const router = useRouter();
  const [flows, setFlows] = useState<AutomatedFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editingFlow, setEditingFlow] = useState<AutomatedFlow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchFlows();
  }, []);

  const fetchFlows = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/flows");
      if (!response.ok) throw new Error("Failed to fetch flows");
      const data = await response.json();

      if (data.length === 0) {
        await seedTemplates();
        return;
      }

      setFlows(data);
    } catch (err) {
      setError("Failed to load automated flows");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const seedTemplates = async () => {
    try {
      const response = await fetch("/api/flows/seed-templates", {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to seed templates");
      const flowsResponse = await fetch("/api/flows");
      const data = await flowsResponse.json();
      setFlows(data);
    } catch (err) {
      setError("Failed to create default templates");
      console.error(err);
    }
  };

  const toggleFlowActive = async (flow: AutomatedFlow) => {
    try {
      const response = await fetch(`/api/flows/${flow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !flow.isActive }),
      });
      if (!response.ok) throw new Error("Failed to update flow");
      const updated = await response.json();
      setFlows(flows.map((f) => (f.id === updated.id ? updated : f)));
    } catch (err) {
      console.error(err);
    }
  };

  const deleteFlow = async (id: string) => {
    try {
      const response = await fetch(`/api/flows/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete flow");
      setFlows(flows.filter((f) => f.id !== id));
      setDeletingId(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEdit = (flow: AutomatedFlow) => {
    setEditingFlow(flow);
    setShowEditor(true);
  };

  const handleCreate = () => {
    setEditingFlow(null);
    setShowEditor(true);
  };

  const getStepSummary = (steps: FlowStep[]) => {
    const emailCount = steps.filter((s) => s.actionType === "SEND_EMAIL").length;
    const smsCount = steps.filter((s) => s.actionType === "SEND_SMS").length;
    const waitSteps = steps.filter((s) => s.actionType === "WAIT");
    const totalWaitDays = waitSteps.reduce((sum, s) => sum + (s.waitDays || 0), 0);

    const parts = [];
    if (emailCount > 0) parts.push(`${emailCount} email${emailCount > 1 ? "s" : ""}`);
    if (smsCount > 0) parts.push(`${smsCount} SMS`);
    if (totalWaitDays > 0) parts.push(`${totalWaitDays} days wait`);

    return parts.join(" + ") || "No steps";
  };

  if (showEditor) {
    return (
      <FlowEditor
        flow={editingFlow}
        onSave={async (savedFlow) => {
          if (editingFlow) {
            setFlows(flows.map((f) => (f.id === savedFlow.id ? savedFlow : f)));
          } else {
            setFlows([savedFlow, ...flows]);
          }
          setShowEditor(false);
          setEditingFlow(null);
        }}
        onCancel={() => {
          setShowEditor(false);
          setEditingFlow(null);
        }}
      />
    );
  }

  return (
    <>
      <Header title="Automated Flows" description="Set up automated messages that trigger based on member behavior" />

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
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors shadow-sm"
          >
            <Plus className="h-4 w-4" />
            Create Flow
          </button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600">
            {error}
          </div>
        )}

        {/* Flows Grid */}
        {!loading && !error && (
          <div className="grid gap-4">
            {flows.map((flow) => (
              <div
                key={flow.id}
                className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-xl ${
                        flow.isActive
                          ? "bg-emerald-100 text-emerald-600"
                          : triggerColors[flow.triggerType]
                      }`}
                    >
                      {triggerIcons[flow.triggerType]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900">{flow.name}</h3>
                        {flow.isTemplate && (
                          <span className="px-2 py-0.5 text-xs bg-indigo-100 text-indigo-600 rounded-lg font-medium">
                            Template
                          </span>
                        )}
                        {flow.isActive && (
                          <span className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-600 rounded-lg font-medium">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 text-sm mt-1">{flow.description}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {triggerLabels[flow.triggerType]}
                          {flow.triggerValue && ` (${flow.triggerValue} days)`}
                        </span>
                        <span className="text-xs text-slate-400">
                          {getStepSummary(flow.steps)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Channel badges */}
                    <div className="flex items-center gap-1 mr-2">
                      {flow.steps.some((s) => s.channel === "EMAIL") && (
                        <span className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                          <Mail className="h-3.5 w-3.5" />
                        </span>
                      )}
                      {flow.steps.some((s) => s.channel === "SMS") && (
                        <span className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>

                    {/* Toggle Active */}
                    <button
                      onClick={() => toggleFlowActive(flow)}
                      className={`p-2 rounded-xl transition-colors ${
                        flow.isActive
                          ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                      title={flow.isActive ? "Pause flow" : "Activate flow"}
                    >
                      {flow.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleEdit(flow)}
                      className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                      title="Edit flow"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>

                    {/* Delete */}
                    {deletingId === flow.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => deleteFlow(flow.id)}
                          className="px-3 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-500"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="px-3 py-1.5 text-xs bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(flow.id)}
                        className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-red-100 hover:text-red-600 transition-colors"
                        title="Delete flow"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Steps preview */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 overflow-x-auto pb-2">
                    {flow.steps.map((step, index) => (
                      <div key={step.id} className="flex items-center gap-2">
                        <div
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                            step.actionType === "WAIT"
                              ? "bg-amber-100 text-amber-700"
                              : step.actionType === "SEND_EMAIL"
                              ? "bg-blue-100 text-blue-700"
                              : step.actionType === "SEND_SMS"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {step.actionType === "WAIT" && <Clock className="h-3.5 w-3.5" />}
                          {step.actionType === "SEND_EMAIL" && <Mail className="h-3.5 w-3.5" />}
                          {step.actionType === "SEND_SMS" && <MessageSquare className="h-3.5 w-3.5" />}
                          {(step.actionType === "ADD_TAG" || step.actionType === "REMOVE_TAG") && <Tag className="h-3.5 w-3.5" />}
                          <span>
                            {step.actionType === "WAIT"
                              ? `Wait ${step.waitDays} days`
                              : step.actionType === "SEND_EMAIL"
                              ? "Email"
                              : step.actionType === "SEND_SMS"
                              ? "SMS"
                              : step.actionType === "ADD_TAG"
                              ? "Add Tag"
                              : "Remove Tag"}
                          </span>
                        </div>
                        {index < flow.steps.length - 1 && (
                          <ChevronRight className="h-4 w-4 text-slate-300" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {flows.length === 0 && !loading && (
              <div className="text-center py-12 bg-white rounded-2xl shadow-sm">
                <Zap className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                <p className="text-slate-500">No automated flows yet</p>
                <button
                  onClick={handleCreate}
                  className="mt-4 text-indigo-600 hover:text-indigo-500 font-medium"
                >
                  Create your first flow
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// Flow Editor Component
interface FlowEditorProps {
  flow: AutomatedFlow | null;
  onSave: (flow: AutomatedFlow) => void;
  onCancel: () => void;
}

function FlowEditor({ flow, onSave, onCancel }: FlowEditorProps) {
  const [name, setName] = useState(flow?.name || "");
  const [description, setDescription] = useState(flow?.description || "");
  const [triggerType, setTriggerType] = useState<FlowTriggerType>(
    flow?.triggerType || "NO_CHECKIN"
  );
  const [triggerValue, setTriggerValue] = useState<number | null>(
    flow?.triggerValue || 14
  );
  const [steps, setSteps] = useState<Partial<FlowStep>[]>(
    flow?.steps || [
      {
        order: 0,
        actionType: "SEND_EMAIL",
        channel: "EMAIL",
        subject: "",
        content: "",
      },
    ]
  );
  const [saving, setSaving] = useState(false);

  const addStep = (actionType: FlowActionType) => {
    const newStep: Partial<FlowStep> = {
      order: steps.length,
      actionType,
      channel: actionType === "SEND_EMAIL" ? "EMAIL" : actionType === "SEND_SMS" ? "SMS" : null,
      subject: actionType === "SEND_EMAIL" ? "" : null,
      content: actionType === "SEND_EMAIL" || actionType === "SEND_SMS" ? "" : null,
      waitDays: actionType === "WAIT" ? 1 : null,
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (index: number, updates: Partial<FlowStep>) => {
    const newSteps = [...steps];
    newSteps[index] = { ...newSteps[index], ...updates };
    setSteps(newSteps);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const url = flow ? `/api/flows/${flow.id}` : "/api/flows";
      const method = flow ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          triggerType,
          triggerValue:
            triggerType === "NO_CHECKIN" || triggerType === "MEMBERSHIP_EXPIRING"
              ? triggerValue
              : null,
          steps: steps.map((s) => ({
            actionType: s.actionType,
            channel: s.channel,
            subject: s.subject,
            content: s.content,
            waitDays: s.waitDays,
            tagId: s.tagId,
          })),
        }),
      });

      if (!response.ok) throw new Error("Failed to save flow");
      const savedFlow = await response.json();
      onSave(savedFlow);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const triggerNeedsValue = triggerType === "NO_CHECKIN" || triggerType === "MEMBERSHIP_EXPIRING";

  return (
    <>
      <Header title={flow ? "Edit Flow" : "Create New Flow"} description="Configure your automated flow" />

      <div className="p-4 md:p-6">
        <button
          onClick={onCancel}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-700 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Flows</span>
        </button>

        <div className="max-w-3xl space-y-6">
          {/* Flow Details */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Flow Details</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Win-Back Inactive Members"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  rows={2}
                  placeholder="Describe what this flow does..."
                />
              </div>
            </div>
          </div>

          {/* Trigger */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Trigger</h2>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(triggerLabels) as FlowTriggerType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setTriggerType(type)}
                  className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-colors ${
                    triggerType === type
                      ? "bg-indigo-50 border-indigo-500 text-indigo-700"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <span className={`p-2 rounded-lg ${triggerColors[type]}`}>
                    {triggerIcons[type]}
                  </span>
                  <span className="text-sm font-medium">{triggerLabels[type]}</span>
                </button>
              ))}
            </div>
            {triggerNeedsValue && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {triggerType === "NO_CHECKIN"
                    ? "Days without check-in"
                    : "Days before expiration"}
                </label>
                <input
                  type="number"
                  value={triggerValue || ""}
                  onChange={(e) => setTriggerValue(parseInt(e.target.value) || null)}
                  className="w-32 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  min={1}
                />
              </div>
            )}
          </div>

          {/* Steps */}
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Steps</h2>
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 flex items-center justify-center bg-indigo-100 text-indigo-600 rounded-full text-xs font-semibold">
                        {index + 1}
                      </span>
                      <span className="text-sm font-semibold text-slate-900">
                        {step.actionType === "SEND_EMAIL"
                          ? "Send Email"
                          : step.actionType === "SEND_SMS"
                          ? "Send SMS"
                          : step.actionType === "WAIT"
                          ? "Wait"
                          : step.actionType === "ADD_TAG"
                          ? "Add Tag"
                          : "Remove Tag"}
                      </span>
                    </div>
                    <button
                      onClick={() => removeStep(index)}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {step.actionType === "SEND_EMAIL" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Subject</label>
                        <input
                          type="text"
                          value={step.subject || ""}
                          onChange={(e) => updateStep(index, { subject: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Email subject..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">
                          Content (use {"{{first_name}}"}, {"{{gym_name}}"} for personalization)
                        </label>
                        <textarea
                          value={step.content || ""}
                          onChange={(e) => updateStep(index, { content: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                          rows={4}
                          placeholder="Email content..."
                        />
                      </div>
                    </div>
                  )}

                  {step.actionType === "SEND_SMS" && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Message (use {"{{first_name}}"}, {"{{gym_name}}"} for personalization)
                      </label>
                      <textarea
                        value={step.content || ""}
                        onChange={(e) => updateStep(index, { content: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                        rows={2}
                        placeholder="SMS message..."
                      />
                    </div>
                  )}

                  {step.actionType === "WAIT" && (
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-600">Wait for</label>
                      <input
                        type="number"
                        value={step.waitDays || ""}
                        onChange={(e) =>
                          updateStep(index, { waitDays: parseInt(e.target.value) || null })
                        }
                        className="w-20 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        min={1}
                      />
                      <span className="text-sm text-slate-600">days</span>
                    </div>
                  )}
                </div>
              ))}

              {/* Add Step Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={() => addStep("SEND_EMAIL")}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-colors text-sm font-medium"
                >
                  <Mail className="h-4 w-4" />
                  Add Email
                </button>
                <button
                  onClick={() => addStep("SEND_SMS")}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl hover:bg-emerald-200 transition-colors text-sm font-medium"
                >
                  <MessageSquare className="h-4 w-4" />
                  Add SMS
                </button>
                <button
                  onClick={() => addStep("WAIT")}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-xl hover:bg-amber-200 transition-colors text-sm font-medium"
                >
                  <Clock className="h-4 w-4" />
                  Add Wait
                </button>
                <button
                  onClick={() => addStep("ADD_TAG")}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors text-sm font-medium"
                >
                  <Tag className="h-4 w-4" />
                  Add Tag
                </button>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !name || steps.length === 0}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm"
            >
              {saving ? "Saving..." : flow ? "Save Changes" : "Create Flow"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
