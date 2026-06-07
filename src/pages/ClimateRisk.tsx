 
 import { useState, useEffect, useCallback } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { CloudLightning, Loader2, AlertTriangle, TrendingUp, Thermometer, Droplets, Wind, Sun, Sprout, Calendar, Shield, Database, Bug } from 'lucide-react';
 import { supabase } from '@/lib/supabase';
 import { toast } from 'sonner';
 import { useAuth } from '@/hooks/useAuth';
 import { useLocation } from '@/hooks/useLocation';
import {
  ResponsiveContainer, ComposedChart, Line, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
  BarChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
 
 const ClimateRiskContent = () => {
   const { user } = useAuth();
   const { getLocation } = useLocation();
   const [loading, setLoading] = useState(true);
   const [analysis, setAnalysis] = useState<any>(null);
 
   const fetchClimateAnalysis = useCallback(async () => {
     try {
       setLoading(true);
       const location = await getLocation({ preferGps: true });
       
       const { data, error } = await supabase.functions.invoke('climate-risk-analysis', {
         body: { 
           latitude: location.latitude,
           longitude: location.longitude,
           crops: ['Maize', 'Beans', 'Vegetables']
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
   }, [getLocation]);
 
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
 
          {/* 16-day forecast chart */}
          {forecastChartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> 16-Day Forecast
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={forecastChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="day" tick={{ fontSize: 10 }} interval={1} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar yAxisId="right" dataKey="rain" name="Rain (mm)" fill="hsl(var(--primary))" opacity={0.5} />
                      <Line yAxisId="left" type="monotone" dataKey="tMax" name="Max °C" stroke="#ef4444" dot={false} strokeWidth={2} />
                      <Line yAxisId="left" type="monotone" dataKey="tMin" name="Min °C" stroke="#3b82f6" dot={false} strokeWidth={2} />
                    </ComposedChart>
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
              {eventChartData.length > 0 && (
                <div className="w-full h-48 mb-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={eventChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="event" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 10 }} unit="%" />
                      <Tooltip />
                      <Bar dataKey="probability" name="Probability" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
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
 
          {/* Climatology */}
          {climatologyData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Database className="w-4 h-4" /> Local Climatology (3-yr avg)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={climatologyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar yAxisId="right" dataKey="rain" name="Rain (mm/mo)" fill="hsl(var(--primary))" opacity={0.4} />
                      <Line yAxisId="left" type="monotone" dataKey="temp" name="Avg °C" stroke="#ef4444" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

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
             {analysis?.cropRecommendations?.map((crop: any, idx: number) => (
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
                   {crop.adaptations?.length > 0 && (
                     <div className="text-sm">
                       <p className="font-medium mb-1">Adaptations:</p>
                       <ul className="list-disc list-inside text-muted-foreground">
                         {crop.adaptations.map((a: string, i: number) => (
                           <li key={i}>{a}</li>
                         ))}
                       </ul>
                     </div>
                   )}
                 </CardContent>
               </Card>
             ))}
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
 
export default ClimateRiskContent;