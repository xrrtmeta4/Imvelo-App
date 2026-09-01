import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Gift, PauseCircle, PlayCircle, RefreshCw } from 'lucide-react';
import { useAdMob, addAdMobListener } from '@/hooks/useAdMob';
import { hideBannerAd } from '@/lib/admob';
import { toast } from 'sonner';

export default function AdBanner() {
  const { available, ready, showBanner, hideBanner, showInterstitial, showRewarded } = useAdMob();
  const [rewardedLoading, setRewardedLoading] = useState(false);
  const [interstitialLoading, setInterstitialLoading] = useState(false);

  useEffect(() => {
    addAdMobListener({
      onAdPaid: (data) => {
        const value = (data as unknown as { value?: number })?.value;
        if (value) {
          toast.success(`Ad revenue: $${Number(value).toFixed(4)}`);
        }
      },
      onFailedToLoad: (err: any) => {
        console.debug('[AdMob] load fail', err?.message ?? err);
      },
    });
  }, []);

   useEffect(() => {
    if (!ready) {
      void hideBanner();
      return;
    }
    void showBanner();
    return () => {
      void hideBanner();
    };
  }, [ready, showBanner, hideBanner]);

  const handleRewarded = async () => {
    setRewardedLoading(true);
    try {
      const res = await showRewarded();
      if (res?.earned) {
        toast.success(`Reward earned: ${res.rewardType} x${res.rewardAmount}`);
      } else {
        toast.error('Reward not earned. Please watch the full video.');
      }
    } catch (e) {
      console.debug('[AdMob] rewarded error', e);
    } finally {
      setRewardedLoading(false);
    }
  };

  const handleInterstitial = async () => {
    setInterstitialLoading(true);
    try {
      await showInterstitial();
    } catch (e) {
      console.debug('[AdMob] interstitial error', e);
    } finally {
      setInterstitialLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="flex justify-center p-3">
        <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 flex justify-center bg-background/80 backdrop-blur py-2 z-40">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRewarded}
          disabled={rewardedLoading}
          aria-label="Watch rewarded video"
        >
          {rewardedLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Gift className="h-4 w-4 mr-1" />
          )}
          Watch video
        </Button>
      </div>
      <button
        onClick={handleInterstitial}
        disabled={interstitialLoading}
        className="fixed bottom-4 right-4 z-40 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground p-2 shadow-lg disabled:opacity-60"
        aria-label={interstitialLoading ? 'Loading ad' : 'Show interstitial'}
      >
        {interstitialLoading ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : (
          <PlayCircle className="h-5 w-5" />
        )}
      </button>
    </>
  );
}

export const hideAdBanner = () => hideBannerAd();
