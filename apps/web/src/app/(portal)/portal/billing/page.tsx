'use client';

import { useState, useEffect } from 'react';
import {
  CreditCard,
  Loader2,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  PauseCircle,
  PlayCircle,
  Download,
  ExternalLink,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BillingData {
  member: {
    id: string;
    name: string;
    email: string;
    stripeCustomerId: string | null;
  };
  subscription: {
    id: string;
    status: string;
    plan: {
      id: string;
      name: string;
      priceAmount: number;
      billingInterval: string;
    };
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    cancelledAt: string | null;
    pausedAt: string | null;
    resumeAt: string | null;
  } | null;
  paymentMethods: {
    id: string;
    brand?: string;
    last4?: string;
    expMonth?: number;
    expYear?: number;
    isDefault: boolean;
  }[];
  recentInvoices: {
    id: string;
    number: string;
    amount: number;
    currency: string;
    status: string;
    paidAt: string | null;
    invoicePdf: string | null;
  }[];
  gym: {
    name: string;
    currency: string;
    paymentsEnabled: boolean;
  };
}

export default function PortalBillingPage() {
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    fetchBillingData();
  }, []);

  const fetchBillingData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/portal/billing');
      const data = await response.json();

      if (data.success) {
        setBillingData(data.data);
      } else {
        setError(data.error?.message || 'Failed to load billing information');
      }
    } catch {
      setError('Failed to load billing information');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setActionLoading('cancel');
      const response = await fetch('/api/portal/billing/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ immediately: false }),
      });
      const data = await response.json();

      if (data.success) {
        await fetchBillingData();
        setShowCancelConfirm(false);
      } else {
        setError(data.error?.message || 'Failed to cancel subscription');
      }
    } catch {
      setError('Failed to cancel subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResumeSubscription = async () => {
    try {
      setActionLoading('resume');
      const response = await fetch('/api/portal/billing/subscription/resume', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        await fetchBillingData();
      } else {
        setError(data.error?.message || 'Failed to resume subscription');
      }
    } catch {
      setError('Failed to resume subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePauseSubscription = async () => {
    try {
      setActionLoading('pause');
      const response = await fetch('/api/portal/billing/subscription/pause', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();

      if (data.success) {
        await fetchBillingData();
      } else {
        setError(data.error?.message || 'Failed to pause subscription');
      }
    } catch {
      setError('Failed to pause subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <Badge className="bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case 'PAUSED':
        return (
          <Badge className="bg-amber-100 text-amber-700">
            <PauseCircle className="w-3 h-3 mr-1" />
            Paused
          </Badge>
        );
      case 'PAST_DUE':
        return (
          <Badge className="bg-red-100 text-red-700">
            <AlertCircle className="w-3 h-3 mr-1" />
            Past Due
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge className="bg-slate-100 text-slate-700">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error && !billingData) {
    return (
      <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl">
        <AlertCircle className="w-5 h-5 inline mr-2" />
        {error}
      </div>
    );
  }

  if (!billingData) return null;

  const subscription = billingData.subscription;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and payment methods
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="ml-auto"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Subscription Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription
              </CardTitle>
              <CardDescription>Your current membership plan</CardDescription>
            </div>
            {subscription && getStatusBadge(subscription.status)}
          </div>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="space-y-6">
              {/* Plan Info */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-semibold text-lg">{subscription.plan.name}</p>
                  <p className="text-sm text-slate-500">
                    Billed {subscription.plan.billingInterval.toLowerCase()}
                  </p>
                </div>
                <p className="text-2xl font-bold">
                  {formatCurrency(subscription.plan.priceAmount, billingData.gym.currency)}
                </p>
              </div>

              {/* Cancellation Warning */}
              {subscription.cancelAtPeriodEnd && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Cancellation Scheduled</p>
                    <p className="text-sm text-amber-700">
                      Your subscription will end on {formatDate(subscription.currentPeriodEnd)}.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={handleResumeSubscription}
                      disabled={actionLoading === 'resume'}
                    >
                      {actionLoading === 'resume' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <PlayCircle className="h-4 w-4 mr-2" />
                      )}
                      Keep Subscription
                    </Button>
                  </div>
                </div>
              )}

              {/* Paused State */}
              {subscription.status === 'PAUSED' && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <PauseCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-800">Subscription Paused</p>
                    <p className="text-sm text-amber-700">
                      {subscription.resumeAt
                        ? `Your subscription will resume on ${formatDate(subscription.resumeAt)}.`
                        : 'Your subscription is paused. Resume anytime to continue.'}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={handleResumeSubscription}
                      disabled={actionLoading === 'resume'}
                    >
                      {actionLoading === 'resume' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <PlayCircle className="h-4 w-4 mr-2" />
                      )}
                      Resume Subscription
                    </Button>
                  </div>
                </div>
              )}

              {/* Billing Period */}
              <div className="flex items-center justify-between p-4 border rounded-xl">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="font-medium">Current Period</p>
                    <p className="text-sm text-slate-500">
                      {formatDate(subscription.currentPeriodStart)} -{' '}
                      {formatDate(subscription.currentPeriodEnd)}
                    </p>
                  </div>
                </div>
                {!subscription.cancelAtPeriodEnd && subscription.status === 'ACTIVE' && (
                  <p className="text-sm text-slate-500">
                    Renews {formatDate(subscription.currentPeriodEnd)}
                  </p>
                )}
              </div>

              {/* Actions */}
              {subscription.status === 'ACTIVE' && !subscription.cancelAtPeriodEnd && (
                <div className="flex items-center gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={handlePauseSubscription}
                    disabled={actionLoading === 'pause'}
                  >
                    {actionLoading === 'pause' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <PauseCircle className="h-4 w-4 mr-2" />
                    )}
                    Pause Subscription
                  </Button>
                  <Button
                    variant="outline"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => setShowCancelConfirm(true)}
                  >
                    Cancel Subscription
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No active subscription</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Methods Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Methods
              </CardTitle>
              <CardDescription>Manage your payment methods</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {billingData.paymentMethods.length > 0 ? (
            <div className="space-y-3">
              {billingData.paymentMethods.map((pm) => (
                <div
                  key={pm.id}
                  className="flex items-center justify-between p-4 border rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-7 bg-slate-100 rounded flex items-center justify-center text-xs font-medium uppercase">
                      {pm.brand || 'Card'}
                    </div>
                    <div>
                      <p className="font-medium">**** **** **** {pm.last4}</p>
                      <p className="text-sm text-slate-500">
                        Expires {pm.expMonth}/{pm.expYear}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No payment methods on file</p>
            </div>
          )}
          <Button variant="outline" className="w-full mt-4">
            <Plus className="h-4 w-4 mr-2" />
            Add Payment Method
          </Button>
        </CardContent>
      </Card>

      {/* Recent Invoices Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Invoices
          </CardTitle>
          <CardDescription>Your billing history</CardDescription>
        </CardHeader>
        <CardContent>
          {billingData.recentInvoices.length > 0 ? (
            <div className="space-y-3">
              {billingData.recentInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-4 border rounded-xl"
                >
                  <div>
                    <p className="font-medium">Invoice #{invoice.number}</p>
                    <p className="text-sm text-slate-500">
                      {invoice.paidAt ? formatDate(invoice.paidAt) : 'Pending'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="font-medium">
                      {formatCurrency(invoice.amount, invoice.currency)}
                    </p>
                    <Badge
                      className={
                        invoice.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600'
                      }
                    >
                      {invoice.status}
                    </Badge>
                    {invoice.invoicePdf && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={invoice.invoicePdf} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No invoices yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Cancel Subscription?</h3>
            <p className="text-slate-600 mb-6">
              Your subscription will remain active until the end of the current billing period (
              {subscription && formatDate(subscription.currentPeriodEnd)}). You can resume anytime
              before then.
            </p>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setShowCancelConfirm(false)}
                className="flex-1"
              >
                Keep Subscription
              </Button>
              <Button
                onClick={handleCancelSubscription}
                disabled={actionLoading === 'cancel'}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                {actionLoading === 'cancel' ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Yes, Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
