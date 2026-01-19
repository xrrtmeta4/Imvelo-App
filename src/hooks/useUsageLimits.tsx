import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const DAILY_DETECTION_LIMIT = 1;
const DAILY_CHAT_LIMIT = 5;
const UPGRADE_URL = 'https://checkout.dodopayments.com/buy/pdt_0NVKhwZKeJCCaRbxoTNno?quantity=1&redirect_url=https://imveloappsz.vercel.app';

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

  const openUpgrade = () => {
    window.open(UPGRADE_URL, '_blank');
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
    UPGRADE_URL
  };
};
