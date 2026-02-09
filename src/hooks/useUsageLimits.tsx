import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const WEEKLY_DETECTION_LIMIT = 1;
const DAILY_CHAT_LIMIT = 1;

// Subscription pricing in different currencies
export const subscriptionPricing: Record<string, { amount: number; symbol: string; currency: string }> = {
  USD: { amount: 30.00, symbol: '$', currency: 'USD' },
  EUR: { amount: 27.50, symbol: '€', currency: 'EUR' },
  GBP: { amount: 24.00, symbol: '£', currency: 'GBP' },
  ZAR: { amount: 550.00, symbol: 'R', currency: 'ZAR' },
  SZL: { amount: 550.00, symbol: 'E', currency: 'SZL' },
  KES: { amount: 3900.00, symbol: 'KSh', currency: 'KES' },
  NGN: { amount: 45000.00, symbol: '₦', currency: 'NGN' },
  GHS: { amount: 375.00, symbol: 'GH₵', currency: 'GHS' },
  TZS: { amount: 75000.00, symbol: 'TSh', currency: 'TZS' },
  UGX: { amount: 112500.00, symbol: 'USh', currency: 'UGX' },
  INR: { amount: 2500.00, symbol: '₹', currency: 'INR' },
  BRL: { amount: 150.00, symbol: 'R$', currency: 'BRL' },
  MXN: { amount: 550.00, symbol: '$', currency: 'MXN' },
  AUD: { amount: 47.00, symbol: 'A$', currency: 'AUD' },
  CAD: { amount: 42.00, symbol: 'C$', currency: 'CAD' },
};

const BASE_UPGRADE_URL = 'https://checkout.dodopayments.com/buy/pdt_0NVKhwZKeJCCaRbxoTNno?quantity=1&redirect_url=https://imveloappsz.vercel.app';

interface UsageData {
  detectionCount: number;
  chatCount: number;
  lastResetDate: string;
  weekResetDate: string;
}

const getStorageKey = (userId: string) => `imvelo_usage_${userId}`;

const getTodayDate = () => new Date().toISOString().split('T')[0];

const getWeekStart = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(now.setDate(diff)).toISOString().split('T')[0];
};

export const useUsageLimits = () => {
  const { user } = useAuth();
  const [usage, setUsage] = useState<UsageData>({
    detectionCount: 0,
    chatCount: 0,
    lastResetDate: getTodayDate(),
    weekResetDate: getWeekStart()
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
      const currentWeek = getWeekStart();
      const today = getTodayDate();
      let needsUpdate = false;

      // Reset weekly detection count
      if (data.weekResetDate !== currentWeek) {
        data.detectionCount = 0;
        data.weekResetDate = currentWeek;
        needsUpdate = true;
      }
      // Reset daily chat count
      if (data.lastResetDate !== today) {
        data.chatCount = 0;
        data.lastResetDate = today;
        needsUpdate = true;
      }

      if (needsUpdate) {
        localStorage.setItem(getStorageKey(user.id), JSON.stringify(data));
      }
      setUsage(data);
    }
  };

  const saveUsage = (newUsage: UsageData) => {
    if (!user) return;
    localStorage.setItem(getStorageKey(user.id), JSON.stringify(newUsage));
    setUsage(newUsage);
  };

  const canUseDetection = () => isPremium || usage.detectionCount < WEEKLY_DETECTION_LIMIT;
  const canUseChat = () => isPremium || usage.chatCount < DAILY_CHAT_LIMIT;

  const incrementDetection = () => {
    if (isPremium) return; // Don't track for premium users
    const newUsage = {
      ...usage,
      detectionCount: usage.detectionCount + 1,
      lastResetDate: getTodayDate(),
      weekResetDate: usage.weekResetDate || getWeekStart()
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

  const getRemainingDetections = () => isPremium ? Infinity : WEEKLY_DETECTION_LIMIT - usage.detectionCount;
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
