import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const WEEKLY_DETECTION_LIMIT = 1;
const DAILY_CHAT_LIMIT = 1;

// Subscription pricing - USD only
export const SUBSCRIPTION_PRICE = { amount: 30.00, symbol: '$', currency: 'USD' };

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
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      loadUsage();
      checkPremiumStatus();
    }
  }, [user]);

  const checkPremiumStatus = async () => {
    if (!user) {
      setLoadingPremium(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('premium_subscriptions')
        .select('status, expires_at, payment_reference')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data && data.status === 'active') {
        // Check if subscription hasn't expired
        if (!data.expires_at || new Date(data.expires_at) > new Date()) {
          setIsPremium(true);
          // Calculate trial days left if it's a free trial
          if (data.payment_reference === 'free_trial' && data.expires_at) {
            const daysLeft = Math.ceil((new Date(data.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
            setTrialDaysLeft(Math.max(0, daysLeft));
          }
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

  const getFormattedPrice = () => `${SUBSCRIPTION_PRICE.symbol}${SUBSCRIPTION_PRICE.amount.toFixed(2)}`;

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
    trialDaysLeft,
    getFormattedPrice,
    UPGRADE_URL: BASE_UPGRADE_URL
  };
};
