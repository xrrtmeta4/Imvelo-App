import { useState, useEffect } from 'react';
import WeatherTicker from '@/components/WeatherTicker';
import HeroWeather from '@/components/HeroWeather';
import NotificationBell from '@/components/NotificationBell';
import SEO from '@/components/SEO';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/lib/supabase';
import { Sprout, Crown, Store, Users, Phone, Sparkles, AlertTriangle, GraduationCap, Mic, MicOff, Pause, Satellite, Beef } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import TalkBack from '@/components/TalkBack';
import heroImage from '@/assets/download (30).jpeg';
import UpgradeNudge from '@/components/UpgradeNudge';
import NativeAdCard from '@/components/NativeAdCard';

const Index = () => {
  const { isPremium } = useUsageLimits();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
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
      <SEO
        title="Imvelo — Modern Farming Assistant for Eswatini"
        description="AI pest scanning, weather alerts, and farm management for African farmers. Get advice, forecasts, and extension contacts in one app."
        path="/"
      />
      <WeatherTicker />

      <header className="hero-forest text-primary-foreground rounded-b-[2rem] shadow-xl">
        <div className="max-w-screen-sm mx-auto w-full px-4 pt-5 pb-6">
          <div className="flex justify-between items-center gap-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-11 w-11 border border-primary-foreground/20">
                {avatarUrl && <AvatarImage src={avatarUrl} alt="User avatar" />}
                <AvatarFallback className="bg-primary-foreground/10 text-primary-foreground">
                  {userName ? userName.charAt(0) : <Sprout className="w-5 h-5" />}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs opacity-80">Hi, {userName || 'Farmer'}</p>
                <h1 className="text-lg font-semibold leading-tight">Welcome back!</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <LanguageSwitcher />
            </div>
          </div>

          <div className="glass-forest mt-5 rounded-3xl p-4">
            <HeroWeather />
          </div>

          <div className="mt-3 flex items-center gap-3 glass-forest rounded-2xl p-3">
            <TalkBack aria-label="Read this page aloud" />
            <p className="flex-1 text-xs opacity-90">Tap to have this page read aloud.</p>
            {!isPremium && (
              <Button onClick={() => navigate('/upgrade')} size="sm" variant="secondary" className="gap-1 rounded-full">
                <Crown className="w-4 h-4" />
                {t('upgrade')}
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        <UpgradeNudge />

        <section>
          <h2 className="text-xl font-bold text-foreground mb-3">My Farm Tools</h2>
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4">
            {[
              { title: 'Satellite Farm Monitor', desc: 'See your farm from above and track pests in real time.', icon: Satellite, go: () => navigate('/satellite-monitor') },
              { title: 'Ask Chloe AI', desc: 'Chat with your AI farming assistant — text or voice.', icon: Sparkles, go: () => navigate('/ai-chat') },
              { title: 'Livestock Manager', desc: 'Health checks, breeding and feeding schedules.', icon: Beef, go: () => navigate('/livestock') },
              { title: 'Imvelo Agri Academy', desc: 'Courses and certified training from Imvelo.', icon: GraduationCap, go: () => window.open('https://imveloagriacademy.vercel.app', '_blank', 'noopener,noreferrer') },
            ].map(({ title, desc, icon: Icon, go }) => (
              <button key={title} onClick={go} className="shrink-0 w-64 text-left rounded-3xl bg-card border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="relative h-32">
                  <img src={heroImage} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  <div className="absolute top-2 right-2 rounded-full glass-forest p-2 text-primary-foreground">
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-bold text-foreground">{title}</p>
                  <p className="text-sm text-muted-foreground mt-1">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        <button
          onClick={() => { window.location.href = 'https://imvelomarketplace.vercel.app'; }}
          className="w-full flex items-center justify-between rounded-3xl hero-forest text-primary-foreground p-4"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full glass-forest p-3"><Store className="w-5 h-5" /></div>
            <div className="text-left">
              <p className="font-semibold text-sm">Imvelo Marketplace</p>
              <p className="text-xs opacity-80">Shop and sell farm goods.</p>
            </div>
          </div>
          <span className="rounded-full bg-primary-foreground text-foreground text-xs font-semibold px-3 py-1">Go</span>
        </button>

        <NativeAdCard />
      </main>
    </div>
  );
};

export default Index;
