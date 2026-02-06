import { useState, useEffect } from 'react';
import WeatherCard from '@/components/WeatherCard';
import WeatherTicker from '@/components/WeatherTicker';
import PestScanner from '@/components/PestScanner';
import BestPractices from '@/components/BestPractices';
import ExtensionServices from '@/components/ExtensionServices';
import AIChatbot from '@/components/AIChatbot';
import NotificationBell from '@/components/NotificationBell';
import { useNotifications } from '@/hooks/useNotifications';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Sprout, Crown, Leaf, CloudLightning } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Index = () => {
  useNotifications();
  const { isPremium, openUpgrade, getFormattedPrice } = useUsageLimits();
  const { user } = useAuth();
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
        setUserName(data.full_name.split(' ')[0]); // Get first name
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
            <NotificationBell />
          </div>
          <h1 className="text-3xl font-bold mb-2">
            {userName ? `Hi, ${userName}!` : 'Imvelo'}
          </h1>
          <p className="text-primary-foreground/90">Farmer's Best Friend</p>
          
          {!isPremium && (
            <Button 
              onClick={openUpgrade}
              variant="secondary"
              className="mt-4 gap-2"
            >
              <Crown className="w-4 h-4" />
              Upgrade - {getFormattedPrice()}
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        {/* Quick Access: Crop Monitoring & Climate Risk */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/crop-monitoring')}
            className="flex items-center gap-3 p-4 rounded-xl bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors text-left"
          >
            <div className="bg-primary/20 p-2.5 rounded-lg">
              <Leaf className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Crop Monitor</p>
              <p className="text-xs text-muted-foreground">AI health scan</p>
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
              <p className="font-semibold text-sm text-foreground">Climate Risk</p>
              <p className="text-xs text-muted-foreground">Volatility engine</p>
            </div>
          </button>
        </div>

        <WeatherCard />
        <PestScanner />
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
