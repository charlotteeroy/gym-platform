'use client';

import { useState, useEffect } from 'react';
import {
  Coins,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  TrendingUp,
  Save,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';

interface Currency {
  code: string;
  name: string;
  symbol: string;
  locale: string;
}

interface ExchangeRates {
  baseCurrency: string;
  rates: {
    CAD: number;
    USD: number;
    EUR: number;
  };
  lastUpdated: string;
  source: 'manual' | 'auto';
}

interface CurrencySettings {
  id: string;
  baseCurrency: string;
  enabledCurrencies: string[];
  usdToCad: string | null;
  eurToCad: string | null;
  useAutoRates: boolean;
  lastRateUpdate: string | null;
}

export default function CurrencySettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [currentRates, setCurrentRates] = useState<ExchangeRates | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Form state
  const [baseCurrency, setBaseCurrency] = useState('CAD');
  const [enabledCurrencies, setEnabledCurrencies] = useState<string[]>(['CAD']);
  const [usdToCad, setUsdToCad] = useState('');
  const [eurToCad, setEurToCad] = useState('');
  const [useAutoRates, setUseAutoRates] = useState(false);

  useEffect(() => {
    fetchCurrencySettings();
  }, []);

  const fetchCurrencySettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/admin/settings/currency');
      const data = await response.json();

      if (data.success) {
        setCurrencies(data.data.supportedCurrencies);
        setCurrentRates(data.data.currentRates);
        if (data.data.settings) {
          const settings = data.data.settings as CurrencySettings;
          setBaseCurrency(settings.baseCurrency);
          setEnabledCurrencies(settings.enabledCurrencies);
          setUsdToCad(settings.usdToCad || '');
          setEurToCad(settings.eurToCad || '');
          setUseAutoRates(settings.useAutoRates);
        }
      } else {
        setError(data.error?.message || 'Failed to load currency settings');
      }
    } catch {
      setError('Failed to load currency settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshRates = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      const response = await fetch('/api/admin/settings/currency/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh' }),
      });
      const data = await response.json();

      if (data.success) {
        setCurrentRates(data.data);
        setUsdToCad(data.data.rates.USD.toString());
        setEurToCad(data.data.rates.EUR.toString());
        setSuccess('Exchange rates refreshed from Bank of Canada');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.error?.message || 'Failed to refresh exchange rates');
      }
    } catch {
      setError('Failed to refresh exchange rates');
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleCurrency = (code: string) => {
    if (code === baseCurrency) return; // Can't disable base currency
    setEnabledCurrencies((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      setValidationErrors({});

      const response = await fetch('/api/admin/settings/currency', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseCurrency,
          enabledCurrencies,
          usdToCad: usdToCad ? parseFloat(usdToCad) : null,
          eurToCad: eurToCad ? parseFloat(eurToCad) : null,
          useAutoRates,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Currency settings saved successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        if (data.error?.details) {
          const errors: Record<string, string> = {};
          Object.entries(data.error.details).forEach(([key, value]) => {
            errors[key] = Array.isArray(value) ? value[0] : String(value);
          });
          setValidationErrors(errors);
        } else {
          setError(data.error?.message || 'Failed to save currency settings');
        }
      }
    } catch {
      setError('Failed to save currency settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/billing">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Accounting
          </Button>
        </Link>
      </div>

      <Header
        title="Currency Settings"
        description="Configure currencies and exchange rates for your business"
      />

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg bg-green-50 text-green-600 p-4 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Base Currency */}
          <div className="bg-card rounded-xl border p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Base Currency</h2>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Primary Business Currency
              </label>
              <select
                value={baseCurrency}
                onChange={(e) => {
                  const newBase = e.target.value;
                  setBaseCurrency(newBase);
                  if (!enabledCurrencies.includes(newBase)) {
                    setEnabledCurrencies([...enabledCurrencies, newBase]);
                  }
                }}
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
              >
                {currencies.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name} ({c.symbol})
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                All amounts will be stored and reported in this currency
              </p>
            </div>
          </div>

          {/* Enabled Currencies */}
          <div className="bg-card rounded-xl border p-6 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Enabled Currencies</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Select which currencies you accept for payments and invoicing.
            </p>

            <div className="space-y-3">
              {currencies.map((currency) => (
                <div
                  key={currency.code}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    enabledCurrencies.includes(currency.code)
                      ? 'border-primary bg-primary/5'
                      : 'border-input'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{currency.symbol}</span>
                    <div>
                      <p className="font-medium">{currency.code}</p>
                      <p className="text-sm text-muted-foreground">{currency.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {currency.code === baseCurrency && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                        Base
                      </span>
                    )}
                    <input
                      type="checkbox"
                      checked={enabledCurrencies.includes(currency.code)}
                      onChange={() => toggleCurrency(currency.code)}
                      disabled={currency.code === baseCurrency}
                      className="rounded border-input h-5 w-5"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Exchange Rates */}
          <div className="bg-card rounded-xl border p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Exchange Rates</h2>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshRates}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Refresh from BoC
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="autoRates"
                checked={useAutoRates}
                onChange={(e) => setUseAutoRates(e.target.checked)}
                className="rounded border-input"
              />
              <div>
                <label htmlFor="autoRates" className="font-medium cursor-pointer">
                  Use automatic exchange rates
                </label>
                <p className="text-sm text-muted-foreground">
                  Fetch live rates from Bank of Canada daily
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  USD to CAD Rate
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={usdToCad}
                  onChange={(e) => setUsdToCad(e.target.value)}
                  placeholder="1.3500"
                  disabled={useAutoRates}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 disabled:bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  1 USD = {usdToCad || '1.35'} CAD
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  EUR to CAD Rate
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={eurToCad}
                  onChange={(e) => setEurToCad(e.target.value)}
                  placeholder="1.4500"
                  disabled={useAutoRates}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 disabled:bg-muted"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  1 EUR = {eurToCad || '1.45'} CAD
                </p>
              </div>
            </div>

            {currentRates && (
              <div className="bg-muted/50 rounded-lg p-4 text-sm">
                <p className="font-medium mb-2">Current Rates</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>USD/CAD: {currentRates.rates.USD.toFixed(4)}</div>
                  <div>EUR/CAD: {currentRates.rates.EUR.toFixed(4)}</div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Source: {currentRates.source === 'auto' ? 'Bank of Canada' : 'Manual'} |
                  Updated: {new Date(currentRates.lastUpdated).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Currency Settings
            </Button>
          </div>
        </div>

        {/* Info Panel */}
        <div className="space-y-6">
          <div className="bg-blue-50 rounded-xl p-6 space-y-3">
            <h3 className="font-medium text-blue-900">Multi-Currency Support</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>- Accept payments in multiple currencies</li>
              <li>- Automatic conversion to base currency</li>
              <li>- Exchange rate recorded on each transaction</li>
              <li>- Reports always in base currency</li>
            </ul>
          </div>

          <div className="bg-amber-50 rounded-xl p-6 space-y-3">
            <h3 className="font-medium text-amber-900">Exchange Rate Notes</h3>
            <ul className="text-sm text-amber-800 space-y-2">
              <li>- Rates are indicative only</li>
              <li>- Bank of Canada rates updated daily</li>
              <li>- Manual rates recommended for consistent pricing</li>
              <li>- Historical rates preserved on transactions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
