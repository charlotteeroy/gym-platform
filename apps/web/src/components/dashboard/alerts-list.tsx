'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, AlertCircle, Info, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  type: string;
  title: string;
  description: string;
  metric?: string;
  actionUrl?: string;
}

interface AlertsListProps {
  alerts: Alert[];
}

export function AlertsList({ alerts }: AlertsListProps) {
  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
            <span>No Active Alerts</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">Your gym is operating smoothly</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const severityStyles = {
    critical: {
      bg: 'bg-red-50 border-red-200 hover:bg-red-100',
      icon: <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />,
      badge: 'bg-red-100 text-red-700',
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
      icon: <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />,
      badge: 'bg-amber-100 text-amber-700',
    },
    info: {
      bg: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
      icon: <Info className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />,
      badge: 'bg-blue-100 text-blue-700',
    },
  };

  return (
    <Card>
      <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 flex-shrink-0" />
          <span>Active Alerts</span>
          <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-normal text-muted-foreground">
            ({alerts.length})
          </span>
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">Issues requiring your attention</CardDescription>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6 space-y-2 sm:space-y-3">
        {alerts.map((alert) => {
          const styles = severityStyles[alert.severity];
          const content = (
            <div
              className={`flex items-start gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg border transition-colors ${styles.bg}`}
            >
              <div className="flex-shrink-0 mt-0.5">{styles.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                  <h4 className="font-semibold text-sm sm:text-base text-gray-900 truncate">{alert.title}</h4>
                  {alert.metric && (
                    <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-medium ${styles.badge} self-start sm:self-auto`}>
                      {alert.metric}
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">{alert.description}</p>
              </div>
              {alert.actionUrl && (
                <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0 hidden sm:block" />
              )}
            </div>
          );

          if (alert.actionUrl) {
            return (
              <Link key={alert.id} href={alert.actionUrl} className="block">
                {content}
              </Link>
            );
          }

          return <div key={alert.id}>{content}</div>;
        })}
      </CardContent>
    </Card>
  );
}
