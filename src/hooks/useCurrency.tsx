import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

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
];

const CURRENCY_STORAGE_KEY = 'imvelo_ledger_currency';

export const useCurrency = () => {
  const { user } = useAuth();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currencies[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadCurrency();
    }
  }, [user]);

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
    return `${selectedCurrency.symbol}${amount.toFixed(2)}`;
  };

  return {
    selectedCurrency,
    setCurrency,
    formatAmount,
    currencies,
    loading
  };
};
