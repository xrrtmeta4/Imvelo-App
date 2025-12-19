import WeatherCard from '@/components/WeatherCard';
import PestScanner from '@/components/PestScanner';
import BestPractices from '@/components/BestPractices';
import ExtensionServices from '@/components/ExtensionServices';
import AIChatbot from '@/components/AIChatbot';
import { useNotifications } from '@/hooks/useNotifications';
import { Sprout } from 'lucide-react';

const Index = () => {
  useNotifications();
  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-8 px-4">
        <div className="max-w-screen-sm mx-auto text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary-foreground/10 p-3 rounded-full">
              <Sprout className="w-10 h-10" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Imvelo</h1>
          <p className="text-primary-foreground/90">sisita balimi ngelwati lolujulile</p>
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
      <AIChatbot />
    </div>
  );
};

export default Index;
