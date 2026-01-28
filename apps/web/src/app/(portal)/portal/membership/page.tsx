import { getSession } from '@/lib/auth';
import { prisma } from '@gym/database';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard, Calendar, Dumbbell, Ticket, Clock } from 'lucide-react';
import { formatCurrency } from '@gym/shared';
import { getMemberPasses } from '@gym/core';

async function getMembershipData() {
  const session = await getSession();
  if (!session) return null;

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

  const passes = await getMemberPasses(member.id);

  return { member, passes };
}

function formatDateDisplay(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatShortDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export default async function MembershipPage() {
  const data = await getMembershipData();

  if (!data) {
    redirect('/member-login');
  }

  const { member, passes } = data;
  const subscription = member.subscription;
  const plan = subscription?.plan;
  const activePasses = passes.filter((p: { status: string }) => p.status === 'ACTIVE');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Membership</h1>
        <p className="text-muted-foreground mt-1">
          View your membership details and benefits
        </p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-5 w-5" />
                {plan?.name || 'No Active Plan'}
              </CardTitle>
              <CardDescription>
                {plan?.description || 'You do not have an active membership'}
              </CardDescription>
            </div>
            {subscription && (
              <Badge
                variant={subscription.status === 'ACTIVE' ? 'default' : 'secondary'}
                className="text-sm"
              >
                {subscription.status}
              </Badge>
            )}
          </div>
        </CardHeader>
        {plan && (
          <CardContent className="space-y-6">
            {/* Price */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Monthly Cost</p>
                  <p className="text-sm text-muted-foreground">
                    Billed {plan.billingInterval.toLowerCase()}
                  </p>
                </div>
              </div>
              <p className="text-2xl font-bold">
                {formatCurrency(Number(plan.priceAmount), member.gym.currency)}
              </p>
            </div>

            {/* Billing Period */}
            {subscription && (
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Current Period</p>
                    <p className="text-sm text-muted-foreground">
                      Your billing cycle
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {formatShortDate(subscription.currentPeriodStart)} -{' '}
                    {formatDateDisplay(subscription.currentPeriodEnd)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Renews {formatShortDate(subscription.currentPeriodEnd)}
                  </p>
                </div>
              </div>
            )}

            {/* Features */}
            <div>
              <h3 className="font-semibold mb-4">Plan Benefits</h3>
              <div className="grid gap-3">
                {(plan.features as string[])?.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bonuses */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Bonuses</p>
                  <p className="text-sm text-muted-foreground">
                    {plan.bonusCount === -1
                      ? 'Book unlimited classes'
                      : `${plan.bonusCount} bonuses per month`}
                  </p>
                </div>
                <div className="text-3xl font-bold text-primary">
                  {plan.bonusCount === -1 ? '∞' : plan.bonusCount}
                </div>
              </div>
            </div>

            {/* Guest Passes */}
            {plan.guestPasses && plan.guestPasses > 0 && (
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Guest Passes</p>
                    <p className="text-sm text-muted-foreground">
                      Bring friends to workout with you
                    </p>
                  </div>
                  <div className="text-3xl font-bold text-primary">
                    {plan.guestPasses}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Your Passes */}
      {activePasses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Your Passes
            </CardTitle>
            <CardDescription>Class packs and drop-in bonuses</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {activePasses.map((pass: {
              id: string;
              bonusRemaining: number;
              bonusTotal: number;
              expiresAt: Date | null;
              product: { name: string; type: string };
            }) => {
              const pct = pass.bonusTotal > 0
                ? Math.round((pass.bonusRemaining / pass.bonusTotal) * 100)
                : 0;
              return (
                <div key={pass.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">{pass.product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {pass.product.type === 'DROP_IN' ? 'Drop-In' : 'Class Pack'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-bold text-primary">{pass.bonusRemaining}</p>
                      <p className="text-xs text-muted-foreground">of {pass.bonusTotal} bonuses</p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-2 bg-muted rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct > 50 ? 'bg-primary' : pct > 20 ? 'bg-amber-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {pass.expiresAt && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Expires {formatDateDisplay(pass.expiresAt)}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Member Since */}
      <Card>
        <CardHeader>
          <CardTitle>Member Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Member ID</p>
              <p className="font-mono">{member.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p>{formatDateDisplay(member.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <Badge variant={member.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {member.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gym</p>
              <p>{member.gym.name}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
