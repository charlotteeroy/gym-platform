'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserX, Clock, Calendar, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface AtRiskMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  riskScore: number;
  riskFactors: string[];
  lastCheckIn: Date | string | null;
  lastClassBooking: Date | string | null;
  daysSinceLastActivity: number;
}

interface AtRiskMembersProps {
  members: AtRiskMember[];
}

function formatDaysAgo(days: number): string {
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function getRiskColor(score: number): string {
  if (score >= 70) return 'bg-red-500';
  if (score >= 50) return 'bg-amber-500';
  return 'bg-yellow-500';
}

function getRiskLabel(score: number): string {
  if (score >= 70) return 'High Risk';
  if (score >= 50) return 'Medium Risk';
  return 'At Risk';
}

export function AtRiskMembers({ members }: AtRiskMembersProps) {
  if (members.length === 0) {
    return (
      <Card>
        <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
          <CardTitle className="text-base sm:text-lg flex items-center gap-2">
            <UserX className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span>At-Risk Members</span>
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">No members showing warning signs</CardDescription>
        </CardHeader>
        <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
          <p className="text-xs sm:text-sm text-muted-foreground">
            All your members are engaged and active. Great job!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <UserX className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 flex-shrink-0" />
              <span>At-Risk Members</span>
              <span className="ml-1 sm:ml-2 text-xs sm:text-sm font-normal text-muted-foreground">
                ({members.length})
              </span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">Members showing early warning signs of churn</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild className="self-start sm:self-auto">
            <Link href="/members?filter=at-risk">View All</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
        <div className="space-y-2 sm:space-y-3">
          {members.slice(0, 5).map((member) => (
            <Link
              key={member.id}
              href={`/members/${member.id}`}
              className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              {/* Risk indicator */}
              <div className="flex flex-col items-center gap-0.5 sm:gap-1 flex-shrink-0">
                <div
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full ${getRiskColor(member.riskScore)} flex items-center justify-center text-white font-bold text-xs sm:text-sm`}
                >
                  {member.riskScore}
                </div>
                <span className="text-[8px] sm:text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                  {getRiskLabel(member.riskScore)}
                </span>
              </div>

              {/* Member info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm sm:text-base truncate">
                  {member.firstName} {member.lastName}
                </p>
                <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{formatDaysAgo(member.daysSinceLastActivity)}</span>
                  </span>
                  {member.lastClassBooking && (
                    <span className="hidden sm:flex items-center gap-1">
                      <Calendar className="h-3 w-3 flex-shrink-0" />
                      <span>Last class: {formatDaysAgo(
                        Math.floor(
                          (Date.now() - new Date(member.lastClassBooking).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      )}</span>
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-1 sm:mt-2">
                  {member.riskFactors.slice(0, 2).map((factor, i) => (
                    <span
                      key={i}
                      className="text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 bg-red-100 text-red-700 rounded-full truncate max-w-[100px] sm:max-w-none"
                    >
                      {factor}
                    </span>
                  ))}
                </div>
              </div>

              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </Link>
          ))}
        </div>

        {members.length > 5 && (
          <div className="mt-3 sm:mt-4 text-center">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/members?filter=at-risk">
                View {members.length - 5} more at-risk members
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
