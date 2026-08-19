import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

export interface NativeAdAsset {
  headline: string;
  body: string;
  callToAction: string;
  advertiser: string;
  store: string;
  price: string;
  starRating: number;
  iconUrl: string;
  imageUrls: string[];
}

export interface NativeAdListener {
  onFailed?: (err: string) => void;
  onPaid?: (data: { valueMicros: number; currencyCode: string; precision: string }) => void;
  onClicked?: () => void;
}

export interface ImveloNativeAdPlugin {
  loadAd(options?: { adUnitId?: string }): Promise<NativeAdAsset>;
  destroyAd(): Promise<void>;
  addListener(event: 'onNativeAdPaid', listener: (data: { valueMicros: number; currencyCode: string; precision: string }) => void): Promise<PluginListenerHandle>;
  addListener(event: 'onNativeAdClicked', listener: () => void): Promise<PluginListenerHandle>;
  addListener(event: 'onNativeAdFailed', listener: (err: { message: string; code: number }) => void): Promise<PluginListenerHandle>;
}

const TEST_AD_UNIT = 'ca-app-pub-3940256099942544/2247696110';
const PROD_AD_UNIT = 'ca-app-pub-2820576027993732/5824833394';

const NativeAd = (registerPlugin as any)('ImveloNativeAd') as ImveloNativeAdPlugin | null;

let availabilityChecked = false;
let nativeAvailable = false;
const checkNativeAvailable = async (): Promise<boolean> => {
  if (availabilityChecked) return nativeAvailable;
  availabilityChecked = true;
  if (!NativeAd) return false;
  try {
    const { asset } = await NativeAd.loadAd({ adUnitId: TEST_AD_UNIT });
    nativeAvailable = !!asset;
  } catch {
    nativeAvailable = false;
  }
  return nativeAvailable;
};

export const isNativeAdAvailable = (): boolean => {
  if (availabilityChecked) return nativeAvailable;
  return !!NativeAd;
};

export interface LoadResult {
  asset: NativeAdAsset | null;
  error: string | null;
  usedTestAd: boolean;
}

export const loadNativeAd = async (
  adUnitId: string | null = null
): Promise<LoadResult> => {
  if (!NativeAd) {
    return { asset: null, error: '[ImveloNativeAd] not available on this platform', usedTestAd: false };
  }
  const units = [adUnitId, PROD_AD_UNIT, TEST_AD_UNIT].filter(
    (v, i, a): v is string => !!v && a.indexOf(v) === i
  );
  let lastError = 'no ad unit attempted';
  for (const unit of units) {
    try {
      const asset = await NativeAd.loadAd({ adUnitId: unit });
      if (asset && asset.headline) {
        return { asset, error: null, usedTestAd: unit === TEST_AD_UNIT };
      }
      lastError = `loadAd(${unit}) resolved without assets`;
    } catch (e: any) {
      lastError = `${String(e?.message ?? e)} (${unit})`;
      console.warn('[ImveloNativeAd] failed for', unit, e);
    }
  }
  return { asset: null, error: lastError, usedTestAd: false };
};

export const destroyNativeAd = async (): Promise<void> => {
  if (NativeAd) await NativeAd.destroyAd();
};

export const addNativeAdListener = (listener: NativeAdListener): PluginListenerHandle[] => {
  if (!NativeAd) return [];
  const handles: PluginListenerHandle[] = [];
  if (listener.onPaid) {
    handles.push(NativeAd.addListener('onNativeAdPaid', listener.onPaid));
  }
  if (listener.onClicked) {
    handles.push(NativeAd.addListener('onNativeAdClicked', listener.onClicked));
  }
  if (listener.onFailed) {
    handles.push(
      NativeAd.addListener('onNativeAdFailed', (e: { message: string; code: number }) =>
        listener.onFailed!(e.message)
      )
    );
  }
  return handles;
};
