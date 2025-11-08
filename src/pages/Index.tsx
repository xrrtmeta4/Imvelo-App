import Hero from "@/components/Hero";
import WeatherWidget from "@/components/WeatherWidget";
import PestIdentification from "@/components/PestIdentification";
import Marketplace from "@/components/Marketplace";
import ExtensionServices from "@/components/ExtensionServices";
import BestPractices from "@/components/BestPractices";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Hero />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <WeatherWidget />
            <Marketplace />
            <BestPractices />
          </div>
          
          <div className="space-y-6">
            <PestIdentification />
            <ExtensionServices />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
