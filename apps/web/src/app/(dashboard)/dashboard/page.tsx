import { getSession } from '@/lib/auth';
import { prisma } from '@gym/database';
import { getGymHealth, getAlerts, getAtRiskMembers, getTrends } from '@gym/core';
import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { HealthScore } from '@/components/dashboard/health-score';
import { AlertsList } from '@/components/dashboard/alerts-list';
import { AtRiskMembers } from '@/components/dashboard/at-risk-members';
import { TrendCards } from '@/components/dashboard/trend-cards';

async function getDashboardData() {
  const session = await getSession();
  if (!session) return null;

  // Get the staff member's gym
  const staff = await prisma.staff.findFirst({
    where: { userId: session.user.id },
    include: { gym: true },
  });

  if (!staff) return null;

  const gymId = staff.gymId;

  // Fetch all analytics data in parallel
  const [health, alerts, atRiskMembers, trends] = await Promise.all([
    getGymHealth(gymId),
    getAlerts(gymId),
    getAtRiskMembers(gymId, 10),
    getTrends(gymId),
  ]);

  return {
    gym: staff.gym,
    staff,
    health,
    alerts,
    atRiskMembers,
    trends,
  };
}

export default async function DashboardPage() {
  const data = await getDashboardData();

  if (!data) {
    redirect('/login');
  }

  const { gym, health, alerts, atRiskMembers, trends } = data;

  // Determine the main message based on gym health
  const getStatusMessage = () => {
    if (alerts.some((a) => a.severity === 'critical')) {
      return 'Critical issues need your attention';
    }
    if (health.status === 'critical') {
      return 'Your gym needs immediate attention';
    }
    if (health.status === 'warning') {
      return 'Some areas need monitoring';
    }
    if (atRiskMembers.length > 5) {
      return `${atRiskMembers.length} members showing warning signs`;
    }
    return 'Your gym is performing well';
  };

  return (
    <>
      <Header
        title={`Good ${getTimeOfDay()}, ${gym.name}`}
        description={getStatusMessage()}
      />

      <div className="p-6 space-y-6">
        {/* Top Row: Health Score + Key Trends */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <HealthScore
              score={health.score}
              status={health.status}
              trend={health.trend}
              factors={health.factors}
            />
          </div>
          <div className="lg:col-span-2">
            <TrendCards trends={trends} />
          </div>
        </div>

        {/* Alerts Section - Only show if there are alerts */}
        {alerts.length > 0 && <AlertsList alerts={alerts} />}

        {/* At-Risk Members */}
        <AtRiskMembers members={atRiskMembers} />

        {/* Quick Context - What's happening today */}
        <div className="grid gap-6 md:grid-cols-2">
          <TodaySnapshot gymId={gym.id} />
          <RecentActivity gymId={gym.id} />
        </div>
      </div>
    </>
  );
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

// Today's snapshot component
async function TodaySnapshot({ gymId }: { gymId: string }) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const [checkInsToday, classesToday, bookingsToday] = await Promise.all([
    prisma.checkIn.count({
      where: {
        gymId,
        checkedInAt: { gte: startOfDay, lt: endOfDay },
      },
    }),
    prisma.classSession.count({
      where: {
        gymId,
        startTime: { gte: startOfDay, lt: endOfDay },
        status: 'SCHEDULED',
      },
    }),
    prisma.booking.count({
      where: {
        member: { gymId },
        session: {
          startTime: { gte: startOfDay, lt: endOfDay },
        },
      },
    }),
  ]);

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="font-semibold text-lg mb-4">Today at a Glance</h3>
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">{checkInsToday}</div>
          <div className="text-sm text-muted-foreground">Check-ins</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">{classesToday}</div>
          <div className="text-sm text-muted-foreground">Classes</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold text-primary">{bookingsToday}</div>
          <div className="text-sm text-muted-foreground">Bookings</div>
        </div>
      </div>
    </div>
  );
}

// Recent activity component
async function RecentActivity({ gymId }: { gymId: string }) {
  const recentBookings = await prisma.booking.findMany({
    where: { member: { gymId } },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      member: true,
      session: { include: { class: true } },
    },
  });

  return (
    <div className="rounded-lg border bg-card p-6">
      <h3 className="font-semibold text-lg mb-4">Recent Activity</h3>
      {recentBookings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recent activity</p>
      ) : (
        <div className="space-y-3">
          {recentBookings.map((booking) => (
            <div key={booking.id} className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium">
                  {booking.member.firstName} {booking.member.lastName}
                </span>
                <span className="text-muted-foreground"> booked </span>
                <span className="font-medium">{booking.session.class.name}</span>
              </div>
              <span className="text-muted-foreground text-xs">
                {formatTimeAgo(booking.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
