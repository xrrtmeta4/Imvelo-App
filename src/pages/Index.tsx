import { useState, useEffect } from 'react';
import WeatherCard from '@/components/WeatherCard';
import WeatherTicker from '@/components/WeatherTicker';
import BestPractices from '@/components/BestPractices';
import ExtensionServices from '@/components/ExtensionServices';
import AIChatbot from '@/components/AIChatbot';
import { useUsageLimits, PlanTier } from '@/hooks/useUsageLimits';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/lib/supabase';
import { Sprout, Crown, Leaf, CloudLightning, Scan, Droplets, Beef, RotateCcw, FlaskConical, Wheat, Bell, Package, TreePine, ShieldCheck, Lock, ChevronDown, ChevronUp, Cloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

const PLAN_ORDER: PlanTier[] = ['free', 'starter', 'premium'];

const Index = () => {
  const { isPremium, currentPlan } = useUsageLimits();
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

  const featureButtons: { icon: any; label: string; sub: string; path: string; color: string; iconBg: string; iconColor: string; requiredPlan: PlanTier }[] = [
    { icon: Leaf, label: t('cropMonitor'), sub: t('aiHealthScan'), path: '/crop-monitoring', color: 'bg-primary/10 border-primary/20 hover:bg-primary/20', iconBg: 'bg-primary/20', iconColor: 'text-primary', requiredPlan: 'free' },
    { icon: CloudLightning, label: t('climateRisk'), sub: t('volatilityEngine'), path: '/climate-risk', color: 'bg-destructive/10 border-destructive/20 hover:bg-destructive/20', iconBg: 'bg-destructive/20', iconColor: 'text-destructive', requiredPlan: 'free' },
    { icon: Scan, label: t('healthScan'), sub: t('pestSoilDisease'), path: '/scanner', color: 'bg-accent border-accent-foreground/10 hover:bg-accent/80', iconBg: 'bg-primary/20', iconColor: 'text-primary', requiredPlan: 'free' },
    { icon: Droplets, label: t('irrigation'), sub: t('rainWaterAdvisor'), path: '/smart-irrigation', color: 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20', iconBg: 'bg-blue-500/20', iconColor: 'text-blue-500', requiredPlan: 'free' },
    { icon: Beef, label: 'Livestock', sub: 'Track & manage', path: '/livestock', color: 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20', iconBg: 'bg-amber-500/20', iconColor: 'text-amber-600', requiredPlan: 'premium' },
    { icon: RotateCcw, label: 'Crop Rotation', sub: 'Plan rotations', path: '/crop-rotation', color: 'bg-green-500/10 border-green-500/20 hover:bg-green-500/20', iconBg: 'bg-green-500/20', iconColor: 'text-green-600', requiredPlan: 'premium' },
    { icon: FlaskConical, label: 'Fertilizer', sub: 'NPK calculator', path: '/fertilizer', color: 'bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20', iconBg: 'bg-purple-500/20', iconColor: 'text-purple-600', requiredPlan: 'premium' },
    { icon: Wheat, label: 'Harvests', sub: 'Track yields', path: '/harvest-tracker', color: 'bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20', iconBg: 'bg-yellow-500/20', iconColor: 'text-yellow-600', requiredPlan: 'premium' },
    { icon: Bell, label: 'Price Alerts', sub: 'Market targets', path: '/price-alerts', color: 'bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20', iconBg: 'bg-indigo-500/20', iconColor: 'text-indigo-600', requiredPlan: 'premium' },
    { icon: Package, label: 'Inventory', sub: 'Track supplies', path: '/inventory', color: 'bg-teal-500/10 border-teal-500/20 hover:bg-teal-500/20', iconBg: 'bg-teal-500/20', iconColor: 'text-teal-600', requiredPlan: 'premium' },
    { icon: TreePine, label: 'Carbon Score', sub: 'Sustainability', path: '/carbon-score', color: 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20', iconBg: 'bg-emerald-500/20', iconColor: 'text-emerald-600', requiredPlan: 'premium' },
    { icon: ShieldCheck, label: 'Post-Harvest', sub: 'Reduce losses', path: '/post-harvest', color: 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20', iconBg: 'bg-red-500/20', iconColor: 'text-red-600', requiredPlan: 'premium' },
  ];

  const currentIndex = PLAN_ORDER.indexOf(currentPlan);

  const isLocked = (requiredPlan: PlanTier) => {
    return PLAN_ORDER.indexOf(requiredPlan) > currentIndex;
  };

  const handleFeatureClick = (btn: typeof featureButtons[0]) => {
    if (isLocked(btn.requiredPlan)) {
      navigate('/upgrade');
    } else {
      navigate(btn.path);
    }
  };

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
          {featureButtons.map((btn) => {
            const locked = isLocked(btn.requiredPlan);
            return (
              <button
                key={btn.path}
                onClick={() => handleFeatureClick(btn)}
                className={`relative flex items-center gap-3 p-4 rounded-xl border transition-colors text-left ${btn.color} ${locked ? 'opacity-60' : ''}`}
              >
                <div className={`${btn.iconBg} p-2.5 rounded-lg`}>
                  <btn.icon className={`w-5 h-5 ${btn.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs text-foreground">{btn.label}</p>
                  <p className="text-[10px] text-muted-foreground">{btn.sub}</p>
                </div>
                {locked && (
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[9px] font-medium text-muted-foreground uppercase">
                      {btn.requiredPlan === 'enterprise' ? 'Ent' : 'Pro'}
                    </span>
                  </div>
                )}
              </button>
            );
          })}
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
    </div>
  );
};

export default Index;
