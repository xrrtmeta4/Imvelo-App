import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, Info, RefreshCw } from 'lucide-react';
import {
  loadNativeAd,
  destroyNativeAd,
  isNativeAdAvailable,
  type NativeAdAsset,
} from '@/lib/nativeAd';

type LoadState = 'loading' | 'ready' | 'error';

export default function NativeAdCard() {
  const [asset, setAsset] = useState<NativeAdAsset | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [debug, setDebug] = useState<string | null>(
    import.meta.env.MODE === 'development' ? 'checking availability…' : null
  );
  const [key, setKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    (async () => {
      if (!isNativeAdAvailable()) {
        setState('error');
        setDebug(
          import.meta.env.MODE === 'development'
            ? 'ImveloNativeAd plugin not registered on this platform'
            : null
        );
        return;
      }
      setDebug(import.meta.env.MODE === 'development' ? 'loading native ad…' : null);

      const res = await loadNativeAd();
      const { asset: loaded, error } = res;
      if (cancelled) return;

      if (loaded) {
        setAsset(loaded);
        setState('ready');
        setDebug((res as { usedTestAd?: boolean }).usedTestAd ? '[using TEST ad unit]' : null);
      } else {
        setState('error');
        setDebug(error ?? null);
      }
    })();

    timer = setTimeout(() => {
      if (cancelled) return;
      if (state === 'loading') {
        setState('error');
        setDebug(
          import.meta.env.MODE === 'development'
            ? 'loadNativeAd timed out (no asset received)'
            : null
        );
      }
    }, 8000);

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [key]);

  const handleRetry = () => {
    setState('loading');
    setDebug(null);
    setAsset(null);
    // Force re-run the effect by toggling a key.
    setKey((k) => k + 1);
  };

  useEffect(() => () => { void destroyNativeAd(); }, []);

  if (!isNativeAdAvailable()) {
    return (
      <Card className="my-3 border border-amber-200 bg-amber-50/50">
        <CardContent className="py-3 flex items-center gap-2 text-xs text-amber-800">
          <Info className="h-4 w-4" />
          Ad slot (native plugin not available on this build/platform).
        </CardContent>
      </Card>
    );
  }

  if (state === 'loading') {
    return (
      <Card className="my-3 border border-border/40 animate-pulse">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Sponsored</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-3 w-3/4 bg-muted rounded mb-1" />
          <div className="h-3 w-1/2 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  if (state === 'error') {
    return (
      <Card className="my-3 border border-border/40 bg-muted/20">
        <CardContent className="py-3 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground break-all">
            {debug ?? 'Ad not loaded. Tap to retry.'}
          </span>
          <button
            onClick={handleRetry}
            className="ml-2 underline text-xs text-primary shrink-0"
          >
            retry
          </button>
        </CardContent>
      </Card>
    );
  }

  if (!asset) return null;

  return (
    <Card className="my-4 border border-border/50 bg-gradient-to-r from-background to-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground/90">
          {asset.headline || 'Sponsored'}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {asset.iconUrl && (
          <img
            src={asset.iconUrl}
            alt={asset.advertiser || 'Ad'}
            className="h-10 w-10 rounded object-contain"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        )}
        {asset.body && (
          <p className="text-xs text-muted-foreground mt-1">{asset.body}</p>
        )}
        {asset.imageUrls && asset.imageUrls.length > 0 && (
          <img
            src={asset.imageUrls[0]}
            alt="Ad media"
            className="mt-2 w-full h-24 object-cover rounded"
            loading="lazy"
          />
        )}
        {asset.callToAction && (
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(asset.headline)}`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="inline-flex items-center mt-2 text-xs font-medium text-primary underline"
          >
            {asset.callToAction}
            <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        )}
        {asset.starRating && asset.starRating > 0 && (
          <span className="mt-1 block text-xs text-yellow-500">
            {'★'.repeat(Math.min(5, Math.round(asset.starRating)))}
          </span>
        )}
      </CardContent>
    </Card>
  );
}
