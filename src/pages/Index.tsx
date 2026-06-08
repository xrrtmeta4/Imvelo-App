import { useState, useEffect, useCallback } from 'react';
import WeatherCard from '@/components/WeatherCard';
import WeatherTicker from '@/components/WeatherTicker';
import AIChatbot from '@/components/AIChatbot';
import MarketplacePromoModal from '@/components/MarketplacePromoModal';
import NotificationBell from '@/components/NotificationBell';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/lib/supabase';
import { Sprout, Crown, ChevronDown, ChevronUp, Cloud, Store, Users, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import heroImage from '@/assets/download (30).jpeg';

const Index = () => {
  const { isPremium } = useUsageLimits();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [weatherOpen, setWeatherOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(true);
  const [homeAlerts, setHomeAlerts] = useState<any[]>([]);
  const [marketAds, setMarketAds] = useState<any[]>([]);
  const [homeLoading, setHomeLoading] = useState(true);

  const fetchHomeData = useCallback(async () => {
    if (!user) return;
    setHomeLoading(true);

    const [{ data: alerts, error: alertsError }, { data: listings }] = await Promise.all([
      supabase
        .from('weather_alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('marketplace_listings')
        .select('id, title, price, description')
        .order('created_at', { ascending: false })
        .limit(3),
    ]);

    if (!alertsError && alerts) {
      setHomeAlerts(alerts);
    }
    if (listings) {
      setMarketAds(listings);
    }
    setHomeLoading(false);
  }, [user]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();
      if (data?.full_name) {
        setUserName(data.full_name.split(' ')[0]);
      }
      if (data?.avatar_url) {
        setAvatarUrl(data.avatar_url);
      }
    };
    fetchProfile();
    fetchHomeData();
  }, [user, fetchHomeData]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('home-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'weather_alerts',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          fetchHomeData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'marketplace_listings'
        },
        () => {
          fetchHomeData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchHomeData]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <WeatherTicker />
      
      <header className="relative overflow-hidden text-primary-foreground min-h-[70vh] flex flex-col">
        <img
          src={heroImage}
          alt="Agriculture hero background"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/30 to-black/85" />
        <div className="relative flex-1 flex flex-col max-w-screen-sm mx-auto w-full px-4 pt-6 pb-10">
          <div className="flex justify-between items-center gap-3">
            <div className="bg-white/10 backdrop-blur-sm p-1 rounded-full border border-white/20">
              {avatarUrl ? (
                <Avatar className="h-10 w-10">
                  <AvatarImage src={avatarUrl} alt="User avatar" />
                  <AvatarFallback>{userName ? userName.charAt(0) : 'U'}</AvatarFallback>
                </Avatar>
              ) : (
                <div className="flex h-10 w-10 items-center justify-center">
                  <Sprout className="w-7 h-7" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <LanguageSwitcher />
            </div>
          </div>
          <div className="mt-auto">
            <h1 className="text-4xl font-bold mb-2 drop-shadow-lg">
              {userName ? `Hi, ${userName}!` : 'Imvelo'}
            </h1>
            <p className="text-white/90 text-base drop-shadow">{t('farmersBestFriend')}</p>

            {!isPremium && (
              <Button
                onClick={() => navigate('/upgrade')}
                variant="secondary"
                className="mt-5 gap-2"
              >
                <Crown className="w-4 h-4" />
                {t('upgrade')}
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        <a
          href="https://imvelomarketplace.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/15">
              <Store className="w-5 h-5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm text-foreground">Imvelo Marketplace</p>
              <p className="text-[11px] text-muted-foreground">Buy & sell farm produce online</p>
            </div>
          </div>
          <span className="text-xs font-medium text-primary">Open →</span>
        </a>

        <div className="grid gap-5">
          <Collapsible open={alertsOpen} onOpenChange={setAlertsOpen}>
            <div className="rounded-3xl border border-border bg-card overflow-hidden">
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left text-sm font-semibold text-foreground hover:bg-accent/50 transition-colors">
                  <div>
                    <p>Critical weather alerts</p>
                    <p className="text-xs text-muted-foreground">Detected in your area and updated in real time</p>
                  </div>
                  <div className="inline-flex items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {homeAlerts.length} alert{homeAlerts.length === 1 ? '' : 's'}
                    </span>
                    {alertsOpen ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="p-4">
                {homeLoading ? (
                  <div className="space-y-3">
                    <div className="h-12 rounded-xl bg-border animate-pulse" />
                    <div className="h-12 rounded-xl bg-border animate-pulse" />
                  </div>
                ) : homeAlerts.length > 0 ? (
                  <div className="space-y-3">
                    {homeAlerts.map((alert) => (
                      <div key={alert.id} className="rounded-2xl border border-border bg-background p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{alert.message}</p>
                            <p className="text-xs text-muted-foreground mt-1">{new Date(alert.created_at).toLocaleString()}</p>
                          </div>
                          <span className="rounded-full bg-orange-500/10 px-2 py-1 text-[11px] font-semibold text-orange-700">
                            {alert.severity || 'Medium'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                    No critical weather alerts found in your area. We'll notify you automatically when conditions change.
                  </div>
                )}
              </CollapsibleContent>
            </div>
          </Collapsible>

          <section className="rounded-3xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <p className="text-sm font-semibold text-foreground">Imvelo Marketplace adverts</p>
                <p className="text-xs text-muted-foreground">Fresh listings from the marketplace</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {marketAds.length} item{marketAds.length === 1 ? '' : 's'}
              </span>
            </div>

            {homeLoading ? (
              <div className="space-y-3">
                <div className="h-12 rounded-xl bg-border animate-pulse" />
                <div className="h-12 rounded-xl bg-border animate-pulse" />
              </div>
            ) : marketAds.length > 0 ? (
              <div className="space-y-3">
                {marketAds.map((listing) => (
                  <a
                    key={listing.id}
                    href="https://imvelomarketplace.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-2xl border border-border bg-background p-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{listing.title}</p>
                      <span className="text-xs font-medium text-primary">${listing.price}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{listing.description}</p>
                  </a>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
                No marketplace adverts available right now. Check again soon for fresh offers.
              </div>
            )}
          </section>
        </div>

        <Collapsible open={weatherOpen} onOpenChange={setWeatherOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-border bg-card hover:bg-accent/50 transition-colors">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Cloud className="w-4 h-4 text-primary" />
                {t('weatherForecast')}
              </div>
              {weatherOpen ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <WeatherCard />
          </CollapsibleContent>
        </Collapsible>

        <div className="grid grid-cols-1 gap-6">
          <button
            onClick={() => navigate('/extension-directory')}
            className="w-full text-left rounded-xl border border-border bg-card p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/15">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm text-foreground">Extension Services</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Contacts for agricultural extension officers across every African country.
                </p>
                <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-primary">
                  <Phone className="w-3 h-3" /> Find an officer →
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>
      <AIChatbot />
      <MarketplacePromoModal />
    </div>
  );
};

export default Index;
