'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

interface HealthScoreProps {
  score: number;
  status: 'critical' | 'warning' | 'healthy';
  trend: 'declining' | 'stable' | 'improving';
  factors: {
    memberRetention: number;
    subscriptionHealth: number;
    classEngagement: number;
    revenueStability: number;
  };
}

export function HealthScore({ score, status, trend, factors }: HealthScoreProps) {
  const statusColors = {
    critical: 'text-red-600 bg-red-50 border-red-200',
    warning: 'text-amber-600 bg-amber-50 border-amber-200',
    healthy: 'text-green-600 bg-green-50 border-green-200',
  };

  const statusLabels = {
    critical: 'Needs Attention',
    warning: 'Monitor Closely',
    healthy: 'Healthy',
  };

  const trendIcons = {
    declining: <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />,
    stable: <Minus className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500" />,
    improving: <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />,
  };

  const trendLabels = {
    declining: 'Declining',
    stable: 'Stable',
    improving: 'Improving',
  };

  const scoreColor = score >= 75 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-600';

  return (
    <Card className={`border-2 ${statusColors[status]}`}>
      <CardHeader className="pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <Activity className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <CardTitle className="text-base sm:text-lg truncate">Gym Health</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-xs sm:text-sm flex-shrink-0">
            {trendIcons[trend]}
            <span className="text-muted-foreground hidden xs:inline">{trendLabels[trend]}</span>
          </div>
        </div>
        <CardDescription className="text-xs sm:text-sm">{statusLabels[status]}</CardDescription>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-8">
          <div className="flex items-baseline gap-1 sm:gap-2">
            <span className={`text-3xl sm:text-4xl md:text-5xl font-bold ${scoreColor}`}>{score}</span>
            <span className="text-muted-foreground text-sm sm:text-lg">/100</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-xs sm:text-sm flex-1">
            <div className="flex flex-col">
              <span className="text-muted-foreground">Retention</span>
              <span className="font-medium text-sm sm:text-base">{factors.memberRetention}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Subscriptions</span>
              <span className="font-medium text-sm sm:text-base">{factors.subscriptionHealth}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Engagement</span>
              <span className="font-medium text-sm sm:text-base">{factors.classEngagement}%</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Revenue</span>
              <span className="font-medium text-sm sm:text-base">{factors.revenueStability}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
