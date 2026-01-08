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
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <UserX className="h-5 w-5" />
            At-Risk Members
          </CardTitle>
          <CardDescription>No members showing warning signs</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            All your members are engaged and active. Great job!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <UserX className="h-5 w-5 text-red-600" />
              At-Risk Members
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({members.length})
              </span>
            </CardTitle>
            <CardDescription>Members showing early warning signs of churn</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/members?filter=at-risk">View All</Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {members.slice(0, 5).map((member) => (
            <Link
              key={member.id}
              href={`/members/${member.id}`}
              className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              {/* Risk indicator */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-10 h-10 rounded-full ${getRiskColor(member.riskScore)} flex items-center justify-center text-white font-bold text-sm`}
                >
                  {member.riskScore}
                </div>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {getRiskLabel(member.riskScore)}
                </span>
              </div>

              {/* Member info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {member.firstName} {member.lastName}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDaysAgo(member.daysSinceLastActivity)}
                  </span>
                  {member.lastClassBooking && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Last class: {formatDaysAgo(
                        Math.floor(
                          (Date.now() - new Date(member.lastClassBooking).getTime()) /
                            (1000 * 60 * 60 * 24)
                        )
                      )}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {member.riskFactors.slice(0, 2).map((factor, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full"
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
          <div className="mt-4 text-center">
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
