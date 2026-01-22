import { prisma, type CurrencySettings } from '@gym/database';

// Supported currencies
export const SUPPORTED_CURRENCIES = {
  CAD: { code: 'CAD', name: 'Canadian Dollar', symbol: '$', locale: 'en-CA' },
  USD: { code: 'USD', name: 'US Dollar', symbol: '$', locale: 'en-US' },
  EUR: { code: 'EUR', name: 'Euro', symbol: '\u20AC', locale: 'fr-FR' },
} as const;

export type CurrencyCode = keyof typeof SUPPORTED_CURRENCIES;

export interface ExchangeRates {
  baseCurrency: CurrencyCode;
  rates: {
    USD: number;
    EUR: number;
    CAD: number;
  };
  lastUpdated: Date;
  source: 'manual' | 'auto';
}

export interface CurrencyConversion {
  fromAmount: number;
  fromCurrency: CurrencyCode;
  toAmount: number;
  toCurrency: CurrencyCode;
  rate: number;
  timestamp: Date;
}

// Bank of Canada Valet API for exchange rates
const BOC_API_URL = 'https://www.bankofcanada.ca/valet/observations/FXUSDCAD,FXEURCAD/json';

// Get currency settings for a gym
export async function getCurrencySettings(gymId: string): Promise<CurrencySettings | null> {
  return prisma.currencySettings.findUnique({
    where: { gymId },
  });
}

// Create or update currency settings
export async function upsertCurrencySettings(
  gymId: string,
  data: {
    baseCurrency?: CurrencyCode;
    enabledCurrencies?: CurrencyCode[];
    usdToCad?: number | null;
    eurToCad?: number | null;
    useAutoRates?: boolean;
  }
): Promise<CurrencySettings> {
  return prisma.currencySettings.upsert({
    where: { gymId },
    create: {
      gymId,
      baseCurrency: data.baseCurrency || 'CAD',
      enabledCurrencies: data.enabledCurrencies || ['CAD'],
      usdToCad: data.usdToCad ?? null,
      eurToCad: data.eurToCad ?? null,
      useAutoRates: data.useAutoRates ?? false,
    },
    update: {
      baseCurrency: data.baseCurrency,
      enabledCurrencies: data.enabledCurrencies,
      usdToCad: data.usdToCad !== undefined ? (data.usdToCad ?? null) : undefined,
      eurToCad: data.eurToCad !== undefined ? (data.eurToCad ?? null) : undefined,
      useAutoRates: data.useAutoRates,
    },
  });
}

// Fetch live exchange rates from Bank of Canada
export async function fetchLiveRates(): Promise<ExchangeRates | null> {
  try {
    // Get last 5 days of data to ensure we have recent rates
    const today = new Date();
    const fiveDaysAgo = new Date(today);
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const startDate = fiveDaysAgo.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    const url = `${BOC_API_URL}?start_date=${startDate}&end_date=${endDate}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error('Failed to fetch Bank of Canada rates:', response.status);
      return null;
    }

    const data = await response.json();
    const observations = data.observations;

    if (!observations || observations.length === 0) {
      console.error('No observations returned from Bank of Canada');
      return null;
    }

    // Get the most recent observation
    const latest = observations[observations.length - 1];

    const usdToCad = parseFloat(latest.FXUSDCAD?.v) || 1.35;
    const eurToCad = parseFloat(latest.FXEURCAD?.v) || 1.45;

    return {
      baseCurrency: 'CAD',
      rates: {
        CAD: 1,
        USD: usdToCad,  // How many CAD per 1 USD
        EUR: eurToCad,  // How many CAD per 1 EUR
      },
      lastUpdated: new Date(latest.d),
      source: 'auto',
    };
  } catch (error) {
    console.error('Error fetching live exchange rates:', error);
    return null;
  }
}

// Get exchange rates for a gym (from settings or live)
export async function getExchangeRates(gymId: string): Promise<ExchangeRates> {
  const settings = await getCurrencySettings(gymId);

  // Default rates if no settings
  if (!settings) {
    return {
      baseCurrency: 'CAD',
      rates: { CAD: 1, USD: 1.35, EUR: 1.45 },
      lastUpdated: new Date(),
      source: 'manual',
    };
  }

  // If using auto rates, fetch from Bank of Canada
  if (settings.useAutoRates) {
    const liveRates = await fetchLiveRates();
    if (liveRates) {
      // Update the settings with the fetched rates
      await prisma.currencySettings.update({
        where: { gymId },
        data: {
          usdToCad: liveRates.rates.USD,
          eurToCad: liveRates.rates.EUR,
          lastRateUpdate: liveRates.lastUpdated,
        },
      });
      return liveRates;
    }
    // Fall back to stored rates if live fetch fails
  }

  // Use manual rates from settings
  return {
    baseCurrency: settings.baseCurrency as CurrencyCode,
    rates: {
      CAD: 1,
      USD: settings.usdToCad ? Number(settings.usdToCad) : 1.35,
      EUR: settings.eurToCad ? Number(settings.eurToCad) : 1.45,
    },
    lastUpdated: settings.lastRateUpdate || settings.updatedAt,
    source: 'manual',
  };
}

// Convert amount between currencies
export async function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  gymId: string
): Promise<CurrencyConversion> {
  const rates = await getExchangeRates(gymId);

  let convertedAmount: number;
  let rate: number;

  if (from === to) {
    // No conversion needed
    convertedAmount = amount;
    rate = 1;
  } else if (rates.baseCurrency === 'CAD') {
    // Convert from source to CAD, then from CAD to target
    const amountInCad = from === 'CAD' ? amount : amount * rates.rates[from];
    convertedAmount = to === 'CAD' ? amountInCad : amountInCad / rates.rates[to];
    rate = convertedAmount / amount;
  } else {
    // Fallback for non-CAD base
    const fromRate = rates.rates[from] || 1;
    const toRate = rates.rates[to] || 1;
    rate = toRate / fromRate;
    convertedAmount = amount * rate;
  }

  return {
    fromAmount: amount,
    fromCurrency: from,
    toAmount: Math.round(convertedAmount * 100) / 100,
    toCurrency: to,
    rate: Math.round(rate * 1000000) / 1000000,
    timestamp: new Date(),
  };
}

// Update manual exchange rates
export async function updateManualRates(
  gymId: string,
  rates: { usdToCad?: number; eurToCad?: number }
): Promise<CurrencySettings> {
  return prisma.currencySettings.update({
    where: { gymId },
    data: {
      usdToCad: rates.usdToCad ?? undefined,
      eurToCad: rates.eurToCad ?? undefined,
      lastRateUpdate: new Date(),
    },
  });
}

// Format currency for display
export function formatCurrency(
  amount: number,
  currency: CurrencyCode = 'CAD'
): string {
  const config = SUPPORTED_CURRENCIES[currency];
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.code,
  }).format(amount);
}

// Get currency symbol
export function getCurrencySymbol(currency: CurrencyCode): string {
  return SUPPORTED_CURRENCIES[currency]?.symbol || '$';
}

// Get all supported currencies
export function getAllCurrencies(): typeof SUPPORTED_CURRENCIES[CurrencyCode][] {
  return Object.values(SUPPORTED_CURRENCIES);
}

// Validate currency code
export function isValidCurrency(code: string): code is CurrencyCode {
  return code in SUPPORTED_CURRENCIES;
}
