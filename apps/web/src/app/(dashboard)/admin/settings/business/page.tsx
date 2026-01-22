'use client';

import { useState, useEffect } from 'react';
import {
  Building2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Phone,
  Mail,
  FileText,
  Save,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';

interface Province {
  province: string;
  provinceName: string;
}

interface BusinessInfo {
  id: string;
  legalName: string;
  businessNumber: string | null;
  corporationNumber: string | null;
  businessType: string;
  streetAddress: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  businessPhone: string | null;
  businessEmail: string | null;
  provincialRegistrations: Record<string, string> | null;
}

interface BusinessType {
  value: string;
  label: string;
}

export default function BusinessInfoPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [businessTypes, setBusinessTypes] = useState<BusinessType[]>([]);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Form state
  const [legalName, setLegalName] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [corporationNumber, setCorporationNumber] = useState('');
  const [businessType, setBusinessType] = useState('CORPORATION');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [province, setProvince] = useState('ON');
  const [postalCode, setPostalCode] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');

  useEffect(() => {
    fetchBusinessInfo();
  }, []);

  const fetchBusinessInfo = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/admin/settings/business');
      const data = await response.json();

      if (data.success) {
        setProvinces(data.data.provinces);
        setBusinessTypes(data.data.businessTypes);
        if (data.data.info) {
          const info = data.data.info as BusinessInfo;
          setLegalName(info.legalName);
          setBusinessNumber(info.businessNumber || '');
          setCorporationNumber(info.corporationNumber || '');
          setBusinessType(info.businessType);
          setStreetAddress(info.streetAddress);
          setCity(info.city);
          setProvince(info.province);
          setPostalCode(info.postalCode);
          setBusinessPhone(info.businessPhone || '');
          setBusinessEmail(info.businessEmail || '');
        }
      } else {
        setError(data.error?.message || 'Failed to load business information');
      }
    } catch {
      setError('Failed to load business information');
    } finally {
      setIsLoading(false);
    }
  };

  const formatPostalCode = (value: string) => {
    // Remove all non-alphanumeric characters
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    // Format as A1A 1A1
    if (cleaned.length <= 3) return cleaned;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)}`;
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      setValidationErrors({});

      const response = await fetch('/api/admin/settings/business', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          legalName,
          businessNumber: businessNumber || null,
          corporationNumber: corporationNumber || null,
          businessType,
          streetAddress,
          city,
          province,
          postalCode,
          country: 'CA',
          businessPhone: businessPhone || null,
          businessEmail: businessEmail || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Business information saved successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        if (data.error?.details) {
          const errors: Record<string, string> = {};
          Object.entries(data.error.details).forEach(([key, value]) => {
            errors[key] = Array.isArray(value) ? value[0] : String(value);
          });
          setValidationErrors(errors);
        } else {
          setError(data.error?.message || 'Failed to save business information');
        }
      }
    } catch {
      setError('Failed to save business information');
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
        title="Business Information"
        description="Legal business details for invoices and tax filings"
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
          {/* Legal Entity */}
          <div className="bg-card rounded-xl border p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Legal Entity</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Legal Business Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="Your Business Inc."
                  className={`w-full rounded-lg border px-3 py-2 ${
                    validationErrors.legalName ? 'border-destructive' : 'border-input'
                  } bg-background`}
                />
                {validationErrors.legalName && (
                  <p className="text-sm text-destructive mt-1">{validationErrors.legalName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Business Type <span className="text-destructive">*</span>
                </label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2"
                >
                  {businessTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  CRA Business Number
                </label>
                <input
                  type="text"
                  value={businessNumber}
                  onChange={(e) => setBusinessNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                  placeholder="123456789"
                  className={`w-full rounded-lg border px-3 py-2 ${
                    validationErrors.businessNumber ? 'border-destructive' : 'border-input'
                  } bg-background`}
                />
                {validationErrors.businessNumber && (
                  <p className="text-sm text-destructive mt-1">{validationErrors.businessNumber}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">9-digit CRA Business Number</p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Corporation Number
                </label>
                <input
                  type="text"
                  value={corporationNumber}
                  onChange={(e) => setCorporationNumber(e.target.value)}
                  placeholder="Federal or Provincial corp number"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* Registered Address */}
          <div className="bg-card rounded-xl border p-6 space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Registered Address</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              This address will appear on all invoices and official documents.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2">
                  Street Address <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={streetAddress}
                  onChange={(e) => setStreetAddress(e.target.value)}
                  placeholder="123 Business Street, Suite 100"
                  className={`w-full rounded-lg border px-3 py-2 ${
                    validationErrors.streetAddress ? 'border-destructive' : 'border-input'
                  } bg-background`}
                />
                {validationErrors.streetAddress && (
                  <p className="text-sm text-destructive mt-1">{validationErrors.streetAddress}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  City <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Toronto"
                  className={`w-full rounded-lg border px-3 py-2 ${
                    validationErrors.city ? 'border-destructive' : 'border-input'
                  } bg-background`}
                />
                {validationErrors.city && (
                  <p className="text-sm text-destructive mt-1">{validationErrors.city}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Province <span className="text-destructive">*</span>
                </label>
                <select
                  value={province}
                  onChange={(e) => setProvince(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2"
                >
                  {provinces.map((p) => (
                    <option key={p.province} value={p.province}>
                      {p.provinceName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Postal Code <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(formatPostalCode(e.target.value))}
                  placeholder="A1A 1A1"
                  maxLength={7}
                  className={`w-full rounded-lg border px-3 py-2 ${
                    validationErrors.postalCode ? 'border-destructive' : 'border-input'
                  } bg-background`}
                />
                {validationErrors.postalCode && (
                  <p className="text-sm text-destructive mt-1">{validationErrors.postalCode}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Country</label>
                <input
                  type="text"
                  value="Canada"
                  disabled
                  className="w-full rounded-lg border border-input bg-muted px-3 py-2"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-card rounded-xl border p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Phone className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Business Contact</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Business Phone</label>
                <input
                  type="tel"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  placeholder="(416) 555-1234"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Business Email</label>
                <input
                  type="email"
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  placeholder="accounting@yourbusiness.com"
                  className={`w-full rounded-lg border px-3 py-2 ${
                    validationErrors.businessEmail ? 'border-destructive' : 'border-input'
                  } bg-background`}
                />
                {validationErrors.businessEmail && (
                  <p className="text-sm text-destructive mt-1">{validationErrors.businessEmail}</p>
                )}
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
              Save Business Information
            </Button>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border p-6 space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Invoice Preview</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              This is how your business info will appear on invoices.
            </p>

            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
              <p className="font-semibold">{legalName || 'Your Business Name'}</p>
              <p className="text-muted-foreground">{streetAddress || '123 Business Street'}</p>
              <p className="text-muted-foreground">
                {city || 'City'}, {provinces.find((p) => p.province === province)?.provinceName || province} {postalCode || 'A1A 1A1'}
              </p>
              {businessPhone && (
                <p className="text-muted-foreground pt-2">{businessPhone}</p>
              )}
              {businessEmail && (
                <p className="text-muted-foreground">{businessEmail}</p>
              )}
              {businessNumber && (
                <p className="text-muted-foreground pt-2">BN: {businessNumber}</p>
              )}
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-6 space-y-3">
            <h3 className="font-medium text-blue-900">Required for Invoices</h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-center gap-2">
                {legalName ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                )}
                Legal business name
              </li>
              <li className="flex items-center gap-2">
                {streetAddress && city && postalCode ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                )}
                Complete address
              </li>
              <li className="flex items-center gap-2">
                {businessNumber ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                )}
                Business number (recommended)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
