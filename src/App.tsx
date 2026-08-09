import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LanguageProvider } from "@/hooks/useLanguage";
import { useNotifications } from "@/hooks/useNotifications";
import Index from "./pages/Index";
import Auth from "./pages/Auth";

// Route-level code splitting: only the first screen ships in the initial bundle.
const Scanner = lazy(() => import("./pages/Scanner"));
const FarmActivities = lazy(() => import("./pages/FarmActivities"));
const DigitalLedger = lazy(() => import("./pages/DigitalLedger"));
const Weather = lazy(() => import("./pages/Weather"));
const Profile = lazy(() => import("./pages/Profile"));
const OfficerDashboard = lazy(() => import("./pages/OfficerDashboard"));
const PlantingGuide = lazy(() => import("./pages/PlantingGuide"));
const SoilManagement = lazy(() => import("./pages/SoilManagement"));
const WaterConservation = lazy(() => import("./pages/WaterConservation"));
const ExtensionDirectory = lazy(() => import("./pages/ExtensionDirectory"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const Contact = lazy(() => import("./pages/Contact"));
const About = lazy(() => import("./pages/About"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PesticideCalendar = lazy(() => import("./pages/PesticideCalendar"));
const CropMonitoring = lazy(() => import("./pages/CropMonitoring"));
const ClimateRisk = lazy(() => import("./pages/ClimateRisk"));
const Upgrade = lazy(() => import("./pages/Upgrade"));
const SmartIrrigation = lazy(() => import("./pages/SmartIrrigation"));
const LivestockManager = lazy(() => import("./pages/LivestockManager"));
const CropRotation = lazy(() => import("./pages/CropRotation"));
const FertilizerCalculator = lazy(() => import("./pages/FertilizerCalculator"));
const HarvestTracker = lazy(() => import("./pages/HarvestTracker"));
const MarketPriceAlerts = lazy(() => import("./pages/MarketPriceAlerts"));
const FarmInventory = lazy(() => import("./pages/FarmInventory"));
const CarbonScore = lazy(() => import("./pages/CarbonScore"));
const PostHarvestGuide = lazy(() => import("./pages/PostHarvestGuide"));
const AfricanMarkets = lazy(() => import("./pages/AfricanMarkets"));
const KnowledgeGraphExplorer = lazy(() => import("./pages/KnowledgeGraphExplorer"));
const Settings = lazy(() => import("./pages/Settings"));
const UssdSimulator = lazy(() => import("./pages/UssdSimulator"));
const Analysis = lazy(() => import("./pages/Analysis"));
const Campaigns = lazy(() => import("./pages/Campaigns"));
const AIChat = lazy(() => import("./pages/AIChat"));
const ScannerFeature = lazy(() => import("./pages/features/ScannerFeature"));
const WeatherFeature = lazy(() => import("./pages/features/WeatherFeature"));
const AnalysisFeature = lazy(() => import("./pages/features/AnalysisFeature"));
import { SettingsProvider } from "./hooks/useSettings";
import MobileNav from "./components/MobileNav";
import PWAInstallPrompt from "./components/PWAInstallPrompt";
import SubscriptionPopup from "./components/SubscriptionPopup";
import AppTutorial from "./components/AppTutorial";
import { useInteractionTracker } from "./hooks/useInteractionTracker";
import ErrorBoundary from "./components/ErrorBoundary";

const queryClient = new QueryClient();

// Warm the chunks a farmer is most likely to open next, once the browser is idle.
const prefetchRoutes = () => {
  void import("./pages/Weather");
  void import("./pages/Scanner");
  void import("./pages/Analysis");
  void import("./pages/AIChat");
  void import("./pages/Settings");
};

const RoutePrefetcher = () => {
  useEffect(() => {
    const ric = (window as any).requestIdleCallback as
      | ((cb: () => void, opts?: { timeout: number }) => number)
      | undefined;
    if (ric) {
      const id = ric(prefetchRoutes, { timeout: 3000 });
      return () => (window as any).cancelIdleCallback?.(id);
    }
    const t = setTimeout(prefetchRoutes, 1500);
    return () => clearTimeout(t);
  }, []);
  return null;
};

const RouteFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  useNotifications();
  useInteractionTracker();

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

  return (
    <>
      {children}
      <MobileNav />
      <SubscriptionPopup />
      <AppTutorial />
    </>
  );
};

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <PWAInstallPrompt />
      <BrowserRouter>
        <AuthProvider>
          <LanguageProvider>
          <SettingsProvider>
          <RoutePrefetcher />
          <Suspense fallback={<RouteFallback />}>
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
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/ussd" element={<ProtectedRoute><UssdSimulator /></ProtectedRoute>} />
            <Route path="/analysis" element={<ProtectedRoute><Analysis /></ProtectedRoute>} />
            <Route path="/campaigns" element={<ProtectedRoute><Campaigns /></ProtectedRoute>} />
            <Route path="/ai-chat" element={<ProtectedRoute><AIChat /></ProtectedRoute>} />
            <Route path="/privacy-policy" element={<PrivacyPolicy />} />
            <Route path="/terms-of-service" element={<TermsOfService />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/about" element={<About />} />
            <Route path="/features/scanner" element={<ScannerFeature />} />
            <Route path="/features/weather" element={<WeatherFeature />} />
            <Route path="/features/analysis" element={<AnalysisFeature />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
          </SettingsProvider>
          </LanguageProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
