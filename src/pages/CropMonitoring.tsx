 
 import { useState } from 'react';
 import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
 import { Button } from '@/components/ui/button';
 import { Input } from '@/components/ui/input';
 import { Label } from '@/components/ui/label';
 import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
 import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
 import { Leaf, Camera, Upload, Loader2, AlertTriangle, CheckCircle, Droplets, Zap, Bug, TrendingUp, TrendingDown } from 'lucide-react';
 import { supabase } from '@/lib/supabase';
 import { toast } from 'sonner';
 import { useAuth } from '@/hooks/useAuth';
 import { useUsageLimits } from '@/hooks/useUsageLimits';
 import { format } from 'date-fns';
 
 const cropTypes = [
   'Maize', 'Sorghum', 'Beans', 'Groundnuts', 'Sweet Potatoes', 
   'Cotton', 'Sugarcane', 'Vegetables', 'Citrus', 'Other'
 ];
 
 const growthStages = [
   'Seedling', 'Vegetative', 'Flowering', 'Fruiting', 'Maturity'
 ];
 
 const CropMonitoringContent = () => {
   const { user } = useAuth();
   const { canUseDetection, incrementDetection, getRemainingDetections, openUpgrade, isPremium } = useUsageLimits();
   const [loading, setLoading] = useState(false);
   const [result, setResult] = useState<any>(null);
   const [cropType, setCropType] = useState('');
   const [plantingDate, setPlantingDate] = useState('');
   const [expectedStage, setExpectedStage] = useState('');
 
   const remaining = getRemainingDetections();
 
   const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if (!e.target.files || !e.target.files[0] || !user) return;
     
     if (!canUseDetection()) {
       toast.error('Daily limit reached. Upgrade for unlimited monitoring!');
       return;
     }
 
     const file = e.target.files[0];
     setLoading(true);
     setResult(null);
 
     try {
       const fileExt = file.name.split('.').pop();
       const fileName = `crop-monitoring/${user.id}/${Date.now()}.${fileExt}`;
       
       const { error: uploadError } = await supabase.storage
         .from('pest-images')
         .upload(fileName, file);
 
       if (uploadError) throw uploadError;
 
       const { data: { publicUrl } } = supabase.storage
         .from('pest-images')
         .getPublicUrl(fileName);
 
       const { data, error } = await supabase.functions.invoke('analyze-crop-health', {
         body: { 
           imageUrl: publicUrl,
           cropType,
           plantingDate,
           expectedGrowthStage: expectedStage
         }
       });
 
       if (error) throw error;
 
       setResult(data);
       incrementDetection();
       toast.success('Crop analysis complete!');
     } catch (error: any) {
       console.error('Error:', error);
       toast.error('Analysis failed. Please try again.');
     } finally {
       setLoading(false);
     }
   };
 
   const getSeverityColor = (severity: string) => {
     switch (severity) {
       case 'critical': return 'text-red-600 bg-red-100';
       case 'high': return 'text-orange-600 bg-orange-100';
       case 'medium': return 'text-yellow-600 bg-yellow-100';
       default: return 'text-green-600 bg-green-100';
     }
   };
 
   const getHealthColor = (health: string) => {
     switch (health) {
       case 'excellent': return 'text-green-600';
       case 'good': return 'text-green-500';
       case 'fair': return 'text-yellow-600';
       case 'poor': return 'text-orange-600';
       case 'critical': return 'text-red-600';
       default: return 'text-muted-foreground';
     }
   };
 
   const getStressIcon = (type: string) => {
     switch (type) {
       case 'nutrient': return <Zap className="w-4 h-4" />;
       case 'water': return <Droplets className="w-4 h-4" />;
       case 'disease': return <AlertTriangle className="w-4 h-4" />;
       case 'pest': return <Bug className="w-4 h-4" />;
       default: return <AlertTriangle className="w-4 h-4" />;
     }
   };
 
   return (
     <div className="min-h-screen bg-background pb-20">
       <header className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-6 px-4">
         <div className="max-w-screen-sm mx-auto">
           <div className="flex items-center gap-3">
             <Leaf className="w-8 h-8" />
             <div>
               <h1 className="text-2xl font-bold">Crop Monitoring</h1>
               <p className="text-sm opacity-90">Phenotype-level health analysis</p>
             </div>
           </div>
         </div>
       </header>
 
       <div className="max-w-screen-sm mx-auto px-4 py-6 space-y-6">
         <Card>
           <CardHeader>
             <CardTitle className="flex items-center justify-between">
               <span>Analyze Crop Health</span>
               {!isPremium && (
                 <span className="text-xs font-normal text-muted-foreground">
                   {remaining} detection left
                 </span>
               )}
             </CardTitle>
           </CardHeader>
           <CardContent className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label>Crop Type</Label>
                 <Select value={cropType} onValueChange={setCropType}>
                   <SelectTrigger>
                     <SelectValue placeholder="Select crop" />
                   </SelectTrigger>
                   <SelectContent>
                     {cropTypes.map(crop => (
                       <SelectItem key={crop} value={crop}>{crop}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label>Expected Stage</Label>
                 <Select value={expectedStage} onValueChange={setExpectedStage}>
                   <SelectTrigger>
                     <SelectValue placeholder="Growth stage" />
                   </SelectTrigger>
                   <SelectContent>
                     {growthStages.map(stage => (
                       <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
             </div>
 
             <div className="space-y-2">
               <Label>Planting Date</Label>
               <Input 
                 type="date" 
                 value={plantingDate} 
                 onChange={(e) => setPlantingDate(e.target.value)}
                 max={format(new Date(), 'yyyy-MM-dd')}
               />
             </div>
 
             {!canUseDetection() ? (
               <div className="text-center py-4 space-y-3">
                 <p className="text-sm text-muted-foreground">
                   You've used your free detection today.
                 </p>
                 <Button onClick={openUpgrade} className="gap-2">
                   Upgrade for Unlimited
                 </Button>
               </div>
             ) : (
               <>
                 <input
                   type="file"
                   accept="image/*"
                   capture="environment"
                   id="crop-capture"
                   className="hidden"
                   onChange={handleImageUpload}
                   disabled={loading}
                 />
                 <input
                   type="file"
                   accept="image/*"
                   id="crop-upload"
                   className="hidden"
                   onChange={handleImageUpload}
                   disabled={loading}
                 />
                 
                 <div className="grid grid-cols-2 gap-3">
                   <label htmlFor="crop-capture">
                     <Button className="w-full" size="lg" disabled={loading} asChild>
                       <span>
                         {loading ? (
                           <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Analyzing...</>
                         ) : (
                           <><Camera className="w-5 h-5 mr-2" />Camera</>
                         )}
                       </span>
                     </Button>
                   </label>
                   <label htmlFor="crop-upload">
                     <Button variant="outline" className="w-full" size="lg" disabled={loading} asChild>
                       <span><Upload className="w-5 h-5 mr-2" />Upload</span>
                     </Button>
                   </label>
                 </div>
               </>
             )}
           </CardContent>
         </Card>
 
         {result && (
           <Tabs defaultValue="overview" className="w-full">
             <TabsList className="grid w-full grid-cols-3">
               <TabsTrigger value="overview">Overview</TabsTrigger>
               <TabsTrigger value="stress">Stress</TabsTrigger>
               <TabsTrigger value="actions">Actions</TabsTrigger>
             </TabsList>
 
             <TabsContent value="overview" className="mt-4">
               <Card>
                 <CardContent className="pt-6 space-y-4">
                   <div className="flex items-center justify-between">
                     <div>
                       <p className="text-sm text-muted-foreground">Overall Health</p>
                       <p className={`text-2xl font-bold capitalize ${getHealthColor(result.overallHealth)}`}>
                         {result.overallHealth}
                       </p>
                     </div>
                     <div className="text-right">
                       <p className="text-sm text-muted-foreground">Vigor Score</p>
                       <p className="text-3xl font-bold text-primary">{result.vigorScore}%</p>
                     </div>
                   </div>
 
                   <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                     <div className="space-y-1">
                       <p className="text-xs text-muted-foreground">Current Stage</p>
                       <p className="font-medium">{result.currentGrowthStage}</p>
                     </div>
                     <div className="space-y-1">
                       <p className="text-xs text-muted-foreground">Growth Status</p>
                       <div className="flex items-center gap-1">
                         {result.growthDeviation === 'delayed' || result.growthDeviation === 'stunted' ? (
                           <TrendingDown className="w-4 h-4 text-orange-500" />
                         ) : result.growthDeviation === 'ahead' ? (
                           <TrendingUp className="w-4 h-4 text-green-500" />
                         ) : (
                           <CheckCircle className="w-4 h-4 text-green-500" />
                         )}
                         <span className="capitalize">{result.growthDeviation?.replace('_', ' ')}</span>
                       </div>
                     </div>
                   </div>
 
                   <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                     <div className="space-y-1">
                       <p className="text-xs text-muted-foreground">Water Status</p>
                       <p className="font-medium capitalize">{result.waterStatus?.replace('_', ' ')}</p>
                     </div>
                     <div className="space-y-1">
                       <p className="text-xs text-muted-foreground">Yield Impact</p>
                       <p className="font-medium">{result.estimatedYieldImpact || 'Normal'}</p>
                     </div>
                   </div>
 
                   {result.nutrientStatus && (
                     <div className="pt-4 border-t">
                       <p className="text-xs text-muted-foreground mb-2">Nutrient Status</p>
                       <div className="grid grid-cols-2 gap-2">
                         {Object.entries(result.nutrientStatus).map(([nutrient, status]) => (
                           <div key={nutrient} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                             <span className="capitalize">{nutrient}</span>
                             <span className={`capitalize ${status === 'deficient' ? 'text-orange-500' : status === 'excess' ? 'text-yellow-500' : 'text-green-500'}`}>
                               {status as string}
                             </span>
                           </div>
                         ))}
                       </div>
                     </div>
                   )}
                 </CardContent>
               </Card>
             </TabsContent>
 
             <TabsContent value="stress" className="mt-4">
               <Card>
                 <CardContent className="pt-6 space-y-3">
                   {result.stressIndicators?.length > 0 ? (
                     result.stressIndicators.map((indicator: any, idx: number) => (
                       <div key={idx} className={`p-3 rounded-lg ${getSeverityColor(indicator.severity)}`}>
                         <div className="flex items-center gap-2 mb-1">
                           {getStressIcon(indicator.type)}
                           <span className="font-medium capitalize">{indicator.name}</span>
                           <span className="ml-auto text-xs px-2 py-0.5 bg-white/50 rounded capitalize">
                             {indicator.severity}
                           </span>
                         </div>
                         <p className="text-sm">{indicator.description}</p>
                         {indicator.affectedArea && (
                           <p className="text-xs mt-1">Affected area: {indicator.affectedArea}</p>
                         )}
                         <p className="text-sm mt-2 font-medium">→ {indicator.recommendation}</p>
                       </div>
                     ))
                   ) : (
                     <div className="text-center py-6 text-muted-foreground">
                       <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                       <p>No significant stress indicators detected!</p>
                     </div>
                   )}
                 </CardContent>
               </Card>
             </TabsContent>
 
             <TabsContent value="actions" className="mt-4">
               <Card>
                 <CardContent className="pt-6">
                   <p className="text-sm text-muted-foreground mb-3">Priority Actions</p>
                   <div className="space-y-2">
                     {result.priorityActions?.map((action: string, idx: number) => (
                       <div key={idx} className="flex items-start gap-2 p-3 bg-primary/10 rounded-lg">
                         <span className="w-6 h-6 flex items-center justify-center bg-primary text-primary-foreground rounded-full text-sm font-bold">
                           {idx + 1}
                         </span>
                         <p className="text-sm flex-1">{action}</p>
                       </div>
                     ))}
                   </div>
                   <p className="text-xs text-muted-foreground mt-4 text-center">
                     Confidence: {result.confidence}%
                   </p>
                 </CardContent>
               </Card>
             </TabsContent>
           </Tabs>
         )}
       </div>
     </div>
   );
 };
 
export default CropMonitoringContent;