import { useEffect, useState, useCallback } from 'react';
import {
  initializeAdMob,
  showBannerAd,
  hideBannerAd,
  removeBannerAd,
  showInterstitialAd,
  showRewardedAd,
  isAdMobAvailable,
  addAdMobListener,
  setTestMode,
  requestConsent,
  type RewardedResult,
  type AdMobListener,
} from '@/lib/admob';
import { useAuth } from '@/hooks/useAuth';

export const useAdMob = () => {
  const { user } = useAuth();
  const [available, setAvailable] = useState(false);
  const [ready, setReady] = useState(false);
  const [consentReady, setConsentReady] = useState(false);

  useEffect(() => {
    if (import.meta.env.MODE === 'development') setTestMode(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isAdMobAvailable()) {
        if (!cancelled) setAvailable(false);
        return;
      }
      if (!cancelled) setAvailable(true);
      const ok = await initializeAdMob();
      if (!cancelled) setReady(ok);
      try {
        await requestConsent();
      } catch {
        /* consent optional on web/dev */
      }
      if (!cancelled) setConsentReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const showBanner = useCallback(async () => {
    if (!ready) return;
    await showBannerAd();
  }, [ready]);

  const hideBanner = useCallback(async () => {
    if (!ready) return;
    await hideBannerAd();
  }, [ready]);

  const showInterstitial = useCallback(async () => {
    if (!ready) return false;
    return showInterstitialAd();
  }, [ready]);

  const showRewarded = useCallback(async (): Promise<RewardedResult> => {
    if (!ready) return { earned: false };
    return showRewardedAd();
  }, [ready]);

  return { available, ready, consentReady, showBanner, hideBanner, showInterstitial, showRewarded };
};

export type { AdMobListener, RewardedResult };
export { addAdMobListener };
