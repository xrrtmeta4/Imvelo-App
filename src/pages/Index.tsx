import { useState, useEffect, useCallback } from 'react';
import WeatherCard from '@/components/WeatherCard';
import WeatherTicker from '@/components/WeatherTicker';
import AIChatbot from '@/components/AIChatbot';
import NotificationBell from '@/components/NotificationBell';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/lib/supabase';
import { Sprout, Crown, ChevronDown, ChevronUp, Cloud, Users, Phone } from 'lucide-react';
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
  }, [user]);

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
        <div className="grid gap-5">
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
    </div>
  );
};

export default Index;
