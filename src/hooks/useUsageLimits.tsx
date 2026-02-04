import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const DAILY_DETECTION_LIMIT = 1;
const DAILY_CHAT_LIMIT = 5;

// Subscription pricing in different currencies
export const subscriptionPricing: Record<string, { amount: number; symbol: string; currency: string }> = {
  USD: { amount: 6.04, symbol: '$', currency: 'USD' },
  EUR: { amount: 5.50, symbol: '€', currency: 'EUR' },
  GBP: { amount: 4.80, symbol: '£', currency: 'GBP' },
  ZAR: { amount: 110.00, symbol: 'R', currency: 'ZAR' },
  SZL: { amount: 110.00, symbol: 'E', currency: 'SZL' },
  KES: { amount: 780.00, symbol: 'KSh', currency: 'KES' },
  NGN: { amount: 9000.00, symbol: '₦', currency: 'NGN' },
  GHS: { amount: 75.00, symbol: 'GH₵', currency: 'GHS' },
  TZS: { amount: 15000.00, symbol: 'TSh', currency: 'TZS' },
  UGX: { amount: 22500.00, symbol: 'USh', currency: 'UGX' },
  INR: { amount: 500.00, symbol: '₹', currency: 'INR' },
  BRL: { amount: 30.00, symbol: 'R$', currency: 'BRL' },
  MXN: { amount: 110.00, symbol: '$', currency: 'MXN' },
  AUD: { amount: 9.50, symbol: 'A$', currency: 'AUD' },
  CAD: { amount: 8.50, symbol: 'C$', currency: 'CAD' },
};

const BASE_UPGRADE_URL = 'https://checkout.dodopayments.com/buy/pdt_0NVKhwZKeJCCaRbxoTNno?quantity=1&redirect_url=https://imveloappsz.vercel.app';

interface UsageData {
  detectionCount: number;
  chatCount: number;
  lastResetDate: string;
}

const getStorageKey = (userId: string) => `imvelo_usage_${userId}`;

const getTodayDate = () => new Date().toISOString().split('T')[0];

export const useUsageLimits = () => {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageData>({
    detectionCount: 0,
    chatCount: 0,
    lastResetDate: getTodayDate()
  });
  const [isPremium, setIsPremium] = useState(false);
  const [loadingPremium, setLoadingPremium] = useState(true);
  const [userCurrency, setUserCurrency] = useState<string>('USD');

  useEffect(() => {
    if (user) {
      loadUsage();
      checkPremiumStatus();
      detectUserCurrency();
    }
  }, [user]);

  const detectUserCurrency = async () => {
    // Try to get currency from user's location or default to USD
    try {
      const storedCurrency = localStorage.getItem(`imvelo_preferred_currency_${user?.id}`);
      if (storedCurrency && subscriptionPricing[storedCurrency]) {
        setUserCurrency(storedCurrency);
      }
    } catch (error) {
      console.error('Error detecting currency:', error);
    }
  };

  const setPreferredCurrency = (currency: string) => {
    if (user && subscriptionPricing[currency]) {
      setUserCurrency(currency);
      localStorage.setItem(`imvelo_preferred_currency_${user.id}`, currency);
    }
  };

  const checkPremiumStatus = async () => {
    if (!user) {
      setLoadingPremium(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('premium_subscriptions')
        .select('status, expires_at')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data && data.status === 'active') {
        // Check if subscription hasn't expired
        if (!data.expires_at || new Date(data.expires_at) > new Date()) {
          setIsPremium(true);
        }
      }
    } catch (error) {
      console.error('Error checking premium status:', error);
    } finally {
      setLoadingPremium(false);
    }
  };

  const loadUsage = () => {
    if (!user) return;
    
    const stored = localStorage.getItem(getStorageKey(user.id));
    if (stored) {
      const data: UsageData = JSON.parse(stored);
      // Reset if it's a new day
      if (data.lastResetDate !== getTodayDate()) {
        const resetData = {
          detectionCount: 0,
          chatCount: 0,
          lastResetDate: getTodayDate()
        };
        localStorage.setItem(getStorageKey(user.id), JSON.stringify(resetData));
        setUsage(resetData);
      } else {
        setUsage(data);
      }
    }
  };

  const saveUsage = (newUsage: UsageData) => {
    if (!user) return;
    localStorage.setItem(getStorageKey(user.id), JSON.stringify(newUsage));
    setUsage(newUsage);
  };

  const canUseDetection = () => isPremium || usage.detectionCount < DAILY_DETECTION_LIMIT;
  const canUseChat = () => isPremium || usage.chatCount < DAILY_CHAT_LIMIT;

  const incrementDetection = () => {
    if (isPremium) return; // Don't track for premium users
    const newUsage = {
      ...usage,
      detectionCount: usage.detectionCount + 1,
      lastResetDate: getTodayDate()
    };
    saveUsage(newUsage);
  };

  const incrementChat = () => {
    if (isPremium) return; // Don't track for premium users
    const newUsage = {
      ...usage,
      chatCount: usage.chatCount + 1,
      lastResetDate: getTodayDate()
    };
    saveUsage(newUsage);
  };

  const getRemainingDetections = () => isPremium ? Infinity : DAILY_DETECTION_LIMIT - usage.detectionCount;
  const getRemainingChats = () => isPremium ? Infinity : DAILY_CHAT_LIMIT - usage.chatCount;

  const getPricing = () => subscriptionPricing[userCurrency] || subscriptionPricing.USD;

  const getFormattedPrice = () => {
    const pricing = getPricing();
    return `${pricing.symbol}${pricing.amount.toFixed(2)}`;
  };

  const openUpgrade = () => {
    window.open(BASE_UPGRADE_URL, '_blank');
  };

  return {
    canUseDetection,
    canUseChat,
    incrementDetection,
    incrementChat,
    getRemainingDetections,
    getRemainingChats,
    openUpgrade,
    isPremium,
    loadingPremium,
    userCurrency,
    setPreferredCurrency,
    getPricing,
    getFormattedPrice,
    subscriptionPricing,
    UPGRADE_URL: BASE_UPGRADE_URL
  };
};
