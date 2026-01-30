'use client';

import { useState, useCallback, useRef } from 'react';
import { Settings, GripVertical, Eye, EyeOff, RotateCcw, Save, X } from 'lucide-react';

interface DashboardWidget {
  id: string;
  visible: boolean;
  order: number;
}

const WIDGET_LABELS: Record<string, string> = {
  'health-score': 'Health Score',
  'today-overview': 'Today Overview',
  'key-stats': 'Key Stats',
  'revenue-summary': 'Revenue Summary',
  'revenue-trend': 'Revenue Trend Chart',
  'silo-cards': 'Revenue Silos (PT / Classes / Open Gym)',
  'per-class-revenue': 'Per-Class Revenue',
  'at-risk-members': 'At-Risk Members',
  'cash-flow': 'Cash Flow Projection',
  'alerts': 'Alerts',
  'today-classes': "Today's Classes",
  'traffic-patterns': 'Traffic Patterns',
  'opportunities': 'Top Opportunities',
  'recent-activity': 'Recent Activity',
};

const REVENUE_WIDGETS = new Set([
  'revenue-summary',
  'revenue-trend',
  'silo-cards',
  'per-class-revenue',
  'cash-flow',
]);

interface DashboardCustomizerProps {
  widgets: DashboardWidget[];
  onSave: (widgets: DashboardWidget[]) => Promise<void>;
  staffRole: string;
}

export default function DashboardCustomizer({
  widgets: initialWidgets,
  onSave,
  staffRole,
}: DashboardCustomizerProps) {
  const [open, setOpen] = useState(false);
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const [saving, setSaving] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragItemRef = useRef<number | null>(null);

  const isOwnerOrAdmin = ['OWNER', 'ADMIN'].includes(staffRole);

  const openModal = useCallback(() => {
    setWidgets(
      [...initialWidgets].sort((a, b) => a.order - b.order)
    );
    setOpen(true);
  }, [initialWidgets]);

  const closeModal = useCallback(() => {
    setOpen(false);
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  const toggleVisibility = useCallback((index: number) => {
    setWidgets((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], visible: !next[index].visible };
      return next;
    });
  }, []);

  const handleDragStart = useCallback((index: number) => {
    dragItemRef.current = index;
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback((targetIndex: number) => {
    const sourceIndex = dragItemRef.current;
    if (sourceIndex === null || sourceIndex === targetIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    setWidgets((prev) => {
      const next = [...prev];
      const [moved] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next.map((w, i) => ({ ...w, order: i }));
    });

    setDragIndex(null);
    setDragOverIndex(null);
    dragItemRef.current = null;
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
    dragItemRef.current = null;
  }, []);

  const resetToDefault = useCallback(() => {
    const defaultOrder = [
      'health-score', 'today-overview', 'key-stats', 'revenue-summary',
      'revenue-trend', 'silo-cards', 'per-class-revenue', 'at-risk-members',
      'cash-flow', 'alerts', 'today-classes', 'traffic-patterns',
      'opportunities', 'recent-activity',
    ];
    setWidgets(
      defaultOrder.map((id, order) => ({ id, visible: true, order }))
    );
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(widgets);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }, [widgets, onSave]);

  return (
    <>
      <button
        onClick={openModal}
        className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
      >
        <Settings className="h-4 w-4" />
        Customize Dashboard
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={closeModal}
          />

          {/* Modal */}
          <div className="relative w-full max-w-lg mx-4 bg-white rounded-xl shadow-2xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Customize Dashboard
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  Drag to reorder, toggle to show/hide widgets
                </p>
              </div>
              <button
                onClick={closeModal}
                className="rounded-md p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Widget list */}
            <div className="flex-1 overflow-y-auto px-6 py-3">
              <ul className="space-y-1">
                {widgets.map((widget, index) => {
                  const isRevenueWidget = REVENUE_WIDGETS.has(widget.id);
                  const isDisabled = isRevenueWidget && !isOwnerOrAdmin;
                  const label = WIDGET_LABELS[widget.id] || widget.id;

                  return (
                    <li
                      key={widget.id}
                      draggable={!isDisabled}
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={() => handleDrop(index)}
                      onDragEnd={handleDragEnd}
                      className={`
                        flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all
                        ${dragIndex === index ? 'opacity-50 bg-gray-100' : ''}
                        ${dragOverIndex === index && dragIndex !== index ? 'border-t-2 border-indigo-500' : 'border-t-2 border-transparent'}
                        ${isDisabled ? 'opacity-40' : 'hover:bg-gray-50'}
                        ${!widget.visible ? 'text-gray-400' : 'text-gray-900'}
                      `}
                    >
                      <div
                        className={`cursor-grab active:cursor-grabbing ${isDisabled ? 'cursor-not-allowed' : ''}`}
                      >
                        <GripVertical className="h-4 w-4 text-gray-400" />
                      </div>

                      <span className="flex-1 text-sm font-medium select-none">
                        {label}
                        {isRevenueWidget && (
                          <span className="ml-2 text-xs text-gray-400 font-normal">
                            Owner/Admin
                          </span>
                        )}
                      </span>

                      <button
                        onClick={() => !isDisabled && toggleVisibility(index)}
                        disabled={isDisabled}
                        className={`
                          rounded-md p-1.5 transition-colors
                          ${isDisabled
                            ? 'cursor-not-allowed text-gray-300'
                            : widget.visible
                              ? 'text-indigo-600 hover:bg-indigo-50'
                              : 'text-gray-400 hover:bg-gray-100'
                          }
                        `}
                        title={widget.visible ? 'Hide widget' : 'Show widget'}
                      >
                        {widget.visible ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={resetToDefault}
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset to Default
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={closeModal}
                  className="rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Save className="h-3.5 w-3.5" />
                  {saving ? 'Saving...' : 'Save Layout'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
