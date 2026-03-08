import { useState, useEffect } from 'react';
import WeatherCard from '@/components/WeatherCard';
import WeatherTicker from '@/components/WeatherTicker';
import BestPractices from '@/components/BestPractices';
import ExtensionServices from '@/components/ExtensionServices';
import AIChatbot from '@/components/AIChatbot';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/lib/supabase';
import { Sprout, Crown, Leaf, CloudLightning, Scan, Droplets } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  
  const { isPremium } = useUsageLimits();
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [userName, setUserName] = useState<string | null>(null);

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
      
      <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-8 px-4">
        <div className="max-w-screen-sm mx-auto">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-primary-foreground/10 p-3 rounded-full">
              <Sprout className="w-10 h-10" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {userName ? `Hi, ${userName}!` : 'Imvelo'}
          </h1>
          <p className="text-primary-foreground/90">{t('farmersBestFriend')}</p>
          
          {!isPremium && (
            <Button 
              onClick={() => navigate('/upgrade')}
              variant="secondary"
              className="mt-4 gap-2"
            >
              <Crown className="w-4 h-4" />
              {t('upgrade')}
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/crop-monitoring')}
            className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors text-left"
          >
            <div className="bg-primary/20 p-2.5 rounded-lg">
              <Leaf className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-xs text-foreground">{t('cropMonitor')}</p>
              <p className="text-[10px] text-muted-foreground">{t('aiHealthScan')}</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/climate-risk')}
            className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/20 hover:bg-destructive/20 transition-colors text-left"
          >
            <div className="bg-destructive/20 p-2.5 rounded-lg">
              <CloudLightning className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <p className="font-semibold text-xs text-foreground">{t('climateRisk')}</p>
              <p className="text-[10px] text-muted-foreground">{t('volatilityEngine')}</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/scanner')}
            className="flex items-center gap-3 p-4 rounded-xl bg-accent border border-accent-foreground/10 hover:bg-accent/80 transition-colors text-left"
          >
            <div className="bg-primary/20 p-2.5 rounded-lg">
              <Scan className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-xs text-foreground">{t('healthScan')}</p>
              <p className="text-[10px] text-muted-foreground">{t('pestSoilDisease')}</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/smart-irrigation')}
            className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-colors text-left"
          >
            <div className="bg-blue-500/20 p-2.5 rounded-lg">
              <Droplets className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="font-semibold text-xs text-foreground">{t('irrigation')}</p>
              <p className="text-[10px] text-muted-foreground">{t('rainWaterAdvisor')}</p>
            </div>
          </button>
        </div>

        <WeatherCard />
        <div className="grid grid-cols-1 gap-6">
          <ExtensionServices />
          <BestPractices />
        </div>
      </div>
      <AIChatbot />
    </div>
  );
};

export default Index;
