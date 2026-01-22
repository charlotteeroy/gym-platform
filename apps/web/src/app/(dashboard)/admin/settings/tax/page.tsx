'use client';

import { useState, useEffect } from 'react';
import {
  Receipt,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  MapPin,
  Calculator,
  Save,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';

interface TaxRates {
  province: string;
  provinceName: string;
  taxType: string;
  gstRate: number;
  pstRate: number;
  hstRate: number;
  qstRate: number;
  totalRate: number;
}

interface TaxConfig {
  id: string;
  province: string;
  taxType: string;
  gstRate: string;
  pstRate: string;
  hstRate: string;
  qstRate: string;
  gstHstNumber: string | null;
  pstNumber: string | null;
  qstNumber: string | null;
  isSmallSupplier: boolean;
}

export default function TaxSettingsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [provinces, setProvinces] = useState<TaxRates[]>([]);
  const [config, setConfig] = useState<TaxConfig | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Form state
  const [selectedProvince, setSelectedProvince] = useState('ON');
  const [gstHstNumber, setGstHstNumber] = useState('');
  const [pstNumber, setPstNumber] = useState('');
  const [qstNumber, setQstNumber] = useState('');
  const [isSmallSupplier, setIsSmallSupplier] = useState(false);

  useEffect(() => {
    fetchTaxConfig();
  }, []);

  const fetchTaxConfig = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/admin/settings/tax');
      const data = await response.json();

      if (data.success) {
        setProvinces(data.data.provinces);
        if (data.data.config) {
          setConfig(data.data.config);
          setSelectedProvince(data.data.config.province);
          setGstHstNumber(data.data.config.gstHstNumber || '');
          setPstNumber(data.data.config.pstNumber || '');
          setQstNumber(data.data.config.qstNumber || '');
          setIsSmallSupplier(data.data.config.isSmallSupplier);
        }
      } else {
        setError(data.error?.message || 'Failed to load tax configuration');
      }
    } catch {
      setError('Failed to load tax configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const validateGstHstNumber = async (number: string) => {
    if (!number) return;
    try {
      const response = await fetch('/api/admin/settings/tax/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'gst_hst', number }),
      });
      const data = await response.json();
      if (data.success && !data.data.valid) {
        setValidationErrors((prev) => ({ ...prev, gstHstNumber: data.data.error }));
      } else {
        setValidationErrors((prev) => {
          const { gstHstNumber: _, ...rest } = prev;
          return rest;
        });
      }
    } catch {
      // Ignore validation errors
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch('/api/admin/settings/tax', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          province: selectedProvince,
          gstHstNumber: gstHstNumber || null,
          pstNumber: pstNumber || null,
          qstNumber: qstNumber || null,
          isSmallSupplier,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setConfig(data.data);
        setSuccess('Tax configuration saved successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        if (data.error?.details) {
          const errors: Record<string, string> = {};
          Object.entries(data.error.details).forEach(([key, value]) => {
            errors[key] = Array.isArray(value) ? value[0] : String(value);
          });
          setValidationErrors(errors);
        } else {
          setError(data.error?.message || 'Failed to save tax configuration');
        }
      }
    } catch {
      setError('Failed to save tax configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const selectedProvinceData = provinces.find((p) => p.province === selectedProvince);

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
        title="Tax Configuration"
        description="Configure Canadian tax settings for your business"
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
        {/* Province Selection */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card rounded-xl border p-6 space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Province/Territory</h2>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Business Location
              </label>
              <select
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="w-full rounded-lg border border-input bg-background px-3 py-2"
              >
                {provinces.map((p) => (
                  <option key={p.province} value={p.province}>
                    {p.provinceName} ({p.taxType.replace('_', ' + ')})
                  </option>
                ))}
              </select>
            </div>

            {selectedProvinceData && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h3 className="text-sm font-medium mb-2">Tax Rates for {selectedProvinceData.provinceName}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {selectedProvinceData.taxType === 'HST' && (
                    <div>
                      <span className="text-muted-foreground">HST:</span>{' '}
                      <span className="font-medium">{(selectedProvinceData.hstRate * 100).toFixed(0)}%</span>
                    </div>
                  )}
                  {selectedProvinceData.taxType === 'GST_PST' && (
                    <>
                      <div>
                        <span className="text-muted-foreground">GST:</span>{' '}
                        <span className="font-medium">{(selectedProvinceData.gstRate * 100).toFixed(0)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">PST:</span>{' '}
                        <span className="font-medium">{(selectedProvinceData.pstRate * 100).toFixed(0)}%</span>
                      </div>
                    </>
                  )}
                  {selectedProvinceData.taxType === 'GST_QST' && (
                    <>
                      <div>
                        <span className="text-muted-foreground">GST:</span>{' '}
                        <span className="font-medium">{(selectedProvinceData.gstRate * 100).toFixed(0)}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">QST:</span>{' '}
                        <span className="font-medium">{(selectedProvinceData.qstRate * 100).toFixed(3)}%</span>
                      </div>
                    </>
                  )}
                  {selectedProvinceData.taxType === 'GST_ONLY' && (
                    <div>
                      <span className="text-muted-foreground">GST:</span>{' '}
                      <span className="font-medium">{(selectedProvinceData.gstRate * 100).toFixed(0)}%</span>
                    </div>
                  )}
                  <div className="col-span-2 pt-2 border-t">
                    <span className="text-muted-foreground">Total Tax Rate:</span>{' '}
                    <span className="font-semibold text-primary">
                      {(selectedProvinceData.totalRate * 100).toFixed(selectedProvinceData.taxType === 'GST_QST' ? 3 : 0)}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tax Registration Numbers */}
          <div className="bg-card rounded-xl border p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Tax Registration Numbers</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  GST/HST Registration Number
                </label>
                <input
                  type="text"
                  value={gstHstNumber}
                  onChange={(e) => setGstHstNumber(e.target.value.toUpperCase())}
                  onBlur={() => validateGstHstNumber(gstHstNumber)}
                  placeholder="123456789RT0001"
                  className={`w-full rounded-lg border px-3 py-2 ${
                    validationErrors.gstHstNumber ? 'border-destructive' : 'border-input'
                  } bg-background`}
                />
                {validationErrors.gstHstNumber && (
                  <p className="text-sm text-destructive mt-1">{validationErrors.gstHstNumber}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Format: 9 digits + RT + 4 digits (e.g., 123456789RT0001)
                </p>
              </div>

              {selectedProvinceData?.taxType === 'GST_PST' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    PST Registration Number
                  </label>
                  <input
                    type="text"
                    value={pstNumber}
                    onChange={(e) => setPstNumber(e.target.value)}
                    placeholder="PST-1234-5678"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Provincial Sales Tax number for {selectedProvinceData.provinceName}
                  </p>
                </div>
              )}

              {selectedProvinceData?.taxType === 'GST_QST' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    QST Registration Number
                  </label>
                  <input
                    type="text"
                    value={qstNumber}
                    onChange={(e) => setQstNumber(e.target.value.toUpperCase())}
                    placeholder="1234567890TQ0001"
                    className={`w-full rounded-lg border px-3 py-2 ${
                      validationErrors.qstNumber ? 'border-destructive' : 'border-input'
                    } bg-background`}
                  />
                  {validationErrors.qstNumber && (
                    <p className="text-sm text-destructive mt-1">{validationErrors.qstNumber}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Quebec Sales Tax number (10 digits + TQ + 4 digits)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Small Supplier Status */}
          <div className="bg-card rounded-xl border p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Small Supplier Status</h2>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="smallSupplier"
                checked={isSmallSupplier}
                onChange={(e) => setIsSmallSupplier(e.target.checked)}
                className="mt-1 rounded border-input"
              />
              <div>
                <label htmlFor="smallSupplier" className="font-medium cursor-pointer">
                  I am a small supplier
                </label>
                <p className="text-sm text-muted-foreground mt-1">
                  Small suppliers (under $30,000 annual revenue) are not required to register for or collect GST/HST.
                  If checked, no taxes will be calculated on invoices.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Configuration
            </Button>
          </div>
        </div>

        {/* Tax Preview Calculator */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Tax Calculator Preview</h2>
            </div>

            <TaxPreviewCalculator
              rates={selectedProvinceData}
              isSmallSupplier={isSmallSupplier}
            />
          </div>

          <div className="bg-blue-50 rounded-xl p-6 space-y-3">
            <h3 className="font-medium text-blue-900">Important Notes</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li>- Tax numbers will appear on all invoices</li>
              <li>- PST is not recoverable as an Input Tax Credit</li>
              <li>- Keep records for 6 years for CRA audits</li>
              <li>- File GST/HST returns quarterly or annually</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function TaxPreviewCalculator({
  rates,
  isSmallSupplier,
}: {
  rates?: TaxRates;
  isSmallSupplier: boolean;
}) {
  const [amount, setAmount] = useState(100);

  if (!rates) return null;

  const gst = isSmallSupplier ? 0 : amount * rates.gstRate;
  const pst = isSmallSupplier ? 0 : amount * rates.pstRate;
  const hst = isSmallSupplier ? 0 : amount * rates.hstRate;
  const qst = isSmallSupplier ? 0 : amount * rates.qstRate;
  const total = amount + gst + pst + hst + qst;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Subtotal Amount ($)</label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full rounded-lg border border-input bg-background px-3 py-2"
        />
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>${amount.toFixed(2)}</span>
        </div>
        {rates.taxType === 'HST' && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">HST ({(rates.hstRate * 100).toFixed(0)}%)</span>
            <span>${hst.toFixed(2)}</span>
          </div>
        )}
        {rates.taxType === 'GST_PST' && (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST ({(rates.gstRate * 100).toFixed(0)}%)</span>
              <span>${gst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">PST ({(rates.pstRate * 100).toFixed(0)}%)</span>
              <span>${pst.toFixed(2)}</span>
            </div>
          </>
        )}
        {rates.taxType === 'GST_QST' && (
          <>
            <div className="flex justify-between">
              <span className="text-muted-foreground">GST ({(rates.gstRate * 100).toFixed(0)}%)</span>
              <span>${gst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">QST ({(rates.qstRate * 100).toFixed(3)}%)</span>
              <span>${qst.toFixed(2)}</span>
            </div>
          </>
        )}
        {rates.taxType === 'GST_ONLY' && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">GST ({(rates.gstRate * 100).toFixed(0)}%)</span>
            <span>${gst.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between pt-2 border-t font-semibold">
          <span>Total</span>
          <span className="text-primary">${total.toFixed(2)}</span>
        </div>
      </div>

      {isSmallSupplier && (
        <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
          Small supplier status active - no tax charged
        </div>
      )}
    </div>
  );
}
