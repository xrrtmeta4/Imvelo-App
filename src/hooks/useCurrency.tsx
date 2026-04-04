import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation as useGeoLocation } from '@/hooks/useLocation';

export interface Currency {
  code: string;
  symbol: string;
  name: string;
}

export const currencies: Currency[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'SZL', symbol: 'E', name: 'Swazi Lilangeni' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'GHS', symbol: 'GH₵', name: 'Ghanaian Cedi' },
  { code: 'TZS', symbol: 'TSh', name: 'Tanzanian Shilling' },
  { code: 'UGX', symbol: 'USh', name: 'Ugandan Shilling' },
  { code: 'RWF', symbol: 'FRw', name: 'Rwandan Franc' },
  { code: 'ETB', symbol: 'Br', name: 'Ethiopian Birr' },
  { code: 'BWP', symbol: 'P', name: 'Botswana Pula' },
  { code: 'MWK', symbol: 'MK', name: 'Malawian Kwacha' },
  { code: 'ZMW', symbol: 'K', name: 'Zambian Kwacha' },
  { code: 'MZN', symbol: 'MT', name: 'Mozambican Metical' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'XOF', symbol: 'CFA', name: 'West African CFA Franc' },
  { code: 'XAF', symbol: 'FCFA', name: 'Central African CFA Franc' },
  { code: 'MAD', symbol: 'MAD', name: 'Moroccan Dirham' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
  { code: 'DZD', symbol: 'د.ج', name: 'Algerian Dinar' },
  { code: 'TND', symbol: 'DT', name: 'Tunisian Dinar' },
  { code: 'AOA', symbol: 'Kz', name: 'Angolan Kwanza' },
  { code: 'CDF', symbol: 'FC', name: 'Congolese Franc' },
  { code: 'SDG', symbol: 'SDG', name: 'Sudanese Pound' },
  { code: 'LSL', symbol: 'L', name: 'Lesotho Loti' },
  { code: 'NAD', symbol: 'N$', name: 'Namibian Dollar' },
  { code: 'SCR', symbol: 'SCR', name: 'Seychellois Rupee' },
  { code: 'GMD', symbol: 'D', name: 'Gambian Dalasi' },
  { code: 'SLL', symbol: 'Le', name: 'Sierra Leonean Leone' },
  { code: 'LRD', symbol: 'L$', name: 'Liberian Dollar' },
  { code: 'MGA', symbol: 'Ar', name: 'Malagasy Ariary' },
  { code: 'MUR', symbol: 'Rs', name: 'Mauritian Rupee' },
  { code: 'ZWL', symbol: 'Z$', name: 'Zimbabwean Dollar' },
];

// Map country codes to currency codes
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  US: 'USD', GB: 'GBP', ZA: 'ZAR', SZ: 'SZL', KE: 'KES', NG: 'NGN',
  GH: 'GHS', TZ: 'TZS', UG: 'UGX', RW: 'RWF', ET: 'ETB', BW: 'BWP',
  MW: 'MWK', ZM: 'ZMW', MZ: 'MZN', IN: 'INR', BR: 'BRL', MX: 'MXN',
  AU: 'AUD', CA: 'CAD', CN: 'CNY', JP: 'JPY', EG: 'EGP', MA: 'MAD',
  DZ: 'DZD', TN: 'TND', AO: 'AOA', CD: 'CDF', SD: 'SDG', LS: 'LSL',
  NA: 'NAD', SC: 'SCR', GM: 'GMD', SL: 'SLL', LR: 'LRD', MG: 'MGA',
  MU: 'MUR', ZW: 'ZWL',
  // CFA Franc West
  SN: 'XOF', CI: 'XOF', ML: 'XOF', BF: 'XOF', NE: 'XOF', TG: 'XOF', BJ: 'XOF', GW: 'XOF',
  // CFA Franc Central
  CM: 'XAF', GA: 'XAF', CG: 'XAF', TD: 'XAF', CF: 'XAF', GQ: 'XAF',
  // Euro
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', PT: 'EUR', NL: 'EUR', BE: 'EUR', AT: 'EUR', IE: 'EUR', FI: 'EUR',
};

const CURRENCY_STORAGE_KEY = 'imvelo_ledger_currency';

export const useCurrency = () => {
  const { user } = useAuth();
  const { location, getLocation } = useGeoLocation();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currencies[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCurrency();
    }
  }, [user]);

  // Auto-detect currency from location when no stored preference exists
  useEffect(() => {
    if (!user || !loading) return;
    const stored = localStorage.getItem(`${CURRENCY_STORAGE_KEY}_${user.id}`);
    if (!stored) {
      // Try to detect from location
      detectCurrencyFromLocation();
    }
  }, [user, location]);

  const detectCurrencyFromLocation = async () => {
    try {
      let loc = location;
      if (!loc) {
        loc = await getLocation();
      }
      if (loc?.country_code) {
        const currencyCode = COUNTRY_CURRENCY_MAP[loc.country_code];
        if (currencyCode) {
          const currency = currencies.find(c => c.code === currencyCode);
          if (currency) {
            setSelectedCurrency(currency);
            if (user) {
              localStorage.setItem(`${CURRENCY_STORAGE_KEY}_${user.id}`, currencyCode);
            }
          }
        }
      }
    } catch {
      // Keep default
    }
  };

  const loadCurrency = () => {
    const stored = localStorage.getItem(`${CURRENCY_STORAGE_KEY}_${user?.id}`);
    if (stored) {
      const currency = currencies.find(c => c.code === stored);
      if (currency) {
        setSelectedCurrency(currency);
      }
    }
    setLoading(false);
  };

  const setCurrency = (currencyCode: string) => {
    const currency = currencies.find(c => c.code === currencyCode);
    if (currency && user) {
      setSelectedCurrency(currency);
      localStorage.setItem(`${CURRENCY_STORAGE_KEY}_${user.id}`, currencyCode);
    }
  };

  const formatAmount = (amount: number) => {
    return `${selectedCurrency.symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return {
    selectedCurrency,
    setCurrency,
    formatAmount,
    currencies,
    loading,
    countryToCurrency: COUNTRY_CURRENCY_MAP,
  };
};
