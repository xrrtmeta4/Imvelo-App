import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { safeJsonParse } from '@/lib/safeJson';
import { createPayment, getPaymentStatus } from '@/lib/payment';
import { openDodoCheckout } from '@/lib/dodoCheckout';

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
    name: 'Pro',
    price: 37,
    weeklyDetections: 0,
    dailyDetections: 1,
    dailyChats: 3,
    maxLedgerEntries: Infinity,
    maxSprayEntries: Infinity,
    features: ['1 pest/disease scan per day', '3 Chloe AI chats per day', 'Smart irrigation planner', 'Disaster watch early warnings', 'Digital ledger (unlimited)', 'Spray calendar (unlimited)', 'AI financial advisory', '7-day weather forecast', 'Farming tips', 'Priority support'],
  },
  commercial: {
    name: 'Commercial',
    price: 299,
    weeklyDetections: Infinity,
    dailyDetections: Infinity,
    dailyChats: Infinity,
    maxLedgerEntries: Infinity,
    maxSprayEntries: Infinity,
    features: ['Unlimited pest, soil & disease scans', 'Unlimited Chloe AI chats', 'Unlimited crop monitoring (phenotype)', 'Smart irrigation & disaster watch', 'Everything in Pro, unlimited', 'Livestock manager', 'Harvest tracker', 'Farm inventory', 'Carbon score', 'Market price alerts', 'Priority support'],
  },
  enterprise: {
    name: 'Enterprise',
    price: 0,
    weeklyDetections: Infinity,
    dailyDetections: Infinity,
    dailyChats: Infinity,
    maxLedgerEntries: Infinity,
    maxSprayEntries: Infinity,
    features: ['Everything in Commercial', 'Custom onboarding & training', 'Multi-farm & team accounts', 'Exportable analytics & CSV reports', 'Dedicated account manager', 'Priority 24/7 support', 'Contact sales@imveloapp.xyz'],
  },
};

// Precise per-tier feature gates. Each tier is cumulative (higher includes lower).
export const FEATURE_GATES: Record<string, PlanTier[]> = {
  irrigation: ['premium', 'commercial', 'enterprise'],
  disasterWatch: ['premium', 'commercial', 'enterprise'],
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
  const [creatingPayment, setCreatingPayment] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);

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
           if (data.expires_at) {
             const ms = new Date(data.expires_at).getTime() - Date.now();
             setTrialDaysLeft(Math.max(0, Math.ceil(ms / 86400000)));
           } else {
             setTrialDaysLeft(null);
           }
         }
       }
    } catch (error) {
      console.error('Error checking premium status:', error);
    } finally {
      setLoadingPremium(false);
    }
  }, [user]);

  // IMPORTANT: subscription activation is performed ONLY by the backend (the
  // verified Dodo webhook, or a server-side status check). The client never
  // grants premium access. After the in-app checkout completes we simply poll
  // the backend for the authoritative status.
  const pollUntilActive = useCallback(
    async (paymentId?: string) => {
      for (let attempt = 0; attempt < 12; attempt++) {
        await new Promise((r) => setTimeout(r, 2000));
        await checkPremiumStatus();
        if (paymentId) {
          const status = await getPaymentStatus(paymentId);
          if (status && ['successful', 'failed', 'cancelled', 'refunded', 'expired'].includes(status.status)) {
            break;
          }
        }
      }
    },
    [checkPremiumStatus],
  );

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
    return required.includes(currentPlan);
  };

  const getFormattedPrice = () => `E${planConfig.price.toFixed(2)}`;

  const openUpgrade = async (planOrEvent?: PlanTier | React.MouseEvent, paymentMethods?: string[]) => {
    const targetPlan = (typeof planOrEvent === 'string' ? planOrEvent : undefined) || getNextPlan();
    const productId = PRODUCT_IDS[targetPlan];
    if (!productId) {
      toast.error('This plan is not available for purchase.');
      return;
    }

    const customerEmail = user?.email;
    if (!customerEmail) {
      toast.error('Please sign in to upgrade');
      return;
    }

    setCreatingPayment(true);
    try {
      // Ask our backend to create the Dodo checkout (server-side, with the
      // authoritative product/price). The backend returns an in-app checkout
      // URL and an internal payment reference.
      const result = await createPayment({
        productId,
        customerEmail,
        customerName: user?.user_metadata?.full_name || 'Customer',
        paymentMethods,
        returnUrl: window.location.origin + '/upgrade',
        billingAddress: {
          country: (user?.user_metadata?.country_code as string) || 'SZ',
          city: (user?.user_metadata?.city as string) || 'Mbabane',
          state: (user?.user_metadata?.state as string) || 'Hhohho',
          street: (user?.user_metadata?.street as string) || 'N/A',
          zipcode: (user?.user_metadata?.zipcode as string) || 'H100',
        },
      });

      // Open the checkout IN-APP. The user never leaves the application and we
      // never redirect to a hosted checkout link. Activation is performed only
      // by the verified backend webhook (polled below), never by the client.
      await openDodoCheckout(result.checkoutUrl, {
        onCompleted: () => {
          void pollUntilActive(result.paymentId);
        },
      });
    } catch (err: any) {
      console.error('[openUpgrade] Checkout error:', err);
      toast.error(err?.message || 'Failed to start checkout. Please try again.');
    } finally {
      setCreatingPayment(false);
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
    creatingPayment,
    isPremium,
    currentPlan,
    hasFeature,
    loadingPremium,
    trialDaysLeft,
     getFormattedPrice,
    refreshPremiumStatus: checkPremiumStatus,
    PLANS,
    PLAN_ORDER,
    FEATURE_GATES,
  };
};
