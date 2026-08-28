import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { safeJsonParse } from '@/lib/safeJson';

export type PlanTier = 'free' | 'starter' | 'premium' | 'commercial' | 'enterprise';

export const PLAN_ORDER: PlanTier[] = ['free', 'starter', 'premium', 'commercial', 'enterprise'];

export const PRODUCT_IDS: Record<PlanTier, string> = {
  free: '',
  starter: '',
  premium: 'pdt_0NYZaqcOARihEXXOPIdmC',
  commercial: 'pdt_0NVKhwZKeJCCaRbxoTNno',
  enterprise: 'pdt_0NYZb3ccdGubedVQypzZn',
};

export const PLANS: Record<PlanTier, {
  name: string;
  price: number;
  weeklyDetections: number;
  dailyDetections: number;
  dailyChats: number;
  maxLedgerEntries: number;
  maxSprayEntries: number;
  features: string[];
}> = {
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
    features: ['1 scan per day', '2 AI chats per day', 'AI financial advisory', '7-day weather forecast', 'Water & irrigation insight', 'Farming tips', 'Digital ledger (unlimited)', 'Produce estimation', 'Crop monitoring (phenotype)', 'Livestock manager', 'Harvest tracker', 'Market price alerts', 'Farm inventory', 'Carbon score', 'Post-harvest guide', 'Priority support'],
  },
  commercial: {
    name: 'Commercial',
    price: 499,
    weeklyDetections: Infinity,
    dailyDetections: Infinity,
    dailyChats: Infinity,
    maxLedgerEntries: Infinity,
    maxSprayEntries: Infinity,
    features: ['Unlimited pest, soil & disease scans', 'Unlimited AI chats & crop monitoring', 'Soil scanner (phenotype)', '7-day weather forecast', 'Water & irrigation insight', 'Digital ledger (unlimited)', 'Produce estimation', 'Livestock manager', 'Market price alerts', 'Priority support'],
  },
  enterprise: {
    name: 'Enterprise',
    price: 999,
    weeklyDetections: Infinity,
    dailyDetections: Infinity,
    dailyChats: Infinity,
    maxLedgerEntries: Infinity,
    maxSprayEntries: Infinity,
    features: ['Everything in Commercial', 'AI financial advisory', 'Harvest tracker', 'Farm inventory', 'Carbon score & sustainability reporting', 'Post-harvest guide', 'Exportable analytics & CSV reports', 'Priority 24/7 support'],
  },
};

// Precise per-tier feature gates. Each tier is cumulative (higher includes lower).
export const FEATURE_GATES: Record<string, PlanTier[]> = {
  irrigation: ['premium', 'commercial', 'enterprise'],
  forecast: ['premium', 'commercial', 'enterprise'],
  forecast7day: ['premium', 'commercial', 'enterprise'],
  aiAdvisory: ['premium', 'commercial', 'enterprise'],
  cropMonitor: ['commercial', 'enterprise'],
  harvest: ['commercial', 'enterprise'],
  inventory: ['commercial', 'enterprise'],
  carbon: ['commercial', 'enterprise'],
  export: ['enterprise'],
  farmingTips: ['free', 'starter', 'premium', 'commercial', 'enterprise'],
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
           const plan: string = (data as any).plan || 'starter';
           const alias: Record<string, string> = { pro: 'premium' };
           setCurrentPlan((alias[plan] || plan) as PlanTier);
         }
       }
    } catch (error) {
      console.error('Error checking premium status:', error);
    } finally {
      setLoadingPremium(false);
    }
  }, [user]);

  // Webhook-free activation: after a successful Dodo checkout the app is
  // redirected back with ?success=true&plan=<tier>. We write the caller's own
  // subscription row (allowed by the "Users can manage own subscription" RLS
  // policy). The Dodo webhook remains the authoritative source and will
  // overwrite this on delivery.
  const activatePlan = useCallback(async (plan: PlanTier) => {
    if (!user) return false;
    if (plan === 'free' || plan === 'starter') return false;
    try {
      const { error } = await supabase
        .from('premium_subscriptions')
        .upsert(
          {
            user_id: user.id,
            status: 'active',
            payment_reference: `client_${Date.now()}`,
            expires_at: null,
            plan,
          },
          { onConflict: 'user_id' },
        );
      if (error) {
        console.error('[activatePlan] upsert error:', error);
        return false;
      }
      setCurrentPlan(plan);
      return true;
    } catch (e) {
      console.error('[activatePlan] error:', e);
      return false;
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
  const hasFeature = (feature: string) => {
    const required = FEATURE_GATES[feature as keyof typeof FEATURE_GATES];
    if (!required) return isPremium; // unknown features require a paid tier by default
    return PLAN_ORDER.indexOf(currentPlan) >= PLAN_ORDER.indexOf(required);
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

    try {
      const { startDodoCheckout } = await import('@/lib/checkout');
      const checkoutUrl = await startDodoCheckout({
        product_id: productId,
        product_name: targetPlan,
        customer_email: customerEmail,
        customer_name: user?.user_metadata?.full_name || 'Customer',
        redirect_url: window.location.origin + `/upgrade?success=true&plan=${targetPlan}`,
        cancel_url: window.location.origin + '/upgrade',
      });

      const { openDodoOverlay } = await import('@/lib/dodoCheckout');
      await openDodoOverlay(checkoutUrl);
    } catch (err: any) {
      console.error('[openUpgrade] Checkout error:', err);
      toast.error(err?.message || 'Failed to start checkout. Please try again.');
    }
  };

  const getNextPlan = (): PlanTier => {
    const idx = PLAN_ORDER.indexOf(currentPlan);
    return PLAN_ORDER[idx + 1] || 'premium';
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
    activatePlan,
    isPremium,
    currentPlan,
    hasFeature,
    loadingPremium,
     getFormattedPrice,
    refreshPremiumStatus: checkPremiumStatus,
    PLANS,
    PLAN_ORDER,
    FEATURE_GATES,
  };
};
