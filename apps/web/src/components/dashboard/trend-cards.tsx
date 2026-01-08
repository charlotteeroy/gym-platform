'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Users, CreditCard, Calendar, DoorOpen, UserMinus } from 'lucide-react';

interface TrendData {
  label: string;
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  isPositive: boolean;
}

interface TrendCardsProps {
  trends: TrendData[];
}

const iconMap: Record<string, React.ReactNode> = {
  'Active Members': <Users className="h-4 w-4" />,
  'Subscriptions': <CreditCard className="h-4 w-4" />,
  'Class Bookings': <Calendar className="h-4 w-4" />,
  'Gym Visits': <DoorOpen className="h-4 w-4" />,
  'Cancellations': <UserMinus className="h-4 w-4" />,
};

export function TrendCards({ trends }: TrendCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {trends.map((trend) => {
        const TrendIcon = trend.trend === 'up'
          ? TrendingUp
          : trend.trend === 'down'
          ? TrendingDown
          : Minus;

        const trendColor = trend.isPositive
          ? 'text-green-600'
          : trend.trend === 'stable'
          ? 'text-gray-500'
          : 'text-red-600';

        const bgColor = trend.isPositive
          ? 'bg-green-50'
          : trend.trend === 'stable'
          ? 'bg-gray-50'
          : 'bg-red-50';

        return (
          <Card key={trend.label} className="relative overflow-hidden">
            <div className={`absolute inset-0 ${bgColor} opacity-50`} />
            <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {trend.label}
              </CardTitle>
              <div className="text-muted-foreground">
                {iconMap[trend.label] || <TrendingUp className="h-4 w-4" />}
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="text-2xl font-bold">{trend.current.toLocaleString()}</div>
              <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
                <TrendIcon className="h-3 w-3" />
                <span>
                  {trend.change >= 0 ? '+' : ''}{trend.change.toLocaleString()}
                  {trend.changePercent !== 0 && ` (${trend.changePercent >= 0 ? '+' : ''}${trend.changePercent}%)`}
                </span>
                <span className="text-muted-foreground ml-1">vs last month</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
