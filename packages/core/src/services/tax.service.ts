import { prisma, type TaxConfiguration, type BusinessInfo } from '@gym/database';

// Canadian Tax Structure by Province
export const CANADIAN_PROVINCES = {
  ON: { name: 'Ontario', taxType: 'HST', gst: 0, pst: 0, hst: 0.13, qst: 0 },
  BC: { name: 'British Columbia', taxType: 'GST_PST', gst: 0.05, pst: 0.07, hst: 0, qst: 0 },
  AB: { name: 'Alberta', taxType: 'GST_ONLY', gst: 0.05, pst: 0, hst: 0, qst: 0 },
  QC: { name: 'Quebec', taxType: 'GST_QST', gst: 0.05, pst: 0, hst: 0, qst: 0.09975 },
  NS: { name: 'Nova Scotia', taxType: 'HST', gst: 0, pst: 0, hst: 0.15, qst: 0 },
  NB: { name: 'New Brunswick', taxType: 'HST', gst: 0, pst: 0, hst: 0.15, qst: 0 },
  MB: { name: 'Manitoba', taxType: 'GST_PST', gst: 0.05, pst: 0.07, hst: 0, qst: 0 },
  SK: { name: 'Saskatchewan', taxType: 'GST_PST', gst: 0.05, pst: 0.06, hst: 0, qst: 0 },
  PE: { name: 'Prince Edward Island', taxType: 'HST', gst: 0, pst: 0, hst: 0.15, qst: 0 },
  NL: { name: 'Newfoundland and Labrador', taxType: 'HST', gst: 0, pst: 0, hst: 0.15, qst: 0 },
  NT: { name: 'Northwest Territories', taxType: 'GST_ONLY', gst: 0.05, pst: 0, hst: 0, qst: 0 },
  YT: { name: 'Yukon', taxType: 'GST_ONLY', gst: 0.05, pst: 0, hst: 0, qst: 0 },
  NU: { name: 'Nunavut', taxType: 'GST_ONLY', gst: 0.05, pst: 0, hst: 0, qst: 0 },
} as const;

export type ProvinceCode = keyof typeof CANADIAN_PROVINCES;
export type TaxType = 'HST' | 'GST_PST' | 'GST_QST' | 'GST_ONLY';

export interface TaxRates {
  province: ProvinceCode;
  provinceName: string;
  taxType: TaxType;
  gstRate: number;
  pstRate: number;
  hstRate: number;
  qstRate: number;
  totalRate: number;
}

export interface TaxBreakdown {
  subtotal: number;
  gstAmount: number;
  pstAmount: number;
  hstAmount: number;
  qstAmount: number;
  taxTotal: number;
  total: number;
  taxType: TaxType;
  province: ProvinceCode;
}

export interface TaxReport {
  period: { start: Date; end: Date };
  // Revenue taxes collected
  gstCollected: number;
  pstCollected: number;
  hstCollected: number;
  qstCollected: number;
  totalCollected: number;
  // Input Tax Credits (from expenses)
  gstItc: number;
  hstItc: number;
  qstItc: number;
  totalItc: number;
  // Net amounts owed
  netGstHst: number;
  netQst: number;
  totalOwing: number;
  // Details
  invoiceCount: number;
  expenseCount: number;
}

// Get tax rates by province
export function getTaxRatesByProvince(province: ProvinceCode): TaxRates {
  const config = CANADIAN_PROVINCES[province];
  if (!config) {
    throw new Error(`Unknown province code: ${province}`);
  }

  const totalRate = config.gst + config.pst + config.hst + config.qst;

  return {
    province,
    provinceName: config.name,
    taxType: config.taxType as TaxType,
    gstRate: config.gst,
    pstRate: config.pst,
    hstRate: config.hst,
    qstRate: config.qst,
    totalRate,
  };
}

// Get all provinces with their tax rates
export function getAllProvinces(): TaxRates[] {
  return Object.keys(CANADIAN_PROVINCES).map((code) =>
    getTaxRatesByProvince(code as ProvinceCode)
  );
}

// Validate GST/HST number format (e.g., 123456789RT0001)
export function validateGstHstNumber(number: string): { valid: boolean; error?: string } {
  if (!number) {
    return { valid: false, error: 'GST/HST number is required' };
  }

  const cleanNumber = number.replace(/\s/g, '').toUpperCase();

  // Format: 9 digits + RT + 4 digits
  const gstPattern = /^\d{9}RT\d{4}$/;

  if (!gstPattern.test(cleanNumber)) {
    return {
      valid: false,
      error: 'Invalid format. Expected format: 123456789RT0001'
    };
  }

  // Validate checksum using Luhn algorithm on first 9 digits
  const digits = cleanNumber.substring(0, 9);
  if (!validateLuhn(digits)) {
    return { valid: false, error: 'Invalid GST/HST number checksum' };
  }

  return { valid: true };
}

