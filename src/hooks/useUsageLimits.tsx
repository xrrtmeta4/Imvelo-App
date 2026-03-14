import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

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
    weeklyDetections: 1,
    dailyChats: 3,
    maxLedgerEntries: 10,
    maxSprayEntries: 5,
    features: ['1 pest/disease scan per week', '3 AI chat messages per day', 'Basic weather info', 'Best practices library', 'Extension directory', 'Spray calendar (5 entries)', 'Digital ledger (10 entries)'],
  },
  starter: {
    name: 'Starter',
    price: 0,
    weeklyDetections: 1,
    dailyChats: 3,
    maxLedgerEntries: 10,
    maxSprayEntries: 5,
    features: ['1 pest/disease scan per week', '3 AI chat messages per day', 'Basic weather info', 'Best practices library', 'Extension directory', 'Spray calendar (5 entries)', 'Digital ledger (10 entries)'],
  },
  premium: {
    name: 'Premium',
    price: 6,
    weeklyDetections: Infinity,
    dailyChats: Infinity,
    maxLedgerEntries: Infinity,
    maxSprayEntries: Infinity,
    features: ['Unlimited scans', 'Unlimited AI chat', '7-day weather forecast', 'Farming tips', 'Unlimited spray scheduling', 'Unlimited digital ledger', 'Produce estimation', 'Crop monitoring (phenotype)', 'Advanced climate resilience tools', 'Livestock manager', 'Crop rotation planner', 'Fertilizer calculator', 'Harvest tracker', 'Market price alerts', 'Farm inventory', 'Carbon score', 'Post-harvest guide', 'Priority support'],
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
        .select('status, expires_at, payment_reference, plan')
        .eq('user_id', user.id)
        .maybeSingle();

      if (data && data.status === 'active') {
        if (!data.expires_at || new Date(data.expires_at) > new Date()) {
          let plan: string = (data as any).plan || 'starter';
          if (plan === 'pro' || plan === 'enterprise') plan = 'premium';
          setCurrentPlan(plan as PlanTier);
          setCurrentPlan(plan);
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
    }
  };

  const saveUsage = (newUsage: UsageData) => {
    if (!user) return;
    localStorage.setItem(getStorageKey(user.id), JSON.stringify(newUsage));
    setUsage(newUsage);
  };

  const planConfig = PLANS[currentPlan];

  const canUseDetection = () => usage.detectionCount < planConfig.weeklyDetections;
  const canUseChat = () => usage.chatCount < planConfig.dailyChats;
  const canAddLedgerEntry = (currentCount: number) => currentCount < planConfig.maxLedgerEntries;
  const canAddSprayEntry = (currentCount: number) => currentCount < planConfig.maxSprayEntries;
  const getMaxLedgerEntries = () => planConfig.maxLedgerEntries;
  const getMaxSprayEntries = () => planConfig.maxSprayEntries;

  const incrementDetection = () => {
    if (planConfig.weeklyDetections === Infinity) return;
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

  const getRemainingDetections = () => planConfig.weeklyDetections === Infinity ? Infinity : Math.max(0, planConfig.weeklyDetections - usage.detectionCount);
  const getRemainingChats = () => planConfig.dailyChats === Infinity ? Infinity : Math.max(0, planConfig.dailyChats - usage.chatCount);

  const isPremium = currentPlan !== 'free';
  const hasFeature = (feature: 'spray' | 'ledger' | 'cropMonitor' | 'climateRisk' | 'forecast' | 'farmingTips') => {
    switch (feature) {
      case 'spray':
      case 'ledger':
        return true; // Available to all plans with entry limits
      case 'cropMonitor':
      case 'climateRisk':
        return true; // Available to all plans
      case 'forecast':
      case 'farmingTips':
        return currentPlan === 'premium';
      default:
        return false;
    }
  };

  const getFormattedPrice = () => `$${planConfig.price.toFixed(2)}`;

  const openUpgrade = async (planOrEvent?: PlanTier | React.MouseEvent, paymentMethods?: string[]) => {
    const targetPlan = (typeof planOrEvent === 'string' ? planOrEvent : undefined) || getNextPlan();
    const productId = PRODUCT_IDS[targetPlan];
    if (!productId) return;

    try {
      const body: Record<string, unknown> = {
        product_id: productId,
        customer_email: user?.email,
        customer_name: user?.user_metadata?.full_name,
        redirect_url: window.location.origin + '/upgrade?success=true',
      };
      if (paymentMethods && paymentMethods.length > 0) {
        body.payment_methods = paymentMethods;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', { body });

      if (error) throw error;
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error('Failed to start checkout. Please try again.');
    }
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
    trialDaysLeft,
    getFormattedPrice,
    PLANS,
  };
};
