'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Loader2,
  AlertCircle,
  Calendar,
  TrendingUp,
  TrendingDown,
  Receipt,
  ArrowLeft,
  DollarSign,
  Building2,
} from 'lucide-react';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { ExportButton } from '@/components/ui/export-button';
import { type ExportColumn } from '@/lib/export';

interface TaxReport {
  period: { start: string; end: string };
  gstCollected: number;
  pstCollected: number;
  hstCollected: number;
  qstCollected: number;
  totalCollected: number;
  gstItc: number;
  hstItc: number;
  qstItc: number;
  totalItc: number;
  netGstHst: number;
  netQst: number;
  totalOwing: number;
  invoiceCount: number;
  expenseCount: number;
}

interface TaxConfig {
  province: string;
  taxType: string;
  gstHstNumber: string | null;
  qstNumber: string | null;
  isSmallSupplier: boolean;
}

interface BusinessInfo {
  legalName: string;
  businessNumber: string | null;
}

export default function TaxReportPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<TaxReport | null>(null);
  const [taxConfig, setTaxConfig] = useState<TaxConfig | null>(null);
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);

  // Date filters
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    return quarterStart.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    const quarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 + 3, 0);
    return quarterEnd.toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchTaxReport();
  }, []);

  const fetchTaxReport = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams({ startDate, endDate });
      const response = await fetch(`/api/admin/reports/tax?${params}`);
      const data = await response.json();

      if (data.success) {
        setReport(data.data.report);
        setTaxConfig(data.data.taxConfig);
        setBusinessInfo(data.data.businessInfo);
      } else {
        setError(data.error?.message || 'Failed to load tax report');
      }
    } catch {
      setError('Failed to load tax report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = () => {
    fetchTaxReport();
  };

  const setQuickPeriod = (period: 'q1' | 'q2' | 'q3' | 'q4' | 'year' | 'last-year') => {
    const now = new Date();
    const year = now.getFullYear();
    let start: Date;
    let end: Date;

    switch (period) {
      case 'q1':
        start = new Date(year, 0, 1);
        end = new Date(year, 2, 31);
        break;
      case 'q2':
        start = new Date(year, 3, 1);
        end = new Date(year, 5, 30);
        break;
      case 'q3':
        start = new Date(year, 6, 1);
        end = new Date(year, 8, 30);
        break;
      case 'q4':
        start = new Date(year, 9, 1);
        end = new Date(year, 11, 31);
        break;
      case 'year':
        start = new Date(year, 0, 1);
        end = new Date(year, 11, 31);
        break;
      case 'last-year':
        start = new Date(year - 1, 0, 1);
        end = new Date(year - 1, 11, 31);
        break;
    }

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  const taxReportRows = report ? [
    { category: 'Taxes Collected', item: 'GST Collected', amount: report.gstCollected },
    { category: 'Taxes Collected', item: 'PST Collected', amount: report.pstCollected },
    { category: 'Taxes Collected', item: 'HST Collected', amount: report.hstCollected },
    { category: 'Taxes Collected', item: 'QST Collected', amount: report.qstCollected },
    { category: 'Taxes Collected', item: 'Total Collected', amount: report.totalCollected },
    { category: 'Input Tax Credits', item: 'GST ITC', amount: report.gstItc },
    { category: 'Input Tax Credits', item: 'HST ITC', amount: report.hstItc },
    { category: 'Input Tax Credits', item: 'QST ITC', amount: report.qstItc },
    { category: 'Input Tax Credits', item: 'Total ITCs', amount: report.totalItc },
    { category: 'Net Amounts', item: 'Net GST/HST Owing', amount: report.netGstHst },
    { category: 'Net Amounts', item: 'Net QST Owing', amount: report.netQst },
    { category: 'Net Amounts', item: 'Total Tax Owing', amount: report.totalOwing },
  ] : [];

  const taxExportColumns: ExportColumn[] = [
    { header: 'Category', accessor: (r) => r.category },
    { header: 'Item', accessor: (r) => r.item },
    { header: 'Amount', accessor: (r) => `$${r.amount.toFixed(2)}`, align: 'right' },
  ];

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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Header
          title="Tax Report"
          description="GST/HST/PST/QST summary for CRA filing"
        />
        <ExportButton
          data={taxReportRows}
          columns={taxExportColumns}
          filename={`tax-report-${startDate}-to-${endDate}`}
          pdfTitle="Tax Report"
          pdfSummary={report ? [
            { label: 'Period', value: `${startDate} to ${endDate}` },
            { label: 'Total Tax Owing', value: `$${report.totalOwing.toFixed(2)}` },
          ] : undefined}
        />
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          {error}
        </div>
      )}

      {!taxConfig && (
        <div className="rounded-lg bg-amber-50 text-amber-800 p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Tax configuration not set up.{' '}
          <Link href="/admin/settings/tax" className="underline font-medium">
            Configure now
          </Link>
        </div>
      )}

      {/* Business & Tax Info */}
      {(businessInfo || taxConfig) && (
        <div className="bg-card rounded-xl border p-4 flex flex-col sm:flex-row gap-4 sm:gap-8">
          {businessInfo && (
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{businessInfo.legalName}</span>
              {businessInfo.businessNumber && (
                <span className="text-muted-foreground text-sm">
                  BN: {businessInfo.businessNumber}
                </span>
              )}
            </div>
          )}
          {taxConfig?.gstHstNumber && (
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">GST/HST: {taxConfig.gstHstNumber}</span>
            </div>
          )}
          {taxConfig?.qstNumber && (
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">QST: {taxConfig.qstNumber}</span>
            </div>
          )}
        </div>
      )}

      {/* Date Selection */}
      <div className="bg-card rounded-xl border p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Report Period</h2>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setQuickPeriod('q1')}>
            Q1
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuickPeriod('q2')}>
            Q2
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuickPeriod('q3')}>
            Q3
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuickPeriod('q4')}>
            Q4
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuickPeriod('year')}>
            This Year
          </Button>
          <Button variant="outline" size="sm" onClick={() => setQuickPeriod('last-year')}>
            Last Year
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2"
            />
          </div>
          <Button onClick={handleDateChange}>Generate Report</Button>
        </div>
      </div>

      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl border p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Tax Collected</div>
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div className="text-2xl font-bold mt-2 text-green-600">
                ${report.totalCollected.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {report.invoiceCount} invoices
              </div>
            </div>

            <div className="bg-card rounded-xl border p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Input Tax Credits</div>
                <TrendingDown className="h-5 w-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold mt-2 text-blue-600">
                ${report.totalItc.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {report.expenseCount} expenses
              </div>
            </div>

            <div className="bg-card rounded-xl border p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Net GST/HST</div>
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div className={`text-2xl font-bold mt-2 ${report.netGstHst >= 0 ? 'text-destructive' : 'text-green-600'}`}>
                ${Math.abs(report.netGstHst).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {report.netGstHst >= 0 ? 'Owing to CRA' : 'Refund expected'}
              </div>
            </div>

            <div className="bg-card rounded-xl border p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">Total Tax Due</div>
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className={`text-2xl font-bold mt-2 ${report.totalOwing >= 0 ? 'text-destructive' : 'text-green-600'}`}>
                ${Math.abs(report.totalOwing).toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {report.totalOwing >= 0 ? 'Payment required' : 'Refund expected'}
              </div>
            </div>
          </div>

          {/* Detailed Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Taxes Collected */}
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                <h2 className="font-semibold">Taxes Collected</h2>
              </div>

              <div className="space-y-3">
                {report.gstCollected > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">GST (5%)</span>
                    <span className="font-medium">${report.gstCollected.toFixed(2)}</span>
                  </div>
                )}
                {report.pstCollected > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">PST</span>
                    <span className="font-medium">${report.pstCollected.toFixed(2)}</span>
                  </div>
                )}
                {report.hstCollected > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">HST</span>
                    <span className="font-medium">${report.hstCollected.toFixed(2)}</span>
                  </div>
                )}
                {report.qstCollected > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">QST (9.975%)</span>
                    <span className="font-medium">${report.qstCollected.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t font-semibold">
                  <span>Total Collected</span>
                  <span className="text-green-600">${report.totalCollected.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Input Tax Credits */}
            <div className="bg-card rounded-xl border p-6 space-y-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-blue-500" />
                <h2 className="font-semibold">Input Tax Credits (ITCs)</h2>
              </div>

              <div className="space-y-3">
                {(report.gstItc > 0 || report.hstItc === 0) && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">GST ITCs</span>
                    <span className="font-medium">${report.gstItc.toFixed(2)}</span>
                  </div>
                )}
                {report.hstItc > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">HST ITCs</span>
                    <span className="font-medium">${report.hstItc.toFixed(2)}</span>
                  </div>
                )}
                {report.qstItc > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">QST ITCs</span>
                    <span className="font-medium">${report.qstItc.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t font-semibold">
                  <span>Total ITCs</span>
                  <span className="text-blue-600">${report.totalItc.toFixed(2)}</span>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                Note: PST is not recoverable as an ITC (${report.pstCollected.toFixed(2)} paid)
              </div>
            </div>
          </div>

          {/* Filing Summary */}
          <div className="bg-card rounded-xl border p-6 space-y-4">
            <h2 className="font-semibold">Filing Summary</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  GST/HST Return (CRA)
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Line 101 - GST/HST collected</span>
                    <span>${(report.gstCollected + report.hstCollected).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Line 106 - ITCs</span>
                    <span>${(report.gstItc + report.hstItc).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-2 border-t">
                    <span>Line 109 - Net Tax</span>
                    <span className={report.netGstHst >= 0 ? 'text-destructive' : 'text-green-600'}>
                      ${report.netGstHst.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {report.qstCollected > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    QST Return (Revenu Quebec)
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>QST collected</span>
                      <span>${report.qstCollected.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>QST ITCs</span>
                      <span>${report.qstItc.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-2 border-t">
                      <span>Net QST</span>
                      <span className={report.netQst >= 0 ? 'text-destructive' : 'text-green-600'}>
                        ${report.netQst.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
