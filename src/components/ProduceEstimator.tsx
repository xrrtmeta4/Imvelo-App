import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wheat, Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const ProduceEstimator = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    
    const file = e.target.files[0];
    setLoading(true);
    setResult(null);

    try {
      // Upload image to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `produce-estimate/${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('pest-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('pest-images')
        .getPublicUrl(fileName);

      // Call AI estimation
      const { data: estimateData, error: estimateError } = await supabase.functions
        .invoke('estimate-produce', {
          body: { imageUrl: publicUrl }
        });

      if (estimateError) throw estimateError;

      setResult(estimateData);
      toast.success('Estimation complete!');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wheat className="w-5 h-5 text-primary" />
          Estimate Yield
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Upload a photo of your field to get a yield estimate.
        </p>
        
        <input
          type="file"
          accept="image/*"
          capture="environment"
          id="produce-estimate-upload"
          className="hidden"
          onChange={handleImageUpload}
          disabled={loading}
        />
        
        <label htmlFor="produce-estimate-upload">
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
                  Take Field Photo
                </>
              )}
            </span>
          </Button>
        </label>

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
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProduceEstimator;
