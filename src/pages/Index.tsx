import WeatherCard from '@/components/WeatherCard';
import WeatherTicker from '@/components/WeatherTicker';
import PestScanner from '@/components/PestScanner';
import BestPractices from '@/components/BestPractices';
import ExtensionServices from '@/components/ExtensionServices';
import AIChatbot from '@/components/AIChatbot';
import WhatsAppButton from '@/components/WhatsAppButton';
import { useNotifications } from '@/hooks/useNotifications';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { Sprout, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Index = () => {
  useNotifications();
  const { isPremium, openUpgrade } = useUsageLimits();

  return (
    <div className="min-h-screen bg-background pb-20">
      <WeatherTicker />
      
      <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-8 px-4">
        <div className="max-w-screen-sm mx-auto text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary-foreground/10 p-3 rounded-full">
              <Sprout className="w-10 h-10" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Imvelo</h1>
          <p className="text-primary-foreground/90">Farmer's Best Friend</p>
          
          {!isPremium && (
            <Button 
              onClick={openUpgrade}
              variant="secondary"
              className="mt-4 gap-2"
            >
              <Crown className="w-4 h-4" />
              Upgrade to Premium - $6.04
            </Button>
          )}
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        <WeatherCard />
        <PestScanner />
        <div className="grid grid-cols-1 gap-6">
          <ExtensionServices />
          <BestPractices />
        </div>
      </div>
      <WhatsAppButton />
      <AIChatbot />
    </div>
  );
};

export default Index;
