import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Scanner from "./pages/Scanner";
import FarmActivities from "./pages/FarmActivities";
import DigitalLedger from "./pages/DigitalLedger";
import Weather from "./pages/Weather";
import Profile from "./pages/Profile";
import OfficerDashboard from "./pages/OfficerDashboard";
import PlantingGuide from "./pages/PlantingGuide";
import SoilManagement from "./pages/SoilManagement";
import WaterConservation from "./pages/WaterConservation";
import ExtensionDirectory from "./pages/ExtensionDirectory";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import Contact from "./pages/Contact";
import About from "./pages/About";
import NotFound from "./pages/NotFound";
import PesticideCalendar from "./pages/PesticideCalendar";
import CropMonitoring from "./pages/CropMonitoring";
import ClimateRisk from "./pages/ClimateRisk";
import Upgrade from "./pages/Upgrade";
import SmartIrrigation from "./pages/SmartIrrigation";
import LivestockManager from "./pages/LivestockManager";
import CropRotation from "./pages/CropRotation";
import FertilizerCalculator from "./pages/FertilizerCalculator";
import HarvestTracker from "./pages/HarvestTracker";
import MarketPriceAlerts from "./pages/MarketPriceAlerts";
import FarmInventory from "./pages/FarmInventory";
import CarbonScore from "./pages/CarbonScore";
import PostHarvestGuide from "./pages/PostHarvestGuide";
import AfricanMarkets from "./pages/AfricanMarkets";
import KnowledgeGraphExplorer from "./pages/KnowledgeGraphExplorer";
import AgriSchool from "./pages/AgriSchool";
import MobileNav from "./components/MobileNav";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import SubscriptionPopup from "./components/SubscriptionPopup";
import SyncStatusBar from "./components/SyncStatusBar";
import { SyncProvider } from "./hooks/useOfflineSync";
import { useInteractionTracker } from "./hooks/useInteractionTracker";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  useInteractionTracker();

  return (
    <>
      {children}
      <MobileNav />
      <SubscriptionPopup />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
          <SyncProvider>
          <SyncStatusBar />
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/scanner" element={<ProtectedRoute><Scanner /></ProtectedRoute>} />
            <Route path="/farm-activities" element={<ProtectedRoute><FarmActivities /></ProtectedRoute>} />
            <Route path="/ledger" element={<ProtectedRoute><DigitalLedger /></ProtectedRoute>} />
            <Route path="/weather" element={<ProtectedRoute><Weather /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/officer-dashboard" element={<ProtectedRoute><OfficerDashboard /></ProtectedRoute>} />
            <Route path="/planting-guide" element={<ProtectedRoute><PlantingGuide /></ProtectedRoute>} />
            <Route path="/soil-management" element={<ProtectedRoute><SoilManagement /></ProtectedRoute>} />
            <Route path="/water-conservation" element={<ProtectedRoute><WaterConservation /></ProtectedRoute>} />
            <Route path="/extension-directory" element={<ProtectedRoute><ExtensionDirectory /></ProtectedRoute>} />
            <Route path="/pesticide-calendar" element={<ProtectedRoute><PesticideCalendar /></ProtectedRoute>} />
            <Route path="/crop-monitoring" element={<ProtectedRoute><CropMonitoring /></ProtectedRoute>} />
            <Route path="/climate-risk" element={<ProtectedRoute><ClimateRisk /></ProtectedRoute>} />
            <Route path="/upgrade" element={<ProtectedRoute><Upgrade /></ProtectedRoute>} />
            <Route path="/smart-irrigation" element={<ProtectedRoute><SmartIrrigation /></ProtectedRoute>} />
            <Route path="/livestock" element={<ProtectedRoute><LivestockManager /></ProtectedRoute>} />
            <Route path="/crop-rotation" element={<ProtectedRoute><CropRotation /></ProtectedRoute>} />
            <Route path="/fertilizer" element={<ProtectedRoute><FertilizerCalculator /></ProtectedRoute>} />
            <Route path="/harvest-tracker" element={<ProtectedRoute><HarvestTracker /></ProtectedRoute>} />
            <Route path="/price-alerts" element={<ProtectedRoute><MarketPriceAlerts /></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><FarmInventory /></ProtectedRoute>} />
            <Route path="/carbon-score" element={<ProtectedRoute><CarbonScore /></ProtectedRoute>} />
            <Route path="/post-harvest" element={<ProtectedRoute><PostHarvestGuide /></ProtectedRoute>} />
            <Route path="/african-markets" element={<ProtectedRoute><AfricanMarkets /></ProtectedRoute>} />
            <Route path="/knowledge-graph" element={<ProtectedRoute><KnowledgeGraphExplorer /></ProtectedRoute>} />
            <Route path="/agrischool" element={<ProtectedRoute><AgriSchool /></ProtectedRoute>} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </SyncProvider>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
