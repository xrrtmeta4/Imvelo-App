 import PremiumGate from '@/components/PremiumGate';
 import { useState, useEffect, useCallback } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { CloudLightning, Loader2, AlertTriangle, TrendingUp, Thermometer, Droplets, Wind, Sun, Sprout, Calendar, Shield } from 'lucide-react';
 import { supabase } from '@/lib/supabase';
 import { toast } from 'sonner';
 import { useAuth } from '@/hooks/useAuth';
 import { useLocation } from '@/hooks/useLocation';
 
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
 
         <Tabs defaultValue="outlook" className="w-full">
           <TabsList className="grid w-full grid-cols-3">
             <TabsTrigger value="outlook">Outlook</TabsTrigger>
             <TabsTrigger value="crops">Crops</TabsTrigger>
             <TabsTrigger value="actions">Actions</TabsTrigger>
           </TabsList>
 
           <TabsContent value="outlook" className="mt-4 space-y-4">
             {/* Short Term */}
             <Card>
               <CardHeader className="pb-2">
                 <CardTitle className="text-base flex items-center gap-2">
                   <Calendar className="w-4 h-4" />
                   {analysis?.shortTermOutlook?.period}
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <p className="text-sm mb-3">{analysis?.shortTermOutlook?.conditions}</p>
                 {analysis?.shortTermOutlook?.farmingOpportunities?.length > 0 && (
                   <div className="mb-2">
                     <p className="text-xs text-muted-foreground mb-1">Opportunities:</p>
                     <div className="flex flex-wrap gap-1">
                       {analysis.shortTermOutlook.farmingOpportunities.map((opp: string, i: number) => (
                         <span key={i} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">{opp}</span>
                       ))}
                     </div>
                   </div>
                 )}
                 {analysis?.shortTermOutlook?.risks?.length > 0 && (
                   <div>
                     <p className="text-xs text-muted-foreground mb-1">Risks:</p>
                     <div className="flex flex-wrap gap-1">
                       {analysis.shortTermOutlook.risks.map((risk: string, i: number) => (
                         <span key={i} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">{risk}</span>
                       ))}
                     </div>
                   </div>
                 )}
               </CardContent>
             </Card>
 
             {/* Mid Term */}
             <Card>
               <CardHeader className="pb-2">
                 <CardTitle className="text-base flex items-center gap-2">
                   <TrendingUp className="w-4 h-4" />
                   {analysis?.midTermOutlook?.period}
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 <p className="text-sm mb-2">{analysis?.midTermOutlook?.conditions}</p>
                 {analysis?.midTermOutlook?.yieldProjection && (
                   <p className="text-sm font-medium">
                     Yield Projection: <span className="text-primary">{analysis.midTermOutlook.yieldProjection}</span>
                   </p>
                 )}
               </CardContent>
             </Card>
 
             {/* Long Term */}
             <Card>
               <CardHeader className="pb-2">
                 <CardTitle className="text-base flex items-center gap-2">
                   <Shield className="w-4 h-4" />
                   {analysis?.longTermOutlook?.period}
                 </CardTitle>
               </CardHeader>
               <CardContent>
                 {analysis?.longTermOutlook?.climateTrends?.map((trend: string, i: number) => (
                   <p key={i} className="text-sm mb-1">• {trend}</p>
                 ))}
               </CardContent>
             </Card>
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
         </Tabs>
 
         <Button onClick={fetchClimateAnalysis} variant="outline" className="w-full" disabled={loading}>
           Refresh Analysis
         </Button>
       </div>
     </div>
   );
 };
 
const ClimateRisk = () => (
  <PremiumGate feature="Advanced Climate Resilience Tools" requiredPlan="pro">
    <ClimateRiskContent />
  </PremiumGate>
);

 export default ClimateRisk;