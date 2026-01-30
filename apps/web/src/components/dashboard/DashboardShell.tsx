'use client';

import { useState, useCallback, useMemo } from 'react';
import { TopOpportunities } from '@/components/dashboard/opportunities-widget';
import {
  HealthScoreWidget,
  TodayOverviewWidget,
  KeyStatsWidget,
  RevenueSummaryWidget,
  AtRiskMembersWidget,
  ExpiringSubscriptionsWidget,
  AlertsWidget,
  TodayClassesWidget,
  TrafficPatternsWidget,
  RecentActivityWidget,
  RevenueTrendChart,
  SiloCardsWidget,
  PerClassRevenueTable,
  EnhancedAtRiskWidget,
  CashFlowWidget,
} from '@/components/dashboard/widgets';
import DashboardCustomizer from '@/components/dashboard/DashboardCustomizer';
import type { GymHealthScore } from '@gym/core';

interface WidgetLayout {
  id: string;
  visible: boolean;
  order: number;
}

interface SerializedAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  type: string;
  title: string;
  description: string;
  metric?: string;
  actionUrl?: string;
  createdAt: string;
}

const REVENUE_WIDGET_IDS = new Set([
  'revenue-summary',
  'revenue-trend',
  'silo-cards',
  'per-class-revenue',
  'cash-flow',
]);

interface DashboardShellProps {
  gymId: string;
  staffRole: string;
  initialLayout: WidgetLayout[];
  health: GymHealthScore;
  alerts: SerializedAlert[];
  atRiskMembers: {
    id: string;
    firstName: string;
    lastName: string;
    daysSinceLastActivity: number;
  }[];
  stats: {
    totalMembers: number;
    activeMembers: number;
    newThisMonth: number;
    checkInsToday: number;
    classesToday: number;
  };
  revenue: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    weekTrend: number;
    monthTrend: number;
    failedPayments: { id: string; amount: number; member?: { firstName: string; lastName: string } | null }[];
    failedTotal: number;
  } | null;
  expiringSubscriptions: {
    id: string;
    member: { id: string; firstName: string; lastName: string };
    plan: { name: string };
    currentPeriodEnd: string;
  }[];
  todaysClasses: {
    id: string;
    startTime: string;
    class: {
      name: string;
      capacity: number | null;
      instructor: { firstName: string; lastName: string } | null;
    };
    _count: { bookings: number };
  }[];
  totalSpotsBooked: number;
  totalCapacity: number;
  predictedTraffic: number;
  todayName: string;
  todaysPeakHours: { hour: number; label: string; count: number; historicalAvg: number }[];
  topHours: { hour: number; label: string; count: number; percentage: number }[];
  topDays: { day: string; count: number; percentage: number }[];
  totalVisits: number;
  lastWeekStats?: {
    classesLastWeek: number;
    checkInsLastWeek: number;
    spotsBookedLastWeek: number;
    predictedTrafficLastWeek: number;
  };
}

export default function DashboardShell({
  gymId,
  staffRole,
  initialLayout,
  health,
  alerts,
  atRiskMembers,
  stats,
  revenue,
  expiringSubscriptions,
  todaysClasses,
  totalSpotsBooked,
  totalCapacity,
  predictedTraffic,
  todayName,
  todaysPeakHours,
  topHours,
  topDays,
  totalVisits,
  lastWeekStats,
}: DashboardShellProps) {
  const [layout, setLayout] = useState<WidgetLayout[]>(initialLayout);
  const isOwnerOrAdmin = ['OWNER', 'ADMIN'].includes(staffRole);

  const handleSaveLayout = useCallback(async (widgets: WidgetLayout[]) => {
    const res = await fetch('/api/dashboard/layout', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ widgets }),
    });
    if (res.ok) {
      setLayout(widgets);
    }
  }, []);

  const sortedWidgets = useMemo(
    () => [...layout].sort((a, b) => a.order - b.order),
    [layout]
  );

  const renderWidget = (widgetId: string) => {
    // Skip revenue widgets for non-owner/admin
    if (REVENUE_WIDGET_IDS.has(widgetId) && !isOwnerOrAdmin) return null;

    switch (widgetId) {
      case 'health-score':
        return <HealthScoreWidget health={health} />;
      case 'today-overview':
        return (
          <TodayOverviewWidget
            todayName={todayName}
            stats={stats}
            totalSpotsBooked={totalSpotsBooked}
            totalCapacity={totalCapacity}
            predictedTraffic={predictedTraffic}
            todaysPeakHours={todaysPeakHours}
            lastWeekStats={lastWeekStats}
          />
        );
      case 'key-stats':
        return <KeyStatsWidget stats={stats} />;
      case 'revenue-summary':
        return revenue ? <RevenueSummaryWidget revenue={revenue} gymId={gymId} /> : null;
      case 'revenue-trend':
        return <RevenueTrendChart gymId={gymId} />;
      case 'silo-cards':
        return <SiloCardsWidget gymId={gymId} />;
      case 'per-class-revenue':
        return <PerClassRevenueTable gymId={gymId} />;
      case 'at-risk-members':
        return (
          <div className="space-y-4">
            <EnhancedAtRiskWidget gymId={gymId} />
            <ExpiringSubscriptionsWidget expiringSubscriptions={expiringSubscriptions} />
          </div>
        );
      case 'cash-flow':
        return <CashFlowWidget gymId={gymId} />;
      case 'alerts':
        return <AlertsWidget alerts={alerts} />;
      case 'today-classes':
        return <TodayClassesWidget todaysClasses={todaysClasses} />;
      case 'traffic-patterns':
        return (
          <TrafficPatternsWidget
            topHours={topHours}
            topDays={topDays}
            totalVisits={totalVisits}
          />
        );
      case 'opportunities':
        return <TopOpportunities gymId={gymId} />;
      case 'recent-activity':
        return <RecentActivityWidget gymId={gymId} />;
      default:
        return null;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex justify-end">
        <DashboardCustomizer
          widgets={layout}
          onSave={handleSaveLayout}
          staffRole={staffRole}
        />
      </div>

      {sortedWidgets.map((widget) => {
        if (!widget.visible) return null;
        const rendered = renderWidget(widget.id);
        if (!rendered) return null;
        return (
          <div key={widget.id}>
            {rendered}
          </div>
        );
      })}
    </div>
  );
}
