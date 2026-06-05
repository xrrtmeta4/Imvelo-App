import { useState, useEffect } from 'react';
import WeatherCard from '@/components/WeatherCard';
import WeatherTicker from '@/components/WeatherTicker';
import AIChatbot from '@/components/AIChatbot';
import MarketplacePromoModal from '@/components/MarketplacePromoModal';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/lib/supabase';
import { Sprout, Crown, ChevronDown, ChevronUp, Cloud, Store, Users, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import heroTractor from '@/assets/hero-tractor.jpg.asset.json';

const Index = () => {
  const { isPremium } = useUsageLimits();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string | null>(null);
  const [weatherOpen, setWeatherOpen] = useState(false);

  useEffect(() => {
    const fetchUserName = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();
      if (data?.full_name) {
        setUserName(data.full_name.split(' ')[0]);
      }
    };
    fetchUserName();
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <WeatherTicker />
      
      <header className="relative overflow-hidden text-primary-foreground min-h-[70vh] flex flex-col">
        <img
          src={heroTractor.url}
          alt="Tractor at sunset in field"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/30 to-black/85" />
        <div className="relative flex-1 flex flex-col max-w-screen-sm mx-auto w-full px-4 pt-6 pb-10">
          <div className="flex justify-between items-start">
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-full border border-white/20">
              <Sprout className="w-8 h-8" />
            </div>
            <LanguageSwitcher />
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
