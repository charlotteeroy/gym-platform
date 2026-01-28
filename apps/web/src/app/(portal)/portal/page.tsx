import { getSession } from '@/lib/auth';
import { prisma } from '@gym/database';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Dumbbell, TrendingUp, Trophy, Target, Flame, History, Ticket } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { getMemberPasses } from '@gym/core';

function formatDateDisplay(date: Date, format: 'day' | 'time' | 'full'): string {
  const d = new Date(date);
  if (format === 'day') {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }
  if (format === 'time') {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function getMemberData() {
  const session = await getSession();
  if (!session) return null;

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const member = await prisma.member.findFirst({
    where: { userId: session.user.id },
    include: {
      gym: true,
      subscription: {
        include: { plan: true },
      },
    },
  });

  if (!member) return null;

  // Get bookings separately for better control
  const bookings = await prisma.booking.findMany({
    where: { memberId: member.id },
    include: {
      session: {
        include: {
          class: {
            include: {
              instructor: true,
            },
          },
        },
      },
    },
    orderBy: { session: { startTime: 'desc' } },
  });

  // Separate upcoming and past classes
  const upcomingClasses = bookings
    .filter((b) => new Date(b.session.startTime) >= now)
    .sort((a, b) => new Date(a.session.startTime).getTime() - new Date(b.session.startTime).getTime())
    .slice(0, 3);

  const pastClasses = bookings
    .filter((b) => new Date(b.session.startTime) < now)
    .slice(0, 5);

  // Count classes this month
  const classesThisMonth = bookings.filter((b) => {
    const classDate = new Date(b.session.startTime);
    return classDate >= startOfMonth && classDate < now;
  }).length;

  // Count classes this week
  const classesThisWeek = bookings.filter((b) => {
    const classDate = new Date(b.session.startTime);
    return classDate >= startOfWeek && classDate < now;
  }).length;

  // Calculate streak (consecutive days with classes)
  const sortedPastClasses = bookings
    .filter((b) => new Date(b.session.startTime) < now)
    .sort((a, b) => new Date(b.session.startTime).getTime() - new Date(a.session.startTime).getTime());

  let streak = 0;
  if (sortedPastClasses.length > 0) {
    const lastClassDate = new Date(sortedPastClasses[0].session.startTime);
    const daysSinceLastClass = Math.floor(
      (now.getTime() - lastClassDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLastClass <= 1) {
      streak = 1;
      for (let i = 1; i < sortedPastClasses.length; i++) {
        const currentDate = new Date(sortedPastClasses[i - 1].session.startTime);
        const prevDate = new Date(sortedPastClasses[i].session.startTime);
        const dayDiff = Math.floor(
          (currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (dayDiff <= 1) {
          streak++;
        } else {
          break;
        }
      }
    }
  }

  // Get passes
  const passes = await getMemberPasses(member.id);
  const activePasses = passes.filter((p: { status: string }) => p.status === 'ACTIVE');
  const totalBonuses = activePasses.reduce(
    (sum: number, p: { bonusRemaining: number }) => sum + p.bonusRemaining,
    0
  );

  return {
    member,
    upcomingClasses,
    pastClasses,
    classesThisMonth,
    classesThisWeek,
    streak,
    totalClassesAttended: pastClasses.length,
    activePasses,
    totalBonuses,
  };
}

export default async function PortalHomePage() {
  const data = await getMemberData();

  if (!data) {
    redirect('/member-login');
  }

  const {
    member,
    upcomingClasses,
    pastClasses,
    classesThisMonth,
    classesThisWeek,
    streak,
    activePasses,
    totalBonuses,
  } = data;

  const subscription = member.subscription;
  const monthlyGoal = 12; // Target classes per month
  const progressPercent = Math.min((classesThisMonth / monthlyGoal) * 100, 100);

  // Check if member is new (created within last 5 minutes)
  const isNewMember = Date.now() - new Date(member.createdAt).getTime() < 5 * 60 * 1000;
  const greeting = isNewMember ? 'Welcome' : 'Welcome back';

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">{greeting}, {member.firstName}!</h1>
        <p className="text-muted-foreground mt-1">
          {isNewMember
            ? `You're all set up at ${member.gym.name}. Start by booking a class!`
            : `Here's your fitness progress at ${member.gym.name}`
          }
        </p>
      </div>

      {/* Progress Card */}
      <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Monthly Progress
          </CardTitle>
          <CardDescription>Your activity for this month</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>{classesThisMonth} classes attended</span>
              <span>Goal: {monthlyGoal} classes</span>
            </div>
            <Progress value={progressPercent} className="h-3" />
          </div>
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{classesThisWeek}</div>
              <div className="text-xs text-muted-foreground">This Week</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{classesThisMonth}</div>
              <div className="text-xs text-muted-foreground">This Month</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-500 flex items-center justify-center gap-1">
                <Flame className="h-5 w-5" />
                {streak}
              </div>
              <div className="text-xs text-muted-foreground">Day Streak</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Membership</CardTitle>
            <Dumbbell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {subscription?.plan?.name || 'No Plan'}
            </div>
            <p className="text-xs text-muted-foreground">
              {subscription?.status === 'ACTIVE' ? 'Active' : 'Inactive'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Classes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingClasses.length}</div>
            <p className="text-xs text-muted-foreground">Booked</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Classes Attended</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pastClasses.length}</div>
            <p className="text-xs text-muted-foreground">Total</p>
          </CardContent>
        </Card>

        {totalBonuses > 0 ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bonuses</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBonuses}</div>
              <p className="text-xs text-muted-foreground">
                Across {activePasses.length} {activePasses.length === 1 ? 'pass' : 'passes'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Bonuses</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subscription?.plan?.bonusCount === -1
                  ? '∞'
                  : subscription?.plan?.bonusCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {subscription?.plan?.bonusCount === -1 ? 'Unlimited' : 'Available'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Classes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Classes
                </CardTitle>
                <CardDescription>Your next scheduled classes</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/portal/classes">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingClasses.length === 0 ? (
              <div className="text-center py-6">
                <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No upcoming classes</p>
                <Button asChild size="sm" className="mt-3">
                  <Link href="/portal/classes">Book a Class</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingClasses.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    <div
                      className="w-2 h-10 rounded-full flex-shrink-0"
                      style={{ backgroundColor: booking.session.class.color || '#3b82f6' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{booking.session.class.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateDisplay(booking.session.startTime, 'day')} at{' '}
                        {formatDateDisplay(booking.session.startTime, 'time')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Last Attended Classes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Recently Attended
                </CardTitle>
                <CardDescription>Your class history</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/portal/bookings">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pastClasses.length === 0 ? (
              <div className="text-center py-6">
                <History className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">No classes attended yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Book your first class to get started!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pastClasses.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
                  >
                    <div
                      className="w-2 h-10 rounded-full flex-shrink-0 opacity-60"
                      style={{ backgroundColor: booking.session.class.color || '#3b82f6' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{booking.session.class.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateDisplay(booking.session.startTime, 'full')} at{' '}
                        {formatDateDisplay(booking.session.startTime, 'time')}
                      </p>
                    </div>
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                      Attended
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:border-primary/50 transition-colors">
          <Link href="/portal/classes">
            <CardContent className="pt-6">
              <Calendar className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold">Book a Class</h3>
              <p className="text-sm text-muted-foreground">
                Browse the schedule and book classes
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <Link href="/portal/membership">
            <CardContent className="pt-6">
              <Dumbbell className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold">View Membership</h3>
              <p className="text-sm text-muted-foreground">
                Check your plan and benefits
              </p>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <Link href="/portal/profile">
            <CardContent className="pt-6">
              <TrendingUp className="h-8 w-8 text-primary mb-2" />
              <h3 className="font-semibold">Update Profile</h3>
              <p className="text-sm text-muted-foreground">
                Edit your contact information
              </p>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
