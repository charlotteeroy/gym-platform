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

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.mrr)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {stats.mrrChange >= 0 ? (
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                )}
                <span className={stats.mrrChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {stats.mrrChange >= 0 ? '+' : ''}
                  {formatCurrency(stats.mrrChange)}
                </span>
                <span className="ml-1">vs last month</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active}</div>
              <p className="text-xs text-muted-foreground">
                {stats.paused > 0 && `${stats.paused} paused`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Set to Cancel</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{stats.setToCancel}</div>
              <p className="text-xs text-muted-foreground">Won't renew at period end</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cancelled (30d)</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.cancelledThisMonth}</div>
              <p className="text-xs text-muted-foreground">Cancellations this month</p>
            </CardContent>
          </Card>
        </div>

        {/* Membership Plans */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Membership Plans</CardTitle>
              <CardDescription>Your available subscription tiers</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Plan
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-lg border p-4 hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </div>
                    <Badge variant="secondary">{plan._count.subscriptions} active</Badge>
                  </div>
                  <div className="mt-3">
                    <span className="text-2xl font-bold">${Number(plan.priceAmount).toFixed(2)}</span>
                    <span className="text-muted-foreground">
                      /{plan.billingInterval === 'YEARLY' ? 'year' : 'month'}
                    </span>
                  </div>
                  {plan.features && (
                    <ul className="mt-3 space-y-1">
                      {(plan.features as string[]).slice(0, 3).map((feature, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-center">
                          <span className="w-1 h-1 rounded-full bg-primary mr-2" />
                          {feature}
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
          <CardHeader>
            <CardTitle>All Subscriptions</CardTitle>
            <CardDescription>
              {subscriptions.length} total subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative overflow-x-auto">
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
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700">
        <AlertTriangle className="h-3 w-3" />
        Cancelling
      </span>
    );
  }

  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-700">
        Active
      </span>
    );
  }

  if (status === 'PAUSED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700">
        <Pause className="h-3 w-3" />
        Paused
      </span>
    );
  }

  if (status === 'CANCELLED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium bg-red-100 text-red-700">
        <XCircle className="h-3 w-3" />
        Cancelled
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700">
      {status}
    </span>
  );
}
