'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CreditCard,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  Shield,
  Building2,
  Percent,
  RefreshCw,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';

interface ConnectStatus {
  status: 'not_connected' | 'onboarding' | 'active' | 'restricted';
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardingComplete: boolean;
  requirements?: {
    currently_due?: string[];
    eventually_due?: string[];
    past_due?: string[];
  };
}

export default function StripeSettingsPage() {
  const searchParams = useSearchParams();
  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check for onboarding status from URL params
  useEffect(() => {
    const onboarding = searchParams.get('onboarding');
    if (onboarding === 'complete') {
      setSuccessMessage('Stripe account setup is being finalized. This may take a few moments.');
      // Refresh status after a short delay
      setTimeout(() => fetchConnectStatus(), 2000);
    } else if (onboarding === 'refresh') {
      setError('Onboarding session expired. Please try again.');
    }
  }, [searchParams]);

  useEffect(() => {
    fetchConnectStatus();
  }, []);

  const fetchConnectStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/stripe/connect');
      const data = await response.json();

      if (data.success) {
        setConnectStatus(data.data);
        // Clear success message if account is now active
        if (data.data.status === 'active') {
          setSuccessMessage(null);
        }
      } else {
        setError(data.error?.message || 'Failed to load Stripe status');
      }
    } catch {
      setError('Failed to load Stripe status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      const response = await fetch('/api/stripe/connect', {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success && data.data.onboardingUrl) {
        // Redirect to Stripe's hosted onboarding
        window.location.href = data.data.onboardingUrl;
      } else {
        setError(data.error?.message || 'Failed to start Stripe setup');
        setIsConnecting(false);
      }
    } catch {
      setError('Failed to start Stripe setup');
      setIsConnecting(false);
    }
  };

  const getStatusBadge = () => {
    if (!connectStatus) return null;

    switch (connectStatus.status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
            Connected
          </span>
        );
      case 'onboarding':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700">
            <AlertCircle className="w-4 h-4" />
            Setup Incomplete
          </span>
        );
      case 'restricted':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700">
            <AlertCircle className="w-4 h-4" />
            Action Required
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-slate-100 text-slate-600">
            Not Connected
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <>
        <Header title="Stripe Settings" description="Manage your payment processing" />
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Stripe Settings" description="Manage your payment processing" />

      <div className="p-4 md:p-6 space-y-6">
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <p>{successMessage}</p>
          </div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Stripe Connect</h2>
                <p className="text-sm text-slate-500">Accept payments and manage payouts</p>
              </div>
            </div>
            {getStatusBadge()}
          </div>

          {/* Content */}
          <div className="p-6">
            {!connectStatus || connectStatus.status === 'not_connected' ? (
              // Not Connected State
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <CreditCard className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Connect Your Stripe Account
                </h3>
                <p className="text-slate-500 mb-6 max-w-md mx-auto">
                  Connect with Stripe to accept member payments, manage subscriptions, and receive
                  automatic payouts to your bank account.
                </p>

                {/* Features Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 max-w-2xl mx-auto text-left">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <Shield className="w-5 h-5 text-indigo-600 mb-2" />
                    <h4 className="font-medium text-slate-900">Secure Payments</h4>
                    <p className="text-sm text-slate-500">PCI compliant payment processing</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <Building2 className="w-5 h-5 text-indigo-600 mb-2" />
                    <h4 className="font-medium text-slate-900">Your Dashboard</h4>
                    <p className="text-sm text-slate-500">Full access to your Stripe account</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <Percent className="w-5 h-5 text-indigo-600 mb-2" />
                    <h4 className="font-medium text-slate-900">Low Fees</h4>
                    <p className="text-sm text-slate-500">2.9% + 30c per transaction</p>
                  </div>
                </div>

                <Button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 px-8"
                >
                  {isConnecting ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Connect with Stripe
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </>
                  )}
                </Button>
              </div>
            ) : connectStatus.status === 'onboarding' || connectStatus.status === 'restricted' ? (
              // Onboarding Incomplete / Restricted State
              <div>
                <div className="flex items-start gap-4 p-4 bg-amber-50 rounded-xl mb-6">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-800">Setup Incomplete</h4>
                    <p className="text-sm text-amber-700 mt-1">
                      {connectStatus.status === 'restricted'
                        ? 'Your account has been restricted. Please complete the required steps.'
                        : 'Complete your Stripe account setup to start accepting payments.'}
                    </p>
                  </div>
                </div>

                {/* Requirements */}
                {connectStatus.requirements?.currently_due &&
                  connectStatus.requirements.currently_due.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-sm font-medium text-slate-700 mb-2">Required Steps:</h4>
                      <ul className="space-y-2">
                        {connectStatus.requirements.currently_due.map((req, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm text-slate-600">
                            <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs">
                              {index + 1}
                            </span>
                            {req.replace(/_/g, ' ').replace(/\./g, ' - ')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                {/* Status Grid */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500 mb-1">Charges</p>
                    <p className={`font-medium ${connectStatus.chargesEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {connectStatus.chargesEnabled ? 'Enabled' : 'Not Enabled'}
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500 mb-1">Payouts</p>
                    <p className={`font-medium ${connectStatus.payoutsEnabled ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {connectStatus.payoutsEnabled ? 'Enabled' : 'Not Enabled'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        Continue Setup
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={fetchConnectStatus}
                    className="rounded-xl"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Status
                  </Button>
                </div>
              </div>
            ) : (
              // Connected State
              <div>
                <div className="flex items-start gap-4 p-4 bg-emerald-50 rounded-xl mb-6">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-emerald-800">Account Connected</h4>
                    <p className="text-sm text-emerald-700 mt-1">
                      Your Stripe account is fully set up and ready to accept payments.
                    </p>
                  </div>
                </div>

                {/* Status Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500 mb-1">Charges</p>
                    <p className="font-medium text-emerald-600">
                      <CheckCircle2 className="w-4 h-4 inline mr-1" />
                      Enabled
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500 mb-1">Payouts</p>
                    <p className="font-medium text-emerald-600">
                      <CheckCircle2 className="w-4 h-4 inline mr-1" />
                      Enabled
                    </p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500 mb-1">Platform Fee</p>
                    <p className="font-medium text-slate-900">2.5%</p>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-sm text-slate-500 mb-1">Status</p>
                    <p className="font-medium text-emerald-600">Active</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
                    className="rounded-xl"
                  >
                    Open Stripe Dashboard
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={fetchConnectStatus}
                    className="rounded-xl"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh Status
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-slate-50 rounded-2xl p-6">
          <h3 className="font-semibold text-slate-900 mb-2">About Stripe Connect</h3>
          <p className="text-sm text-slate-600 mb-4">
            Stripe Connect allows you to accept payments from your members while maintaining full
            control over your business. Funds are deposited directly into your bank account on a
            regular schedule.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-slate-700 mb-1">Payment Methods</h4>
              <p className="text-slate-500">Credit cards, debit cards, Apple Pay, Google Pay</p>
            </div>
            <div>
              <h4 className="font-medium text-slate-700 mb-1">Payout Schedule</h4>
              <p className="text-slate-500">Daily, weekly, or monthly to your bank account</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
