import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wheat, Camera, Loader2, Download, Crown, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { generateResultPdf } from '@/lib/generateResultPdf';
import { useUsageLimits } from '@/hooks/useUsageLimits';

const ProduceEstimator = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { canUseDetection, incrementDetection, getRemainingDetections, openUpgrade, isPremium } = useUsageLimits();

  const remaining = getRemainingDetections();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    
    if (!canUseDetection()) {
      toast.error('Daily limit reached. Upgrade for unlimited detections!');
      return;
    }
    
    const file = e.target.files[0];
    setLoading(true);
    setResult(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `produce-estimate/${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('pest-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('pest-images')
        .getPublicUrl(fileName);

      const { data: estimateData, error: estimateError } = await supabase.functions
        .invoke('estimate-produce', {
          body: { imageUrl: publicUrl }
        });

      if (estimateError) throw estimateError;
      if (estimateData?.error) throw new Error(estimateData.error);
      if (!estimateData?.crop_type || estimateData.crop_type === 'Failed') {
        throw new Error('Estimation failed. Try a photo taken from above showing more of the field.');
      }
      setResult(estimateData);
      incrementDetection();
      toast.success('Estimation complete!');
    } catch (error: any) {
      console.error('Error:', error);
      const msg = error?.context?.body || error?.message || '';
      if (/rate|429|quota/i.test(msg)) toast.error('AI is busy right now. Please retry in a moment.');
      else if (/network|failed to fetch|offline/i.test(msg)) toast.error('Network issue — check your connection.');
      else if (/storage|upload|bucket/i.test(msg)) toast.error('Upload failed — try a smaller or clearer photo.');
      else toast.error(msg?.slice(0, 140) || 'Estimation failed. Please try again with a clearer photo.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!result) return;
    generateResultPdf({
      title: 'Yield Estimation Report',
      type: 'produce',
      data: {
        crop_type: result.crop_type,
        estimated_yield: result.estimated_yield,
        crop_health: result.crop_health,
        harvest_time: result.harvest_time,
        recommendations: result.recommendations,
        confidence: `${result.confidence}%`
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Wheat className="w-5 h-5 text-primary" />
            Estimate Yield
          </span>
          {!isPremium && (
            <span className="text-xs font-normal text-muted-foreground">
              {remaining} detection left
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canUseDetection() ? (
          <div className="text-center py-4 space-y-3">
            <p className="text-sm text-muted-foreground">
              You've used your free detection today.
            </p>
            <Button onClick={openUpgrade} className="gap-2">
              <Crown className="w-4 h-4" />
              Upgrade for Unlimited
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Upload a photo of your field to get a yield estimate.
            </p>
            
            <input
              type="file"
              accept="image/*"
              capture="environment"
              id="produce-estimate-capture"
              className="hidden"
              onChange={handleImageUpload}
              disabled={loading}
            />
            <input
              type="file"
              accept="image/*"
              id="produce-estimate-upload"
              className="hidden"
              onChange={handleImageUpload}
              disabled={loading}
            />
            
            <div className="grid grid-cols-2 gap-3">
              <label htmlFor="produce-estimate-capture">
                <Button className="w-full" size="lg" disabled={loading} asChild>
                  <span>
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Estimating...
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5 mr-2" />
                        Camera
                      </>
                    )}
                  </span>
                </Button>
              </label>
              <label htmlFor="produce-estimate-upload">
                <Button variant="outline" className="w-full" size="lg" disabled={loading} asChild>
                  <span>
                    <Upload className="w-5 h-5 mr-2" />
                    Upload
                  </span>
                </Button>
              </label>
            </div>
          </>
        )}

        {result && (
          <div className="mt-4 p-4 rounded-lg bg-accent space-y-2">
            <h4 className="font-semibold text-sm text-primary">Estimation:</h4>
            <p className="text-sm"><strong>Crop Type:</strong> {result.crop_type}</p>
            <p className="text-sm"><strong>Expected Yield:</strong> {result.estimated_yield}</p>
            <p className="text-sm"><strong>Crop Health:</strong> {result.crop_health}</p>
            <p className="text-sm"><strong>Harvest Time:</strong> {result.harvest_time}</p>
            {result.recommendations && (
              <div>
                <p className="text-sm font-semibold mt-2">Recommendations:</p>
                <ul className="text-sm list-disc list-inside">
                  {result.recommendations.map((rec: string, idx: number) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-sm"><strong>Confidence:</strong> {result.confidence}%</p>
            
            <Button 
              onClick={handleDownloadPdf} 
              variant="outline" 
              className="w-full mt-3"
            >
              <Download className="w-4 h-4 mr-2" />
              Download PDF Report
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProduceEstimator;
