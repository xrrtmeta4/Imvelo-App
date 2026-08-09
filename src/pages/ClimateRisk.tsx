 
 import { useState, useEffect, useCallback } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CloudLightning, Loader2, AlertTriangle, TrendingUp, Thermometer, Droplets, Wind, Sun, Sprout, Calendar, Shield, Database, Bug, Sparkles, Snowflake, Flame } from 'lucide-react';
import { Atom } from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, Legend, Area, ComposedChart, RadialBarChart, RadialBar,
} from 'recharts';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import PremiumGate from '@/components/PremiumGate';
 import { supabase } from '@/lib/supabase';
 import { toast } from 'sonner';
 import { useAuth } from '@/hooks/useAuth';
 import { useLocation } from '@/hooks/useLocation';
 
 const ClimateRiskContent = () => {
   const { user } = useAuth();
   const { getLocation } = useLocation();
   const [loading, setLoading] = useState(true);
   const [analysis, setAnalysis] = useState<any>(null);
   const [quantumMode, setQuantumMode] = useState(false);
   const { isPremium, openUpgrade } = useUsageLimits();
 
   const fetchClimateAnalysis = useCallback(async () => {
     try {
       setLoading(true);
       const location = await getLocation({ preferGps: true });
       
       const { data, error } = await supabase.functions.invoke('climate-risk-analysis', {
         body: { 
           latitude: location.latitude,
           longitude: location.longitude,
           crops: ['Maize', 'Beans', 'Vegetables'],
           quantum: quantumMode && isPremium,
         }
       });
 
       if (error) throw error;
       setAnalysis(data);
     } catch (error: any) {
       console.error('Error:', error);
       toast.error('Failed to load climate analysis');
     } finally {
       setLoading(false);
     }
   }, [getLocation, quantumMode, isPremium]);
 
   useEffect(() => {
     if (user) {
       fetchClimateAnalysis();
     }
   }, [user, fetchClimateAnalysis]);
 
   const getRiskColor = (level: string) => {
     switch (level) {
       case 'critical': return 'text-red-600 bg-red-100';
       case 'high': return 'text-orange-600 bg-orange-100';
       case 'moderate': return 'text-yellow-600 bg-yellow-100';
       default: return 'text-green-600 bg-green-100';
     }
   };
 
   const getPriorityColor = (priority: string) => {
     switch (priority) {
       case 'immediate': return 'bg-red-500';
       case 'short_term': return 'bg-orange-500';
       default: return 'bg-blue-500';
     }
   };
 
  // ---- Chart data builders -------------------------------------------------
  const forecastChartData = (() => {
    const f = analysis?.forecastData;
    if (!f?.time) return [];
    return f.time.map((d: string, i: number) => ({
      day: new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      tMax: f.temperature_2m_max?.[i],
      tMin: f.temperature_2m_min?.[i],
      rain: f.precipitation_sum?.[i] ?? 0,
      rainProb: f.precipitation_probability_max?.[i] ?? 0,
    }));
  })();

  const eventChartData = analysis?.extremeEventProbabilities
    ? Object.entries(analysis.extremeEventProbabilities).map(([k, v]: any) => ({
        event: k.charAt(0).toUpperCase() + k.slice(1),
        probability: Math.round((v.probability || 0) * 100),
        severity: v.severity,
      }))
    : [];

  const climatologyData = analysis?.historicalMonthly
    ? Object.entries(analysis.historicalMonthly).map(([m, v]: any) => ({
        month: new Date(2000, Number(m), 1).toLocaleString(undefined, { month: 'short' }),
        temp: Number((v.avgTemp ?? 0).toFixed(1)),
        rain: Number((v.avgPrecip ?? 0).toFixed(0)),
      }))
    : [];

  const cropRecommendations = analysis?.cropRecommendations || [];

  // ---- Meteoblue visualization data ---------------------------------------
  const mbDays: any[] = analysis?.meteoblue?.days || [];
  const mbChart = mbDays.map((d) => ({
    day: new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' }),
    max: d.tempMax,
    min: d.tempMin,
    rain: d.precip_mm ?? 0,
    rainProb: d.precipProb_pct ?? 0,
    wind: d.windMax_kmh ?? 0,
    soil: d.soilMoisture_pct ?? 0,
    et0: d.evapotranspiration_mm ?? 0,
  }));
  const mbTrend = analysis?.meteoblue?.trend14;
  const mbTrendChart = mbTrend?.time?.map((t: string, i: number) => ({
    day: new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    max: mbTrend.tempMax?.[i],
    min: mbTrend.tempMin?.[i],
    rain: mbTrend.precip?.[i] ?? 0,
  })) || [];
  const earlyWarnings: any[] = analysis?.meteoblueEarlyWarnings || [];
  const riskGaugeData = [{ name: 'risk', value: analysis?.riskScore || 0, fill: (analysis?.riskScore || 0) >= 70 ? '#dc2626' : (analysis?.riskScore || 0) >= 40 ? '#f59e0b' : '#16a34a' }];
  const warnIcon = (t: string) => t === 'flood' ? <Droplets className="w-4 h-4" /> : t === 'drought' ? <Sun className="w-4 h-4" /> : t === 'heatwave' ? <Flame className="w-4 h-4" /> : t === 'frost' ? <Snowflake className="w-4 h-4" /> : <Wind className="w-4 h-4" />;

  const outlooks = analysis?.outlooks || {
    twoWeeks: analysis?.shortTermOutlook,
    threeMonths: analysis?.midTermOutlook,
    sixMonths: null,
    oneYear: analysis?.longTermOutlook,
  };

  const renderOutlook = (o: any) => {
    if (!o) return <p className="text-sm text-muted-foreground">No data available for this horizon yet.</p>;
    return (
      <div className="space-y-3">
        {o.conditions && <p className="text-sm">{o.conditions}</p>}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {o.tempTrend && (
            <div className="p-2 bg-muted rounded">
              <p className="text-muted-foreground">Temperature</p>
              <p className="font-semibold">{o.tempTrend}</p>
            </div>
          )}
          {o.rainfallTrend && (
            <div className="p-2 bg-muted rounded">
              <p className="text-muted-foreground">Rainfall</p>
              <p className="font-semibold">{o.rainfallTrend}</p>
            </div>
          )}
          {o.yieldProjection && (
            <div className="p-2 bg-muted rounded col-span-2">
              <p className="text-muted-foreground">Yield Projection</p>
              <p className="font-semibold text-primary">{o.yieldProjection}</p>
            </div>
          )}
        </div>
        {o.farmingOpportunities?.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Opportunities</p>
            <div className="flex flex-wrap gap-1">
              {o.farmingOpportunities.map((x: string, i: number) => (
                <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">{x}</span>
              ))}
            </div>
          </div>
        )}
        {o.risks?.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Risks</p>
            <div className="flex flex-wrap gap-1">
              {o.risks.map((x: string, i: number) => (
                <span key={i} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">{x}</span>
              ))}
            </div>
          </div>
        )}
        {o.climateTrends?.length > 0 && (
          <ul className="text-sm space-y-1">
            {o.climateTrends.map((t: string, i: number) => <li key={i}>• {t}</li>)}
          </ul>
        )}
        {o.suitableCrops?.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Suggested crops</p>
            <div className="flex flex-wrap gap-1">
              {o.suitableCrops.map((crop: string, i: number) => (
                <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  {crop}
                </span>
              ))}
            </div>
          </div>
        )}
        {o.recommendedActions?.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Recommended actions</p>
            <ul className="text-sm space-y-1">
              {o.recommendedActions.map((a: string, i: number) => <li key={i}>→ {a}</li>)}
            </ul>
          </div>
        )}
        {!o.suitableCrops?.length && !o.recommendedActions?.length && (
          <p className="text-sm text-muted-foreground">
            Review local weather trends and adjust planting or protection measures as conditions evolve.
          </p>
        )}
        {o.suitabilityChanges?.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Crop suitability shifts</p>
            <ul className="text-sm space-y-1">
              {o.suitabilityChanges.map((t: string, i: number) => <li key={i}>→ {t}</li>)}
            </ul>
          </div>
        )}
      </div>
    );
  };

   if (loading) {
     return (
       <div className="min-h-screen bg-background pb-20">
         <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-6 px-4">
           <div className="max-w-screen-sm mx-auto flex items-center gap-3">
             <CloudLightning className="w-8 h-8" />
             <h1 className="text-2xl font-bold">Climate Risk Engine</h1>
           </div>
         </header>
         <div className="flex items-center justify-center py-20">
           <Loader2 className="w-8 h-8 animate-spin text-primary" />
         </div>
       </div>
     );
   }
 
   return (
     <div className="min-h-screen bg-background pb-20">
       <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-6 px-4">
         <div className="max-w-screen-sm mx-auto">
           <div className="flex items-center gap-3">
             <CloudLightning className="w-8 h-8" />
             <div>
               <h1 className="text-2xl font-bold">Climate Risk Engine</h1>
               <p className="text-sm opacity-90">Volatility modeling & adaptive planning</p>
             </div>
           </div>
         </div>
       </header>
 
       <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
         {/* Quantum Intelligence toggle */}
         <button
           type="button"
           onClick={() => { if (!isPremium) { openUpgrade(); return; } setQuantumMode(v => { const nv = !v; setTimeout(fetchClimateAnalysis, 0); return nv; }); }}
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

         {/* Risk Overview Card */}
         <Card className={`${getRiskColor(analysis?.overallRiskLevel)}`}>
           <CardContent className="pt-6">
             <div className="flex items-center justify-between">
               <div>
                 <p className="text-sm opacity-75">Overall Climate Risk</p>
                 <p className="text-3xl font-bold capitalize">{analysis?.overallRiskLevel}</p>
               </div>
               <div className="text-right">
                 <p className="text-sm opacity-75">Risk Score</p>
                 <p className="text-4xl font-bold">{analysis?.riskScore || 0}</p>
               </div>
             </div>
           </CardContent>
         </Card>
 
          {/* Meteoblue Early Warnings */}
          {earlyWarnings.length > 0 && (
            <Card className="border-orange-300 bg-gradient-to-br from-orange-50 to-red-50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-orange-800">
                  <AlertTriangle className="w-5 h-5" />
                  Early Warnings · Meteoblue
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {earlyWarnings.map((w, i) => (
                  <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${w.severity === 'high' ? 'bg-red-100 border-red-300 text-red-900' : 'bg-orange-100 border-orange-300 text-orange-900'}`}>
                    <div className="mt-0.5">{warnIcon(w.type)}</div>
                    <div className="flex-1">
                      <p className="text-xs font-bold uppercase tracking-wide">{w.type} · {w.severity}</p>
                      <p className="text-sm">{w.message}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Risk Gauge (Radial) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="w-5 h-5" /> Risk Gauge
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart innerRadius="60%" outerRadius="100%" data={riskGaugeData} startAngle={180} endAngle={0}>
                    <RadialBar background dataKey="value" cornerRadius={12} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-center -mt-6 text-3xl font-black">{analysis?.riskScore || 0}<span className="text-sm font-medium text-muted-foreground">/100</span></p>
              <p className="text-center text-xs text-muted-foreground capitalize">{analysis?.overallRiskLevel} risk</p>
            </CardContent>
          </Card>

          {/* Meteoblue 7-day chart */}
          {mbChart.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Thermometer className="w-5 h-5" /> 7-Day Meteoblue Forecast
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={mbChart} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="day" fontSize={11} />
                      <YAxis yAxisId="l" fontSize={11} />
                      <YAxis yAxisId="r" orientation="right" fontSize={11} />
                      <RTooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar yAxisId="r" dataKey="rain" name="Rain (mm)" fill="#3b82f6" opacity={0.7} radius={[4,4,0,0]} />
                      <Line yAxisId="l" type="monotone" dataKey="max" name="Max °C" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
                      <Line yAxisId="l" type="monotone" dataKey="min" name="Min °C" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mbChart} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="day" fontSize={11} />
                      <YAxis fontSize={11} />
                      <RTooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="soil" name="Soil moisture %" fill="#84cc16" radius={[4,4,0,0]} />
                      <Bar dataKey="et0" name="ET₀ (mm)" fill="#f59e0b" radius={[4,4,0,0]} />
                      <Bar dataKey="wind" name="Wind max km/h" fill="#8b5cf6" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Meteoblue 14-day trend */}
          {mbTrendChart.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="w-5 h-5" /> 14-Day Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mbTrendChart} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="day" fontSize={10} />
                      <YAxis fontSize={11} />
                      <RTooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Line type="monotone" dataKey="max" name="Max °C" stroke="#dc2626" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="min" name="Min °C" stroke="#0ea5e9" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Extreme Event Probabilities */}
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <AlertTriangle className="w-5 h-5" />
               Extreme Event Probabilities
             </CardTitle>
           </CardHeader>
           <CardContent>
             <div className="grid grid-cols-2 gap-3">
               {analysis?.extremeEventProbabilities && Object.entries(analysis.extremeEventProbabilities).map(([event, data]: [string, any]) => (
                 <div key={event} className="p-3 bg-muted rounded-lg">
                   <div className="flex items-center gap-2 mb-1">
                     {event === 'drought' && <Sun className="w-4 h-4 text-orange-500" />}
                     {event === 'flood' && <Droplets className="w-4 h-4 text-blue-500" />}
                     {event === 'heatwave' && <Thermometer className="w-4 h-4 text-red-500" />}
                     {event === 'frost' && <Wind className="w-4 h-4 text-cyan-500" />}
                     <span className="text-sm font-medium capitalize">{event}</span>
                   </div>
                   <p className="text-2xl font-bold">{Math.round(data.probability * 100)}%</p>
                   <p className="text-xs text-muted-foreground capitalize">{data.severity} severity</p>
                 </div>
               ))}
             </div>
           </CardContent>
         </Card>

          {/* Climate Outlook Summary — quick view across all 4 horizons */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-5 h-5" />
                Climate Outlook Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { key: 'twoWeeks', label: '2 weeks', icon: <Calendar className="w-4 h-4" /> },
                  { key: 'threeMonths', label: '3 months', icon: <TrendingUp className="w-4 h-4" /> },
                  { key: 'sixMonths', label: '6 months', icon: <Sun className="w-4 h-4" /> },
                  { key: 'oneYear', label: '1 year', icon: <Shield className="w-4 h-4" /> },
                ] as const).map(({ key, label, icon }) => {
                  const o = outlooks?.[key];
                  return (
                    <div key={key} className="p-3 rounded-lg border border-border bg-muted/50">
                      <div className="flex items-center gap-1.5 mb-1 text-xs font-semibold text-primary">
                        {icon}<span>{label}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mb-1">
                        {o?.conditions || 'No data yet'}
                      </p>
                      {o?.yieldProjection && (
                        <p className="text-[11px] font-medium">📈 {o.yieldProjection}</p>
                      )}
                      {o?.suitableCrops?.length > 0 && (
                        <p className="text-[10px] text-green-700 mt-1 line-clamp-1">
                          🌱 {o.suitableCrops.slice(0, 3).join(', ')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              {analysis?.dataSources?.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-3 leading-tight">
                  Data: {analysis.dataSources.join(' · ')}
                </p>
              )}
            </CardContent>
          </Card>
 
          <Tabs defaultValue="outlook" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="outlook">Outlook</TabsTrigger>
              <TabsTrigger value="crops">Crops</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
              <TabsTrigger value="research">Research</TabsTrigger>
            </TabsList>
 
           <TabsContent value="outlook" className="mt-4 space-y-4">
             <Tabs defaultValue="twoWeeks" className="w-full">
               <TabsList className="grid w-full grid-cols-4">
                 <TabsTrigger value="twoWeeks" className="text-xs">2 weeks</TabsTrigger>
                 <TabsTrigger value="threeMonths" className="text-xs">3 months</TabsTrigger>
                 <TabsTrigger value="sixMonths" className="text-xs">6 months</TabsTrigger>
                 <TabsTrigger value="oneYear" className="text-xs">1 year</TabsTrigger>
               </TabsList>
               {(['twoWeeks', 'threeMonths', 'sixMonths', 'oneYear'] as const).map((k) => (
                 <TabsContent key={k} value={k} className="mt-3">
                   <Card>
                     <CardHeader className="pb-2">
                       <CardTitle className="text-base flex items-center gap-2">
                         {k === 'twoWeeks' && <Calendar className="w-4 h-4" />}
                         {k === 'threeMonths' && <TrendingUp className="w-4 h-4" />}
                         {k === 'sixMonths' && <Sun className="w-4 h-4" />}
                         {k === 'oneYear' && <Shield className="w-4 h-4" />}
                         {outlooks?.[k]?.period || k}
                       </CardTitle>
                     </CardHeader>
                     <CardContent>{renderOutlook(outlooks?.[k])}</CardContent>
                   </Card>
                 </TabsContent>
               ))}
             </Tabs>
           </TabsContent>
 
           <TabsContent value="crops" className="mt-4 space-y-3">
             {cropRecommendations.length > 0 ? (
               cropRecommendations.map((crop: any, idx: number) => (
                 <Card key={idx}>
                   <CardContent className="pt-4">
                     <div className="flex items-center justify-between mb-2">
                       <div className="flex items-center gap-2">
                         <Sprout className="w-5 h-5 text-green-500" />
                         <span className="font-medium">{crop.crop}</span>
                       </div>
                       <span className={`text-xs px-2 py-1 rounded capitalize ${
                         crop.suitability === 'high' ? 'bg-green-100 text-green-700' :
                         crop.suitability === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                         'bg-red-100 text-red-700'
                       }`}>
                         {crop.suitability} suitability
                       </span>
                     </div>
                     {crop.optimalPlantingWindow && (
                       <p className="text-sm text-muted-foreground mb-2">
                         Best planting: {crop.optimalPlantingWindow}
                       </p>
                     )}
                     {crop.conditions?.length > 0 && (
                       <div className="mb-3">
                         <p className="text-xs text-muted-foreground mb-1">Current crop conditions</p>
                         <ul className="list-disc list-inside text-sm text-muted-foreground">
                           {crop.conditions.map((condition: string, i: number) => (
                             <li key={i}>{condition}</li>
                           ))}
                         </ul>
                       </div>
                     )}
                     {crop.adaptations?.length > 0 ? (
                       <div className="text-sm">
                         <p className="font-medium mb-1">Adaptations:</p>
                         <ul className="list-disc list-inside text-muted-foreground">
                           {crop.adaptations.map((a: string, i: number) => (
                             <li key={i}>{a}</li>
                           ))}
                         </ul>
                       </div>
                     ) : (
                       <p className="text-sm text-muted-foreground">
                         {crop.suitability === 'low'
                           ? 'Avoid this crop until conditions improve. Focus on drought-tolerant varieties, mulching, and stronger irrigation.'
                           : crop.suitability === 'medium'
                             ? 'Use caution: monitor soil moisture, add mulch, and protect young plants during unpredictable weather.'
                             : 'Good match for current conditions; maintain regular care and monitor any sudden weather shifts.'}
                       </p>
                     )}
                     {crop.recommendedActions?.length > 0 && (
                       <div className="mt-3 text-sm">
                         <p className="font-medium mb-1">Action plan</p>
                         <ul className="list-disc list-inside text-muted-foreground">
                           {crop.recommendedActions.map((action: string, i: number) => (
                             <li key={i}>{action}</li>
                           ))}
                         </ul>
                       </div>
                     )}
                   </CardContent>
                 </Card>
               ))
             ) : (
               <Card>
                 <CardContent>
                   <p className="text-sm text-muted-foreground mb-2">
                     No crop-specific recommendations are available yet. Based on current risk conditions, choose resilient crops and use moisture-saving practices.
                   </p>
                   <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                     <li>Prefer drought-tolerant seeds and mulching.</li>
                     <li>Monitor rainfall closely before planting.</li>
                     <li>Apply adaptive irrigation and pest protection early.</li>
                   </ul>
                 </CardContent>
               </Card>
             )}
           </TabsContent>
 
           <TabsContent value="actions" className="mt-4 space-y-3">
             {analysis?.adaptiveActions?.map((action: any, idx: number) => (
               <Card key={idx}>
                 <CardContent className="pt-4">
                   <div className="flex items-start gap-3">
                     <span className={`w-3 h-3 rounded-full mt-1 ${getPriorityColor(action.priority)}`} />
                     <div className="flex-1">
                       <div className="flex items-center justify-between mb-1">
                         <span className="font-medium text-sm">{action.action}</span>
                         <span className="text-xs text-muted-foreground capitalize">
                           {action.priority?.replace('_', ' ')}
                         </span>
                       </div>
                       <p className="text-xs text-muted-foreground">{action.reason}</p>
                       {action.expectedBenefit && (
                         <p className="text-xs text-green-600 mt-1">✓ {action.expectedBenefit}</p>
                       )}
                     </div>
                   </div>
                 </CardContent>
               </Card>
             ))}
 
             {/* Scenario Projections */}
             {analysis?.scenarioProjections?.length > 0 && (
               <Card>
                 <CardHeader>
                   <CardTitle className="text-base">Scenario Projections</CardTitle>
                 </CardHeader>
                 <CardContent className="space-y-3">
                   {analysis.scenarioProjections.map((scenario: any, idx: number) => (
                     <div key={idx} className="p-3 bg-muted rounded-lg">
                       <div className="flex justify-between mb-1">
                         <span className="font-medium text-sm">{scenario.scenario}</span>
                         <span className="text-xs">{scenario.probability} likely</span>
                       </div>
                       <p className="text-sm">Yield impact: {scenario.yieldImpact}</p>
                       <p className="text-xs text-muted-foreground mt-1">→ {scenario.recommendedResponse}</p>
                     </div>
                   ))}
                 </CardContent>
               </Card>
             )}
            </TabsContent>

            <TabsContent value="research" className="mt-4 space-y-4">
              {/* Current Conditions */}
              {analysis?.currentConditions && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Thermometer className="w-4 h-4" />
                      Live Conditions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="p-2 bg-muted rounded">
                        <p className="text-muted-foreground text-xs">Temperature</p>
                        <p className="font-bold">{analysis.currentConditions.temperature_2m}°C</p>
                      </div>
                      <div className="p-2 bg-muted rounded">
                        <p className="text-muted-foreground text-xs">Humidity</p>
                        <p className="font-bold">{analysis.currentConditions.relative_humidity_2m}%</p>
                      </div>
                      <div className="p-2 bg-muted rounded">
                        <p className="text-muted-foreground text-xs">Wind Speed</p>
                        <p className="font-bold">{analysis.currentConditions.wind_speed_10m} km/h</p>
                      </div>
                      <div className="p-2 bg-muted rounded">
                        <p className="text-muted-foreground text-xs">Soil Moisture</p>
                        <p className="font-bold">{analysis.currentConditions.soil_moisture_0_to_7cm ?? 'N/A'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Research Insights */}
              {analysis?.researchInsights && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      Research Insights
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analysis.researchInsights.dataQuality && (
                      <div>
                        <p className="text-xs text-muted-foreground">Data Quality</p>
                        <p className="text-sm">{analysis.researchInsights.dataQuality}</p>
                      </div>
                    )}
                    {analysis.researchInsights.uncertaintyFactors?.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Uncertainty Factors</p>
                        {analysis.researchInsights.uncertaintyFactors.map((f: string, i: number) => (
                          <p key={i} className="text-sm">• {f}</p>
                        ))}
                      </div>
                    )}
                    {analysis.researchInsights.recommendedMonitoring?.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Recommended Monitoring</p>
                        {analysis.researchInsights.recommendedMonitoring.map((m: string, i: number) => (
                          <p key={i} className="text-sm text-primary">→ {m}</p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Data Harvesting Status */}
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Database className="w-4 h-4 text-green-500" />
                    <span className="text-muted-foreground">
                      {analysis?.dataHarvested
                        ? 'Climate data harvested for future research'
                        : 'Data collection pending'}
                    </span>
                  </div>
                  {analysis?.knowledgeGraphUsed && (
                    <div className="flex items-center gap-2 text-sm mt-2">
                      <Bug className="w-4 h-4 text-primary" />
                      <span className="text-muted-foreground">Knowledge Graph enriched analysis</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
 
         <Button onClick={fetchClimateAnalysis} variant="outline" className="w-full" disabled={loading}>
           Refresh Analysis
         </Button>
       </div>
     </div>
   );
 };
 
const ClimateRisk = () => (
  <PremiumGate feature="Climate Volatility Engine" requiredPlan="premium">
    <ClimateRiskContent />
  </PremiumGate>
);

export default ClimateRisk;