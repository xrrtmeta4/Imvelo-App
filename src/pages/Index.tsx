import { useState, useEffect } from 'react';
import WeatherCard from '@/components/WeatherCard';
import WeatherTicker from '@/components/WeatherTicker';
import PestScanner from '@/components/PestScanner';
import BestPractices from '@/components/BestPractices';
import ExtensionServices from '@/components/ExtensionServices';
import AIChatbot from '@/components/AIChatbot';
import PushNotificationManager from '@/components/PushNotificationManager';
import NotificationBell from '@/components/NotificationBell';
import { useNotifications } from '@/hooks/useNotifications';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { Sprout, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  useNotifications();
  const { isPremium, openUpgrade, getFormattedPrice } = useUsageLimits();
  const { user } = useAuth();
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
        {user && <PushNotificationManager />}
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
