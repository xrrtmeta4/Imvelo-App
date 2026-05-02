// Approximate USD -> currency conversion rates (updated periodically).
// These are display-only conversions for UI pricing; actual checkout still
// charges the underlying USD amount via Dodo Payments.
export const USD_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  ZAR: 18.5,
  SZL: 18.5,
  LSL: 18.5,
  NAD: 18.5,
  KES: 129,
  NGN: 1550,
  GHS: 15.5,
  TZS: 2530,
  UGX: 3700,
  RWF: 1380,
  ETB: 125,
  BWP: 13.7,
  MWK: 1740,
  ZMW: 26,
  MZN: 64,
  XOF: 605,
  XAF: 605,
  MAD: 9.9,
  EGP: 49,
  DZD: 134,
  TND: 3.1,
  AOA: 920,
  CDF: 2780,
  SDG: 600,
  SCR: 13.5,
  GMD: 71,
  SLL: 22500,
  LRD: 195,
  MGA: 4550,
  MUR: 46,
  ZWL: 32,
  INR: 84,
  BRL: 5.7,
  MXN: 18.5,
  AUD: 1.52,
  CAD: 1.37,
  CNY: 7.2,
  JPY: 150,
};

export const convertFromUSD = (usd: number, targetCode: string): number => {
  const rate = USD_RATES[targetCode] ?? 1;
  return usd * rate;
};

export const formatLocalPrice = (usd: number, currency: { code: string; symbol: string }): string => {
  const local = convertFromUSD(usd, currency.code);
  // Use no decimals for low-value-per-unit currencies
  const noDecimals = ['NGN', 'TZS', 'UGX', 'RWF', 'XOF', 'XAF', 'MGA', 'SLL', 'LRD', 'MWK', 'ZMW', 'AOA', 'CDF', 'SDG', 'JPY', 'KES', 'ETB', 'EGP', 'DZD', 'MZN', 'ZWL'];
  const decimals = noDecimals.includes(currency.code) ? 0 : 2;
  return `${currency.symbol}${local.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
};