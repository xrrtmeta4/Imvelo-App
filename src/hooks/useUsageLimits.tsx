import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

const DAILY_DETECTION_LIMIT = 3;
const DAILY_CHAT_LIMIT = 10;
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

  useEffect(() => {
    if (user) {
      loadUsage();
    }
  }, [user]);

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

  const canUseDetection = () => usage.detectionCount < DAILY_DETECTION_LIMIT;
  const canUseChat = () => usage.chatCount < DAILY_CHAT_LIMIT;

  const incrementDetection = () => {
    const newUsage = {
      ...usage,
      detectionCount: usage.detectionCount + 1,
      lastResetDate: getTodayDate()
    };
    saveUsage(newUsage);
  };

  const incrementChat = () => {
    const newUsage = {
      ...usage,
      chatCount: usage.chatCount + 1,
      lastResetDate: getTodayDate()
    };
    saveUsage(newUsage);
  };

  const getRemainingDetections = () => DAILY_DETECTION_LIMIT - usage.detectionCount;
  const getRemainingChats = () => DAILY_CHAT_LIMIT - usage.chatCount;

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
    UPGRADE_URL
  };
};
