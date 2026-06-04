import { useState, useEffect } from 'react';
import WeatherCard from '@/components/WeatherCard';
import WeatherTicker from '@/components/WeatherTicker';
import BestPractices from '@/components/BestPractices';
import ExtensionServices from '@/components/ExtensionServices';
import AIChatbot from '@/components/AIChatbot';
import MarketplacePromoModal from '@/components/MarketplacePromoModal';
import { useUsageLimits, PlanTier } from '@/hooks/useUsageLimits';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/lib/supabase';
import { Sprout, Crown, CloudLightning, Droplets, ChevronDown, ChevronUp, Cloud, Store, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { trackFeatureUsage } from '@/lib/interactionTracker';
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

  const featureButtons = [
    { icon: Droplets, label: t('irrigation'), sub: t('rainWaterAdvisor'), path: '/smart-irrigation', iconBg: 'bg-blue-500/20', iconColor: 'text-blue-500', color: 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20' },
    { icon: CloudLightning, label: t('climateRisk'), sub: t('volatilityEngine'), path: '/climate-risk', iconBg: 'bg-destructive/20', iconColor: 'text-destructive', color: 'bg-destructive/10 border-destructive/20 hover:bg-destructive/20' },
    { icon: Cloud, label: t('weatherForecast'), sub: t('farmersBestFriend'), path: '/weather', iconBg: 'bg-primary/20', iconColor: 'text-primary', color: 'bg-primary/10 border-primary/20 hover:bg-primary/20' },
    { icon: Users, label: t('extensionServices'), sub: t('callExtensionOfficers'), path: '/extension-directory', iconBg: 'bg-amber-500/20', iconColor: 'text-amber-600', color: 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20' },
  ];

  const handleFeatureClick = (btn: typeof featureButtons[0]) => {
    trackFeatureUsage(btn.label);
    navigate(btn.path);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <WeatherTicker />
      
      <header className="relative overflow-hidden text-primary-foreground">
        <img
          src={heroTractor.url}
          alt="Tractor at sunset in field"
          className="absolute inset-0 w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/80" />
        <div className="relative max-w-screen-sm mx-auto px-4 pt-6 pb-10">
          <div className="flex justify-between items-start mb-20">
            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-full border border-white/20">
              <Sprout className="w-8 h-8" />
            </div>
            <LanguageSwitcher />
          </div>
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

        <div className="grid grid-cols-2 gap-3">
          {featureButtons.map((btn) => (
            <button
              key={btn.path}
              onClick={() => handleFeatureClick(btn)}
              className={`relative flex items-center gap-3 p-4 rounded-xl border transition-colors text-left ${btn.color}`}
            >
              <div className={`${btn.iconBg} p-2.5 rounded-lg`}>
                <btn.icon className={`w-5 h-5 ${btn.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs text-foreground">{btn.label}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-2">{btn.sub}</p>
              </div>
            </button>
          ))}
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
          <ExtensionServices />
          <BestPractices />
        </div>
      </div>
      <AIChatbot />
      <MarketplacePromoModal />
    </div>
  );
};

export default Index;
