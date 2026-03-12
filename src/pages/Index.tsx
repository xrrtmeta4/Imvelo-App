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
import { Sprout, Crown, Leaf, CloudLightning, Scan, Droplets, Beef, RotateCcw, FlaskConical, Wheat, Bell, Package, TreePine, ShieldCheck } from 'lucide-react';
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

  const featureButtons = [
    { icon: Leaf, label: t('cropMonitor'), sub: t('aiHealthScan'), path: '/crop-monitoring', color: 'bg-primary/10 border-primary/20 hover:bg-primary/20', iconBg: 'bg-primary/20', iconColor: 'text-primary' },
    { icon: CloudLightning, label: t('climateRisk'), sub: t('volatilityEngine'), path: '/climate-risk', color: 'bg-destructive/10 border-destructive/20 hover:bg-destructive/20', iconBg: 'bg-destructive/20', iconColor: 'text-destructive' },
    { icon: Scan, label: t('healthScan'), sub: t('pestSoilDisease'), path: '/scanner', color: 'bg-accent border-accent-foreground/10 hover:bg-accent/80', iconBg: 'bg-primary/20', iconColor: 'text-primary' },
    { icon: Droplets, label: t('irrigation'), sub: t('rainWaterAdvisor'), path: '/smart-irrigation', color: 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20', iconBg: 'bg-blue-500/20', iconColor: 'text-blue-500' },
    { icon: Beef, label: 'Livestock', sub: 'Track & manage', path: '/livestock', color: 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20', iconBg: 'bg-amber-500/20', iconColor: 'text-amber-600' },
    { icon: RotateCcw, label: 'Crop Rotation', sub: 'Plan rotations', path: '/crop-rotation', color: 'bg-green-500/10 border-green-500/20 hover:bg-green-500/20', iconBg: 'bg-green-500/20', iconColor: 'text-green-600' },
    { icon: FlaskConical, label: 'Fertilizer', sub: 'NPK calculator', path: '/fertilizer', color: 'bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20', iconBg: 'bg-purple-500/20', iconColor: 'text-purple-600' },
    { icon: Wheat, label: 'Harvests', sub: 'Track yields', path: '/harvest-tracker', color: 'bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20', iconBg: 'bg-yellow-500/20', iconColor: 'text-yellow-600' },
    { icon: Bell, label: 'Price Alerts', sub: 'Market targets', path: '/price-alerts', color: 'bg-indigo-500/10 border-indigo-500/20 hover:bg-indigo-500/20', iconBg: 'bg-indigo-500/20', iconColor: 'text-indigo-600' },
    { icon: Package, label: 'Inventory', sub: 'Track supplies', path: '/inventory', color: 'bg-teal-500/10 border-teal-500/20 hover:bg-teal-500/20', iconBg: 'bg-teal-500/20', iconColor: 'text-teal-600' },
    { icon: TreePine, label: 'Carbon Score', sub: 'Sustainability', path: '/carbon-score', color: 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20', iconBg: 'bg-emerald-500/20', iconColor: 'text-emerald-600' },
    { icon: ShieldCheck, label: 'Post-Harvest', sub: 'Reduce losses', path: '/post-harvest', color: 'bg-red-500/10 border-red-500/20 hover:bg-red-500/20', iconBg: 'bg-red-500/20', iconColor: 'text-red-600' },
  ];

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
          {featureButtons.map((btn) => (
            <button
              key={btn.path}
              onClick={() => navigate(btn.path)}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-colors text-left ${btn.color}`}
            >
              <div className={`${btn.iconBg} p-2.5 rounded-lg`}>
                <btn.icon className={`w-5 h-5 ${btn.iconColor}`} />
              </div>
              <div>
                <p className="font-semibold text-xs text-foreground">{btn.label}</p>
                <p className="text-[10px] text-muted-foreground">{btn.sub}</p>
              </div>
            </button>
          ))}
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
