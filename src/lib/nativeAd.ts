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

export const isNativeAdAvailable = () => !!NativeAd;

export const loadNativeAd = async (adUnitId = 'ca-app-pub-2820576027993732/5824833394'): Promise<NativeAdAsset | null> => {
  if (!NativeAd) {
    console.debug('[ImveloNativeAd] not available on this platform');
    return null;
  }
  try {
    return await NativeAd.loadAd({ adUnitId });
  } catch (e: any) {
    console.warn('[ImveloNativeAd] load failed', e?.message ?? e);
    return null;
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
