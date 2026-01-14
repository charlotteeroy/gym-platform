import { getSession } from '@/lib/auth';
import { prisma } from '@gym/database';
import { redirect } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  Users,
  AlertTriangle,
  Pause,
  XCircle,
  DollarSign,
  Calendar,
  ChevronRight,
  Plus,
} from 'lucide-react';
import Link from 'next/link';

async function getSubscriptionData() {
  const session = await getSession();
  if (!session) return null;

  const staff = await prisma.staff.findFirst({
    where: { userId: session.user.id },
    include: { gym: true },
  });

  if (!staff) return null;

  const gymId = staff.gymId;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  // Get all subscriptions with member and plan info
  const subscriptions = await prisma.subscription.findMany({
    where: { member: { gymId } },
    include: {
      member: true,
      plan: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get membership plans
  const plans = await prisma.membershipPlan.findMany({
    where: { gymId },
    include: {
      _count: {
        select: {
          subscriptions: {
            where: { status: 'ACTIVE' },
          },
        },
      },
    },
    orderBy: { priceAmount: 'asc' },
  });

  // Calculate stats
  const activeSubscriptions = subscriptions.filter((s) => s.status === 'ACTIVE');
  const pausedSubscriptions = subscriptions.filter((s) => s.status === 'PAUSED');
  const cancelledThisMonth = subscriptions.filter(
    (s) => s.status === 'CANCELLED' && s.cancelledAt && new Date(s.cancelledAt) >= thirtyDaysAgo
  );
  const cancelledLastMonth = subscriptions.filter(
    (s) =>
      s.status === 'CANCELLED' &&
      s.cancelledAt &&
      new Date(s.cancelledAt) >= sixtyDaysAgo &&
      new Date(s.cancelledAt) < thirtyDaysAgo
  );
  const setToCancel = subscriptions.filter((s) => s.status === 'ACTIVE' && s.cancelAtPeriodEnd);

  // Calculate MRR
  const mrr = activeSubscriptions.reduce((sum, sub) => {
    const monthlyAmount =
      sub.plan.billingInterval === 'YEARLY'
        ? Number(sub.plan.priceAmount) / 12
        : Number(sub.plan.priceAmount);
    return sum + monthlyAmount;
  }, 0);

  // Calculate previous MRR (approximation)
  const previousMrr = mrr * (1 + (cancelledThisMonth.length - cancelledLastMonth.length) * 0.05);
  const mrrChange = mrr - previousMrr;
  const mrrChangePercent = previousMrr > 0 ? (mrrChange / previousMrr) * 100 : 0;

  return {
    gym: staff.gym,
    subscriptions,
    plans,
    stats: {
      active: activeSubscriptions.length,
      paused: pausedSubscriptions.length,
      cancelledThisMonth: cancelledThisMonth.length,
      setToCancel: setToCancel.length,
      mrr,
      mrrChange,
      mrrChangePercent,
    },
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function SubscriptionsPage() {
  const data = await getSubscriptionData();

  if (!data) {
    redirect('/login');
  }

  const { subscriptions, plans, stats } = data;

  return (
    <>
      <Header title="Subscriptions" description="Manage memberships and billing" />

      <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-lg sm:text-xl md:text-2xl font-bold">{formatCurrency(stats.mrr)}</div>
              <div className="flex items-center text-[10px] sm:text-xs text-muted-foreground">
                {stats.mrrChange >= 0 ? (
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                )}
                <span className={stats.mrrChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {stats.mrrChange >= 0 ? '+' : ''}
                  {formatCurrency(stats.mrrChange)}
                </span>
                <span className="ml-1 hidden sm:inline">vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Active</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-lg sm:text-xl md:text-2xl font-bold">{stats.active}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {stats.paused > 0 && `${stats.paused} paused`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Set to Cancel</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500 hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-amber-600">{stats.setToCancel}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Won't renew</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium">Cancelled (30d)</CardTitle>
              <XCircle className="h-4 w-4 text-red-500 hidden sm:block" />
            </CardHeader>
            <CardContent className="p-3 sm:p-4 pt-0">
              <div className="text-lg sm:text-xl md:text-2xl font-bold text-red-600">{stats.cancelledThisMonth}</div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Membership Plans */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3 sm:px-6 py-3 sm:py-6">
            <div>
              <CardTitle className="text-base sm:text-lg">Membership Plans</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Your available subscription tiers</CardDescription>
            </div>
            <Button variant="outline" size="sm" className="self-start sm:self-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Plan
            </Button>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-lg border p-3 sm:p-4 hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between mb-2 gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm sm:text-base truncate">{plan.name}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">{plan.description}</p>
                    </div>
                    <Badge variant="secondary" className="text-[10px] sm:text-xs flex-shrink-0">{plan._count.subscriptions} active</Badge>
                  </div>
                  <div className="mt-2 sm:mt-3">
                    <span className="text-xl sm:text-2xl font-bold">${Number(plan.priceAmount).toFixed(2)}</span>
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      /{plan.billingInterval === 'YEARLY' ? 'year' : 'month'}
                    </span>
                  </div>
                  {plan.features && (
                    <ul className="mt-2 sm:mt-3 space-y-1">
                      {(plan.features as string[]).slice(0, 3).map((feature, i) => (
                        <li key={i} className="text-[10px] sm:text-xs text-muted-foreground flex items-center">
                          <span className="w-1 h-1 rounded-full bg-primary mr-2 flex-shrink-0" />
                          <span className="truncate">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* All Subscriptions */}
        <Card>
          <CardHeader className="px-3 sm:px-6 py-3 sm:py-6">
            <CardTitle className="text-base sm:text-lg">All Subscriptions</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {subscriptions.length} total subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
              {subscriptions.map((subscription) => (
                <Link
                  key={subscription.id}
                  href={`/members/${subscription.member.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-medium text-sm truncate">
                        {subscription.member.firstName} {subscription.member.lastName}
                      </p>
                      <StatusBadge
                        status={subscription.status}
                        cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
                      />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <Badge variant="outline" className="text-[10px]">{subscription.plan.name}</Badge>
                      <span>${Number(subscription.plan.priceAmount).toFixed(0)}/{subscription.plan.billingInterval === 'YEARLY' ? 'yr' : 'mo'}</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </Link>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block relative overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-muted-foreground border-b">
                  <tr>
                    <th className="pb-3 font-medium">Member</th>
                    <th className="pb-3 font-medium">Plan</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Price</th>
                    <th className="pb-3 font-medium">Next Billing</th>
                    <th className="pb-3 font-medium w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {subscriptions.map((subscription) => (
                    <tr key={subscription.id} className="hover:bg-muted/50">
                      <td className="py-3">
                        <div className="font-medium">
                          {subscription.member.firstName} {subscription.member.lastName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {subscription.member.email}
                        </div>
                      </td>
                      <td className="py-3">
                        <Badge variant="outline">{subscription.plan.name}</Badge>
                      </td>
                      <td className="py-3">
                        <StatusBadge
                          status={subscription.status}
                          cancelAtPeriodEnd={subscription.cancelAtPeriodEnd}
                        />
                      </td>
                      <td className="py-3">
                        ${Number(subscription.plan.priceAmount).toFixed(2)}
                        <span className="text-muted-foreground">
                          /{subscription.plan.billingInterval === 'YEARLY' ? 'yr' : 'mo'}
                        </span>
                      </td>
                      <td className="py-3 text-muted-foreground">
                        {subscription.status === 'ACTIVE'
                          ? formatDate(subscription.currentPeriodEnd)
                          : subscription.status === 'CANCELLED'
                            ? `Cancelled ${subscription.cancelledAt ? formatDate(subscription.cancelledAt) : ''}`
                            : 'Paused'}
                      </td>
                      <td className="py-3">
                        <Link href={`/members/${subscription.member.id}`}>
                          <Button variant="ghost" size="icon">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatusBadge({
  status,
  cancelAtPeriodEnd,
}: {
  status: string;
  cancelAtPeriodEnd: boolean;
}) {
  if (status === 'ACTIVE' && cancelAtPeriodEnd) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-amber-100 text-amber-700">
        <AlertTriangle className="h-3 w-3 hidden sm:block" />
        Cancelling
      </span>
    );
  }

  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-green-100 text-green-700">
        Active
      </span>
    );
  }

  if (status === 'PAUSED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-yellow-100 text-yellow-700">
        <Pause className="h-3 w-3 hidden sm:block" />
        Paused
      </span>
    );
  }

  if (status === 'CANCELLED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-red-100 text-red-700">
        <XCircle className="h-3 w-3 hidden sm:block" />
        Cancelled
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-gray-100 text-gray-700">
      {status}
    </span>
  );
}