// Luhn algorithm for checksum validation
function validateLuhn(digits: string): boolean {
  let sum = 0;
  let isEven = false;

  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = parseInt(digits.charAt(i), 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

// Validate QST number format (10 digits followed by TQ0001)
export function validateQstNumber(number: string): { valid: boolean; error?: string } {
  if (!number) {
    return { valid: false, error: 'QST number is required' };
  }

  const cleanNumber = number.replace(/\s/g, '').toUpperCase();
  const qstPattern = /^\d{10}TQ\d{4}$/;

  if (!qstPattern.test(cleanNumber)) {
    return {
      valid: false,
      error: 'Invalid format. Expected format: 1234567890TQ0001'
    };
  }

  return { valid: true };
}

// Get tax configuration for a gym
export async function getTaxConfig(gymId: string): Promise<TaxConfiguration | null> {
  return prisma.taxConfiguration.findUnique({
    where: { gymId },
  });
}

// Create or update tax configuration
export async function upsertTaxConfig(
  gymId: string,
  data: {
    province: ProvinceCode;
    gstHstNumber?: string | null;
    pstNumber?: string | null;
    qstNumber?: string | null;
    isSmallSupplier?: boolean;
  }
): Promise<TaxConfiguration> {
  const rates = getTaxRatesByProvince(data.province);

  return prisma.taxConfiguration.upsert({
    where: { gymId },
    create: {
      gymId,
      province: data.province,
      taxType: rates.taxType,
      gstRate: rates.gstRate,
      pstRate: rates.pstRate,
      hstRate: rates.hstRate,
      qstRate: rates.qstRate,
      gstHstNumber: data.gstHstNumber,
      pstNumber: data.pstNumber,
      qstNumber: data.qstNumber,
      isSmallSupplier: data.isSmallSupplier ?? false,
    },
    update: {
      province: data.province,
      taxType: rates.taxType,
      gstRate: rates.gstRate,
      pstRate: rates.pstRate,
      hstRate: rates.hstRate,
      qstRate: rates.qstRate,
      gstHstNumber: data.gstHstNumber,
      pstNumber: data.pstNumber,
      qstNumber: data.qstNumber,
      isSmallSupplier: data.isSmallSupplier ?? false,
    },
  });
}

// Calculate taxes for an amount
export async function calculateTax(gymId: string, subtotal: number): Promise<TaxBreakdown> {
  const config = await getTaxConfig(gymId);

  // Default to Ontario if no config exists
  const province = (config?.province as ProvinceCode) || 'ON';
  const rates = getTaxRatesByProvince(province);

  // Small suppliers don't charge tax
  if (config?.isSmallSupplier) {
    return {
      subtotal,
      gstAmount: 0,
      pstAmount: 0,
      hstAmount: 0,
      qstAmount: 0,
      taxTotal: 0,
      total: subtotal,
      taxType: rates.taxType,
      province,
    };
  }

  const gstAmount = subtotal * rates.gstRate;
  const pstAmount = subtotal * rates.pstRate;
  const hstAmount = subtotal * rates.hstRate;
  // QST is calculated on subtotal (not on subtotal + GST in most cases)
  const qstAmount = subtotal * rates.qstRate;

  const taxTotal = gstAmount + pstAmount + hstAmount + qstAmount;

  return {
    subtotal,
    gstAmount: Math.round(gstAmount * 100) / 100,
    pstAmount: Math.round(pstAmount * 100) / 100,
    hstAmount: Math.round(hstAmount * 100) / 100,
    qstAmount: Math.round(qstAmount * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    total: Math.round((subtotal + taxTotal) * 100) / 100,
    taxType: rates.taxType,
    province,
  };
}

// Calculate tax using stored rates from config
export function calculateTaxFromConfig(
  subtotal: number,
  config: TaxConfiguration
): TaxBreakdown {
  if (config.isSmallSupplier) {
    return {
      subtotal,
      gstAmount: 0,
      pstAmount: 0,
      hstAmount: 0,
      qstAmount: 0,
      taxTotal: 0,
      total: subtotal,
      taxType: config.taxType as TaxType,
      province: config.province as ProvinceCode,
    };
  }

  const gstAmount = subtotal * Number(config.gstRate);
  const pstAmount = subtotal * Number(config.pstRate);
  const hstAmount = subtotal * Number(config.hstRate);
  const qstAmount = subtotal * Number(config.qstRate);
  const taxTotal = gstAmount + pstAmount + hstAmount + qstAmount;

  return {
    subtotal,
    gstAmount: Math.round(gstAmount * 100) / 100,
    pstAmount: Math.round(pstAmount * 100) / 100,
    hstAmount: Math.round(hstAmount * 100) / 100,
    qstAmount: Math.round(qstAmount * 100) / 100,
    taxTotal: Math.round(taxTotal * 100) / 100,
    total: Math.round((subtotal + taxTotal) * 100) / 100,
    taxType: config.taxType as TaxType,
    province: config.province as ProvinceCode,
  };
}

// Generate tax summary report
export async function generateTaxReport(
  gymId: string,
  startDate: Date,
  endDate: Date
): Promise<TaxReport> {
  // Get all invoices in the period
  const invoices = await prisma.invoice.findMany({
    where: {
      gymId,
      createdAt: { gte: startDate, lte: endDate },
      status: { in: ['PAID', 'SENT'] },
    },
  });

  // Get all expenses in the period
  const expenses = await prisma.expense.findMany({
    where: {
      gymId,
      date: { gte: startDate, lte: endDate },
    },
  });

  // Calculate collected taxes from invoices
  const gstCollected = invoices.reduce((sum, inv) => sum + Number(inv.gstAmount || 0), 0);
  const pstCollected = invoices.reduce((sum, inv) => sum + Number(inv.pstAmount || 0), 0);
  const hstCollected = invoices.reduce((sum, inv) => sum + Number(inv.hstAmount || 0), 0);
  const qstCollected = invoices.reduce((sum, inv) => sum + Number(inv.qstAmount || 0), 0);
  const totalCollected = gstCollected + pstCollected + hstCollected + qstCollected;

  // Calculate Input Tax Credits from expenses
  const gstItc = expenses.reduce((sum, exp) => sum + Number(exp.gstItc || 0), 0);
  const hstItc = expenses.reduce((sum, exp) => sum + Number(exp.hstItc || 0), 0);
  const qstItc = expenses.reduce((sum, exp) => sum + Number(exp.qstItc || 0), 0);
  const totalItc = gstItc + hstItc + qstItc;

  // Calculate net amounts owed (collected - ITCs)
  // GST and HST are reported together to CRA
  const netGstHst = (gstCollected + hstCollected) - (gstItc + hstItc);
  // QST is reported separately to Revenu Quebec
  const netQst = qstCollected - qstItc;

  return {
    period: { start: startDate, end: endDate },
    gstCollected: Math.round(gstCollected * 100) / 100,
    pstCollected: Math.round(pstCollected * 100) / 100,
    hstCollected: Math.round(hstCollected * 100) / 100,
    qstCollected: Math.round(qstCollected * 100) / 100,
    totalCollected: Math.round(totalCollected * 100) / 100,
    gstItc: Math.round(gstItc * 100) / 100,
    hstItc: Math.round(hstItc * 100) / 100,
    qstItc: Math.round(qstItc * 100) / 100,
    totalItc: Math.round(totalItc * 100) / 100,
    netGstHst: Math.round(netGstHst * 100) / 100,
    netQst: Math.round(netQst * 100) / 100,
    totalOwing: Math.round((netGstHst + netQst) * 100) / 100,
    invoiceCount: invoices.length,
    expenseCount: expenses.length,
  };
}

// Get business info for a gym
export async function getBusinessInfo(gymId: string): Promise<BusinessInfo | null> {
  return prisma.businessInfo.findUnique({
    where: { gymId },
  });
}

// Create or update business info
export async function upsertBusinessInfo(
  gymId: string,
  data: {
    legalName: string;
    businessNumber?: string | null;
    corporationNumber?: string | null;
    businessType: string;
    streetAddress: string;
    city: string;
    province: string;
    postalCode: string;
    country?: string;
    businessPhone?: string | null;
    businessEmail?: string | null;
    provincialRegistrations?: Record<string, string> | null;
  }
): Promise<BusinessInfo> {
  const commonData = {
    legalName: data.legalName,
    businessNumber: data.businessNumber,
    corporationNumber: data.corporationNumber,
    businessType: data.businessType,
    streetAddress: data.streetAddress,
    city: data.city,
    province: data.province,
    postalCode: data.postalCode,
    country: data.country || 'CA',
    businessPhone: data.businessPhone,
    businessEmail: data.businessEmail,
    provincialRegistrations: data.provincialRegistrations ?? undefined,
  };

  return prisma.businessInfo.upsert({
    where: { gymId },
    create: {
      gymId,
      ...commonData,
    },
    update: commonData,
  });
}

// Format tax number for display (add spaces)
export function formatGstHstNumber(number: string): string {
  const clean = number.replace(/\s/g, '').toUpperCase();
  if (clean.length !== 15) return number;
  // Format: 123 456 789 RT 0001
  return `${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 9)} ${clean.slice(9, 11)} ${clean.slice(11)}`;
}

// Get combined tax and business info for invoice display
export async function getInvoiceTaxInfo(gymId: string): Promise<{
  taxConfig: TaxConfiguration | null;
  businessInfo: BusinessInfo | null;
}> {
  const [taxConfig, businessInfo] = await Promise.all([
    getTaxConfig(gymId),
    getBusinessInfo(gymId),
  ]);

  return { taxConfig, businessInfo };
}
