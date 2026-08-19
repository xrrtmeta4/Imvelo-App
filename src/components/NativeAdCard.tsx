import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import {
  loadNativeAd,
  destroyNativeAd,
  isNativeAdAvailable,
  type NativeAdAsset,
} from '@/lib/nativeAd';
import { useUsageLimits } from '@/hooks/useUsageLimits';

export default function NativeAdCard() {
  const { isPremium } = useUsageLimits();
  const [asset, setAsset] = useState<NativeAdAsset | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isNativeAdAvailable() || isPremium) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    loadNativeAd().then((res) => {
      if (!cancelled) setAsset(res);
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [isPremium]);

  useEffect(() => () => { void destroyNativeAd(); }, []);

  if (isPremium || !asset || loading) return null;

  return (
    <Card className="my-4 border border-border/50 bg-gradient-to-r from-background to-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground/90">
          {asset.headline}
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
        {asset.body && <p className="text-xs text-muted-foreground mt-1">{asset.body}</p>}
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
        {asset.imageUrls && asset.imageUrls.length > 0 && (
          <img
            src={asset.imageUrls[0]}
            alt="Ad media"
            className="mt-2 w-full h-24 object-cover rounded"
            loading="lazy"
          />
        )}
      </CardContent>
    </Card>
  );
}
