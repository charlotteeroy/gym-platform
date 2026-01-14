'use client';

import { Activity, Calendar, Tag } from 'lucide-react';

interface ActivityItem {
  type: 'check_in' | 'booking' | 'tag_added';
  timestamp: Date;
  description: string;
}

interface MemberTimelineProps {
  activities: ActivityItem[];
}

export function MemberTimeline({ activities }: MemberTimelineProps) {
  const getIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'check_in':
        return <Activity className="w-4 h-4 text-green-600" />;
      case 'booking':
        return <Calendar className="w-4 h-4 text-indigo-600" />;
      case 'tag_added':
        return <Tag className="w-4 h-4 text-amber-600" />;
      default:
        return <Activity className="w-4 h-4 text-slate-400" />;
    }
  };

  const getTypeColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'check_in':
        return 'bg-green-50';
      case 'booking':
        return 'bg-indigo-50';
      case 'tag_added':
        return 'bg-amber-50';
      default:
        return 'bg-slate-50';
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-900 mb-4">Recent Activity</h3>
        <p className="text-sm text-slate-500">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-900 mb-4">Recent Activity</h3>

      <div className="space-y-3">
        {activities.map((activity, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className={`p-1.5 rounded-full ${getTypeColor(activity.type)}`}>
              {getIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700">{activity.description}</p>
              <p className="text-xs text-slate-400">{formatTime(activity.timestamp)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
