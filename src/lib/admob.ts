import { AdMob, AdmobConsentStatus } from '@capacitor-community/admob';
import type { AdLoadInfo, AdMobError, AdMobRevenueData, AdMobRewardItem } from '@capacitor-community/admob';
import { BannerAdPosition, BannerAdSize } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

const APP_ID =
  (import.meta as any).env?.VITE_ADMOB_APP_ID ||
  'ca-app-pub-2820576027993732~9156840256';

export const AD_UNIT_IDS = {
  banner: 'ca-app-pub-3940256099942544/6118445713',
  interstitial: 'ca-app-pub-3940256099942544/1033173711',
  rewarded: 'ca-app-pub-3940256099942544/1525184699',
};

export interface AdMobListener {
  onLoaded?: () => void;
  onFailedToLoad?: (err: AdMobError) => void;
  onOpened?: () => void;
  onClosed?: () => void;
  onAdImpression?: () => void;
  onAdPaid?: (data: AdMobRevenueData) => void;
}

let initialized = false;
let testMode = false;
let listeners: AdMobListener[] = [];

export const addAdMobListener = (l: AdMobListener) => listeners.push(l);
const notify = (k: keyof AdMobListener, ...a: any[]) =>
  listeners.forEach((l) => (l[k] as any)?.(...a));

export const isAdMobAvailable = () => Capacitor.isPluginAvailable('AdMob');

export const setTestMode = (v: boolean) => {
  testMode = v;
};

export const initializeAdMob = async (): Promise<boolean> => {
  if (initialized) return true;
  try {
    await AdMob.initialize({
      testingDevices: testMode ? [] : undefined,
    });
    initialized = true;
    return true;
  } catch (e) {
    console.error('[AdMob] initialize failed', e);
    return false;
  }
};

export const requestConsent = async (): Promise<void> => {
  try {
    const info = await AdMob.requestConsentInfo();
    if (info?.status === AdmobConsentStatus.REQUIRED) {
      await AdMob.showConsentForm();
    }
  } catch (e) {
    console.warn('[AdMob] consent request skipped', e);
  }
};

export const showBannerAd = async (): Promise<void> => {
  if (!initialized) await initializeAdMob();
  try {
    await AdMob.showBanner({
      adId: AD_UNIT_IDS.banner,
      adSize: BannerAdSize.ADAPTIVE_BANNER,
      position: BannerAdPosition.BOTTOM_CENTER,
      npa: false,
      margin: 0,
    });
  } catch (e) {
    notify('onFailedToLoad', e);
  }
};

export const hideBannerAd = async (): Promise<void> => {
  try {
    await AdMob.hideBanner();
  } catch (e) {
    console.warn('[AdMob] hideBanner', e);
  }
};

export const showInterstitialAd = async (adId?: string): Promise<boolean> => {
  if (!initialized) await initializeAdMob();
  try {
    const info: AdLoadInfo = await AdMob.prepareInterstitial({
      adId: adId ?? AD_UNIT_IDS.interstitial,
      isTesting: testMode,
    });
    await AdMob.showInterstitial({ adId: info.adUnitId });
    return true;
  } catch (e) {
    notify('onFailedToLoad', e);
    return false;
  }
};

export interface RewardedResult {
  earned: boolean;
  rewardType?: string | null;
  rewardAmount?: number | null;
}

export const showRewardedAd = async (adId?: string): Promise<RewardedResult> => {
  if (!initialized) await initializeAdMob();
  try {
    const info: AdLoadInfo = await AdMob.prepareRewardVideoAd({
      adId: adId ?? AD_UNIT_IDS.rewarded,
      isTesting: testMode,
    });
    const reward: AdMobRewardItem | undefined = await AdMob.showRewardVideoAd({ adId: info.adUnitId });
    return {
      earned: true,
      rewardType: reward?.type ?? null,
      rewardAmount: reward?.amount ?? null,
    };
  } catch (e) {
    notify('onFailedToLoad', e);
    return { earned: false };
  }
};

export const removeBannerAd = async (): Promise<void> => {
  try {
    await AdMob.removeBanner();
  } catch (e) {
    console.warn('[AdMob] removeBanner', e);
  }
};
