import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { safeJsonParse } from '@/lib/safeJson';

export type PlanTier = 'free' | 'starter' | 'premium';

export const PRODUCT_IDS: Record<PlanTier, string> = {
  free: '',
  starter: '',
  premium: 'pdt_0NYZaqcOARihEXXOPIdmC',
};

export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    weeklyDetections: 2,
    dailyDetections: 0,
    dailyChats: 3,
    maxLedgerEntries: 20,
    maxSprayEntries: 10,
    features: ['2 pest/disease scans per week', '3 Chloe AI chats per day', 'Basic weather info', '3-day weather outlook', 'Digital ledger (20 entries)', 'Spray calendar (10 entries)', 'Extension directory', 'Crop rotation planner', 'Fertilizer calculator', 'Market price ticker', 'Community knowledge graph'],
  },
  starter: {
    name: 'Starter',
    price: 0,
    weeklyDetections: 2,
    dailyDetections: 0,
    dailyChats: 3,
    maxLedgerEntries: 20,
    maxSprayEntries: 10,
    features: ['2 pest/disease scans per week', '3 Chloe AI chats per day', 'Basic weather info', '3-day weather outlook', 'Digital ledger (20 entries)', 'Spray calendar (10 entries)', 'Extension directory', 'Crop rotation planner', 'Fertilizer calculator', 'Market price ticker', 'Community knowledge graph'],
  },
  premium: {
    name: 'Premium',
    price: 37,
    weeklyDetections: 0,
    dailyDetections: 1,
    dailyChats: 2,
    maxLedgerEntries: Infinity,
    maxSprayEntries: Infinity,
    features: ['1 scan per day', '2 AI chats per day', 'AI financial advisory', 'Climate volatility engine', 'Smart irrigation planner', '7-day weather forecast', 'Farming tips', 'Unlimited spray scheduling', 'Unlimited digital ledger', 'Produce estimation', 'Crop monitoring (phenotype)', 'Livestock manager', 'Harvest tracker', 'Market price alerts', 'Farm inventory', 'Carbon score', 'Post-harvest guide', 'Priority support'],
  },
};

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
  const [currentPlan, setCurrentPlan] = useState<PlanTier>('free');
  const [loadingPremium, setLoadingPremium] = useState(true);

  const checkPremiumStatus = useCallback(async () => {
    if (!user) {
      setLoadingPremium(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('premium_subscriptions')
        .select('status, expires_at, plan')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data && data.status === 'active') {
        if (!data.expires_at || new Date(data.expires_at) > new Date()) {
          let plan: string = (data as any).plan || 'starter';
          if (plan === 'pro' || plan === 'enterprise') plan = 'premium';
          setCurrentPlan(plan as PlanTier);
        }
      }
    } catch (error) {
      console.error('Error checking premium status:', error);
    } finally {
      setLoadingPremium(false);
    }
  }, [user]);

  const loadUsage = useCallback(() => {
    if (!user) return;
    const stored = localStorage.getItem(getStorageKey(user.id));
    const data = safeJsonParse<UsageData>(stored, {
      detectionCount: 0,
      chatCount: 0,
      lastResetDate: getTodayDate(),
      weekResetDate: getWeekStart(),
    });
    const currentWeek = getWeekStart();
    const today = getTodayDate();
    let needsUpdate = false;

    if (data.weekResetDate !== currentWeek) {
      data.detectionCount = 0;
      data.weekResetDate = currentWeek;
      needsUpdate = true;
    }
    if (data.lastResetDate !== today) {
      data.chatCount = 0;
      data.lastResetDate = today;
      needsUpdate = true;
    }
    if (needsUpdate) {
      localStorage.setItem(getStorageKey(user.id), JSON.stringify(data));
    }
    setUsage(data);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadUsage();
      checkPremiumStatus();
    }
  }, [user, loadUsage, checkPremiumStatus]);

  const saveUsage = (newUsage: UsageData) => {
    if (!user) return;
    localStorage.setItem(getStorageKey(user.id), JSON.stringify(newUsage));
    setUsage(newUsage);
  };

  const planConfig = PLANS[currentPlan];

  const canUseDetection = () => {
    if (planConfig.dailyDetections > 0) {
      return usage.detectionCount < planConfig.dailyDetections;
    }
    return usage.detectionCount < planConfig.weeklyDetections;
  };

  const canUseChat = () => usage.chatCount < planConfig.dailyChats;

  const canAddLedgerEntry = (currentCount: number) => currentCount < planConfig.maxLedgerEntries;
  const canAddSprayEntry = (currentCount: number) => currentCount < planConfig.maxSprayEntries;
  const getMaxLedgerEntries = () => planConfig.maxLedgerEntries;
  const getMaxSprayEntries = () => planConfig.maxSprayEntries;

  const incrementDetection = () => {
    const newUsage = {
      ...usage,
      detectionCount: usage.detectionCount + 1,
      lastResetDate: getTodayDate(),
      weekResetDate: usage.weekResetDate || getWeekStart()
    };
    saveUsage(newUsage);
  };

  const incrementChat = () => {
    if (planConfig.dailyChats === Infinity) return;
    const newUsage = {
      ...usage,
      chatCount: usage.chatCount + 1,
      lastResetDate: getTodayDate()
    };
    saveUsage(newUsage);
  };

  const getRemainingDetections = () => {
    if (planConfig.dailyDetections > 0) {
      return Math.max(0, planConfig.dailyDetections - usage.detectionCount);
    }
    return planConfig.weeklyDetections === Infinity ? Infinity : Math.max(0, planConfig.weeklyDetections - usage.detectionCount);
  };

  const getRemainingChats = () => planConfig.dailyChats === Infinity ? Infinity : Math.max(0, planConfig.dailyChats - usage.chatCount);

  const isPremium = currentPlan !== 'free';
  const hasFeature = (feature: 'spray' | 'ledger' | 'cropMonitor' | 'climateRisk' | 'irrigation' | 'aiAdvisory' | 'forecast' | 'farmingTips') => {
    switch (feature) {
      case 'spray':
      case 'ledger':
        return true;
      case 'cropMonitor':
        return true;
      case 'climateRisk':
      case 'irrigation':
      case 'aiAdvisory':
      case 'forecast':
      case 'farmingTips':
        return currentPlan === 'premium';
      default:
        return false;
    }
  };

  const getFormattedPrice = () => `E${planConfig.price.toFixed(2)}`;

  const openUpgrade = async (planOrEvent?: PlanTier | React.MouseEvent, paymentMethods?: string[]) => {
    const targetPlan = (typeof planOrEvent === 'string' ? planOrEvent : undefined) || getNextPlan();
    const productId = PRODUCT_IDS[targetPlan];
    if (!productId) return;

    const customerEmail = user?.email;
    if (!customerEmail) {
      toast.error('Please sign in to upgrade');
      return;
    }

    const checkoutUrl = `https://checkout.dodopayments.com/buy/${productId}?quantity=1`;

    try {
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          product_id: productId,
          product_name: targetPlan,
          amount: 37,
          currency: 'SZL',
          customer_email: customerEmail,
          customer_name: user?.user_metadata?.full_name || 'Customer',
          payment_methods: paymentMethods || ['credit', 'debit', 'apple_pay', 'google_pay', 'amazon_pay', 'cashapp', 'klarna', 'afterpay_clearpay', 'sepa', 'pix', 'crypto_currency', 'we_chat_pay', 'upi_collect', 'ideal', 'bancontact_card', 'eps', 'multibanco', 'blik', 'revolut_pay', 'billie', 'satispay'],
          success_url: window.location.origin + '/upgrade?success=true',
          cancel_url: window.location.origin + '/upgrade',
        }),
      });

      const data = await response.json();
      if (response.ok && data?.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }
    } catch (err) {
      console.warn('[openUpgrade] Backend unavailable, using direct checkout:', err);
    }

    window.location.href = checkoutUrl;
  };

  const getNextPlan = (): PlanTier => {
    switch (currentPlan) {
      case 'free': return 'starter';
      case 'starter': return 'premium';
      default: return 'premium';
    }
  };

  return {
    canUseDetection,
    canUseChat,
    canAddLedgerEntry,
    canAddSprayEntry,
    getMaxLedgerEntries,
    getMaxSprayEntries,
    incrementDetection,
    incrementChat,
    getRemainingDetections,
    getRemainingChats,
    openUpgrade,
    isPremium,
    currentPlan,
    hasFeature,
    loadingPremium,
    getFormattedPrice,
    PLANS,
  };
};
