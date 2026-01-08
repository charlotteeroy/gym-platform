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
    declining: <TrendingDown className="h-4 w-4 text-red-500" />,
    stable: <Minus className="h-4 w-4 text-gray-500" />,
    improving: <TrendingUp className="h-4 w-4 text-green-500" />,
  };

  const trendLabels = {
    declining: 'Declining',
    stable: 'Stable',
    improving: 'Improving',
  };

  const scoreColor = score >= 75 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-600';

  return (
    <Card className={`border-2 ${statusColors[status]}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            <CardTitle className="text-lg">Gym Health</CardTitle>
          </div>
          <div className="flex items-center gap-1 text-sm">
            {trendIcons[trend]}
            <span className="text-muted-foreground">{trendLabels[trend]}</span>
          </div>
        </div>
        <CardDescription>{statusLabels[status]}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className={`text-5xl font-bold ${scoreColor}`}>{score}</span>
            <span className="text-muted-foreground text-lg">/100</span>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Retention</span>
              <span className="font-medium">{factors.memberRetention}%</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Subscriptions</span>
              <span className="font-medium">{factors.subscriptionHealth}%</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Engagement</span>
              <span className="font-medium">{factors.classEngagement}%</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Revenue</span>
              <span className="font-medium">{factors.revenueStability}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
