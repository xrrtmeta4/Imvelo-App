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

const NativeAd = (registerPlugin as any)('ImveloNativeAd') as ImveloNativeAdPlugin | null;

let availabilityChecked = false;
let nativeAvailable = false;
const checkNativeAvailable = async (): Promise<boolean> => {
  if (availabilityChecked) return nativeAvailable;
  availabilityChecked = true;
  if (!NativeAd) return false;
  try {
    await NativeAd.loadAd({ adUnitId: 'ca-app-pub-3940256099942544/2247696110' });
    nativeAvailable = true;
  } catch {
    nativeAvailable = false;
  }
  return nativeAvailable;
};

export const isNativeAdAvailable = (): boolean => {
  if (availabilityChecked) return nativeAvailable;
  // Optimistic: the proxy exists if Capacitor registered the plugin.
  // A real probe happens in loadNativeAd.
  return !!NativeAd;
};

export interface LoadResult { asset: NativeAdAsset | null; error: string | null }

export const loadNativeAd = async (adUnitId = 'ca-app-pub-2820576027993732/5824833394'): Promise<LoadResult> => {
  if (!NativeAd) {
    return { asset: null, error: '[ImveloNativeAd] not available on this platform' };
  }
  try {
    const asset = await NativeAd.loadAd({ adUnitId });
    return { asset, error: null };
  } catch (e: any) {
    const msg = e?.message ?? e?.toString?.() ?? 'unknown error';
    console.warn('[ImveloNativeAd] load failed', e);
    return { asset: null, error: String(msg) };
  }
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
