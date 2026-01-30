'use client';

import { useState, useEffect } from 'react';

interface RecentActivityWidgetProps {
  gymId: string;
}

interface ActivityItem {
  id: string;
  memberFirstName: string;
  memberLastName: string;
  className: string;
  createdAt: string;
}

const formatTimeAgo = (dateStr: string): string => {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
};

export default function RecentActivityWidget({ gymId }: RecentActivityWidgetProps) {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/dashboard/recent-activity')
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success) setItems(json.data);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [gymId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-slate-800 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h3 className="font-semibold text-slate-800 mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm">
                  <span className="font-medium text-slate-900">{item.memberFirstName}</span>
                  <span className="text-slate-500"> booked </span>
                  <span className="font-medium text-slate-900">{item.className}</span>
                </p>
              </div>
            </div>
            <span className="text-xs text-slate-400">{formatTimeAgo(item.createdAt)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
