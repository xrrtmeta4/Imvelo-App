import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Droplets, Loader2, CloudRain, Calendar, Lightbulb, AlertTriangle, TrendingDown, Sprout, RefreshCw, Gauge, Atom } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from '@/hooks/useLocation';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import PremiumGate from '@/components/PremiumGate';

const cropOptions = ['Maize', 'Beans', 'Vegetables', 'Sugarcane', 'Cotton', 'Groundnuts', 'Sweet Potatoes', 'Citrus', 'Sorghum'];
const soilOptions = ['Clay', 'Sandy', 'Loam', 'Silt', 'Clay Loam', 'Sandy Loam'];

const SmartIrrigationContent = () => {
  const { user } = useAuth();
  const { getLocation } = useLocation();
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [selectedCrops, setSelectedCrops] = useState<string[]>(['Maize']);
  const [soilType, setSoilType] = useState('Loam');
  const [quantumMode, setQuantumMode] = useState(false);
  const { isPremium, openUpgrade } = useUsageLimits();

  const fetchAnalysis = useCallback(async () => {
    try {
      setLoading(true);
      const location = await getLocation({ preferGps: true });

      const { data, error } = await supabase.functions.invoke('smart-irrigation', {
        body: {
          latitude: location.latitude,
          longitude: location.longitude,
          crops: selectedCrops,
          soilType,
          quantum: quantumMode && isPremium,
        }
      });

      if (error) throw error;
      setAnalysis(data);
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to load irrigation analysis');
    } finally {
      setLoading(false);
    }
  }, [getLocation, selectedCrops, soilType, quantumMode, isPremium]);

  useEffect(() => {
    if (user) fetchAnalysis();
  }, [user, fetchAnalysis]);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'text-red-600 bg-red-100 border-red-200';
      case 'high': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'moderate': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-green-600 bg-green-100 border-green-200';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'irrigate': return 'bg-blue-500 text-white';
      case 'skip': return 'bg-muted text-muted-foreground';
      case 'reduce': return 'bg-yellow-100 text-yellow-700';
      case 'monitor': return 'bg-accent text-accent-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getMoisturePercent = (level: string) => {
    switch (level) {
      case 'saturated': return 100;
      case 'wet': return 80;
      case 'adequate': return 60;
      case 'low': return 35;
      case 'dry': return 10;
      default: return 50;
    }
  };

  const getMoistureColor = (level: string) => {
    const pct = getMoisturePercent(level);
    if (pct >= 70) return 'text-blue-600';
    if (pct >= 50) return 'text-green-600';
    if (pct >= 30) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="bg-gradient-to-br from-blue-600 to-cyan-500 text-white py-6 px-4">
          <div className="max-w-screen-sm mx-auto flex items-center gap-3">
            <Droplets className="w-8 h-8" />
            <h1 className="text-2xl font-bold">Smart Irrigation</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Analyzing rain patterns...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-to-br from-blue-600 to-cyan-500 text-white py-6 px-4">
        <div className="max-w-screen-sm mx-auto">
          <div className="flex items-center gap-3">
            <Droplets className="w-8 h-8" />
            <div>
              <h1 className="text-2xl font-bold">Smart Irrigation</h1>
              <p className="text-sm opacity-90">Rain pattern analysis & water advisory</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
        <button
          type="button"
          onClick={() => { if (!isPremium) { openUpgrade(); return; } setQuantumMode(v => !v); }}
          className={`w-full flex items-center justify-between gap-2 text-xs rounded-lg border p-3 transition-colors ${
            quantumMode && isPremium ? 'border-primary bg-primary/5 text-primary' : 'border-border hover:bg-accent text-muted-foreground'
          }`}
        >
          <span className="flex items-center gap-2">
            <Atom className="w-4 h-4" />
            Quantum Intelligence {!isPremium && '(Premium)'}
            {analysis?.quantum?.enabled && <span className="ml-2 text-[10px] font-bold uppercase">· {analysis.quantum.consensusFrom} models</span>}
          </span>
          <span className="text-[10px] font-semibold uppercase">{quantumMode && isPremium ? 'ON' : 'OFF'}</span>
        </button>
        {/* Config */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Primary Crop</Label>
                <Select value={selectedCrops[0]} onValueChange={(v) => setSelectedCrops([v])}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {cropOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Soil Type</Label>
                <Select value={soilType} onValueChange={setSoilType}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {soilOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={fetchAnalysis} variant="outline" size="sm" className="w-full gap-2" disabled={loading}>
              <RefreshCw className="w-4 h-4" /> Refresh Analysis
            </Button>
          </CardContent>
        </Card>

        {analysis && (
          <>
            {/* Status Overview */}
            <div className="grid grid-cols-2 gap-3">
              <Card className={`border ${getUrgencyColor(analysis.urgency)}`}>
                <CardContent className="pt-4 text-center">
                  <Droplets className="w-6 h-6 mx-auto mb-1" />
                  <p className="text-xs opacity-75">Irrigation Need</p>
                  <p className="text-lg font-bold capitalize">{analysis.urgency}</p>
                  <p className="text-xs mt-1">{analysis.recommendedWater_mm || 0}mm needed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <Gauge className="w-6 h-6 mx-auto mb-1 text-primary" />
                  <p className="text-xs text-muted-foreground">Soil Moisture</p>
                  <p className={`text-lg font-bold capitalize ${getMoistureColor(analysis.soilMoistureEstimate)}`}>
                    {analysis.soilMoistureEstimate}
                  </p>
                  <Progress value={getMoisturePercent(analysis.soilMoistureEstimate)} className="mt-2 h-2" />
                </CardContent>
              </Card>
            </div>

            {/* Rainfall Summary */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CloudRain className="w-5 h-5 text-blue-500" />
                  Rainfall Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold text-primary">
                      {analysis.rainfallSummary?.past7Days_mm ?? '—'}mm
                    </p>
                    <p className="text-xs text-muted-foreground">Past 7 days</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-2xl font-bold text-blue-500">
                      {analysis.rainfallSummary?.next7Days_mm ?? '—'}mm
                    </p>
                    <p className="text-xs text-muted-foreground">Next 7 days forecast</p>
                  </div>
                </div>
                {analysis.rainfallSummary?.nextRainDate && (
                  <p className="text-sm text-muted-foreground mt-3 text-center">
                    Next rain expected: <span className="font-medium text-foreground">{analysis.rainfallSummary.nextRainDate}</span>
                  </p>
                )}
                {analysis.rainfallSummary?.pattern && (
                  <p className="text-sm mt-2 bg-accent/50 p-2 rounded">{analysis.rainfallSummary.pattern}</p>
                )}
              </CardContent>
            </Card>

            {/* Alerts */}
            {analysis.alerts?.length > 0 && (
              <Card className="border-destructive/30">
                <CardContent className="pt-4 space-y-2">
                  {analysis.alerts.map((alert: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                      <span>{alert}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="schedule" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="schedule">Schedule</TabsTrigger>
                <TabsTrigger value="crops">Crops</TabsTrigger>
                <TabsTrigger value="tips">Tips</TabsTrigger>
              </TabsList>

              {/* Weekly Schedule */}
              <TabsContent value="schedule" className="mt-4 space-y-2">
                {analysis.weeklySchedule?.map((day: any, idx: number) => (
                  <Card key={idx}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{day.day}</p>
                            <p className="text-xs text-muted-foreground">{day.reason}</p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          {day.amount_mm > 0 && (
                            <span className="text-xs font-medium text-primary">{day.amount_mm}mm</span>
                          )}
                          <span className={`text-xs px-2 py-1 rounded-full capitalize ${getActionColor(day.action)}`}>
                            {day.action}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {analysis.bestIrrigationTime && (
                  <p className="text-xs text-center text-muted-foreground mt-2">
                    🕐 Best time to irrigate: <span className="font-medium">{analysis.bestIrrigationTime}</span>
                  </p>
                )}
              </TabsContent>

              {/* Crop Specific */}
              <TabsContent value="crops" className="mt-4 space-y-3">
                {analysis.cropSpecificAdvice?.map((crop: any, idx: number) => (
                  <Card key={idx}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Sprout className="w-5 h-5 text-green-500" />
                          <span className="font-medium">{crop.crop}</span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded capitalize ${
                          crop.currentStatus === 'under-watered' ? 'bg-red-100 text-red-700' :
                          crop.currentStatus === 'over-watered' ? 'bg-blue-100 text-blue-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {crop.currentStatus?.replace('-', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        Weekly need: <span className="font-medium text-foreground">{crop.waterNeed_mm_per_week}mm</span>
                      </p>
                      <p className="text-sm">{crop.recommendation}</p>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* Tips & Efficiency */}
              <TabsContent value="tips" className="mt-4 space-y-4">
                {analysis.efficiency && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-green-500" />
                        Water Efficiency
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Current Score</span>
                        <span className="text-lg font-bold text-primary">{analysis.efficiency.currentScore}/100</span>
                      </div>
                      <Progress value={analysis.efficiency.currentScore} className="h-2 mb-3" />
                      {analysis.efficiency.potentialSavings_percent > 0 && (
                        <p className="text-sm text-green-600">
                          💧 Potential savings: {analysis.efficiency.potentialSavings_percent}% water reduction
                        </p>
                      )}
                      {analysis.efficiency.method && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Recommended: {analysis.efficiency.method}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {analysis.waterSavingTips?.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-yellow-500" />
                        Water Saving Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {analysis.waterSavingTips.map((tip: string, i: number) => (
                        <div key={i} className="flex items-start gap-2 text-sm p-2 bg-muted rounded">
                          <span className="text-primary font-bold">{i + 1}.</span>
                          <span>{tip}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};

const SmartIrrigation = () => (
  <PremiumGate feature="Smart Irrigation Planner" requiredPlan="premium">
    <SmartIrrigationContent />
  </PremiumGate>
);

export default SmartIrrigation;
