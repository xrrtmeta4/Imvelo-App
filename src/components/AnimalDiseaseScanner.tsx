import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Stethoscope, Camera, Loader2, Download, Crown, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { generateResultPdf } from '@/lib/generateResultPdf';
import { useUsageLimits } from '@/hooks/useUsageLimits';

const AnimalDiseaseScanner = () => {
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
      const fileName = `animal-disease/${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('pest-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('pest-images')
        .getPublicUrl(fileName);

      const { data: identifyData, error: identifyError } = await supabase.functions
        .invoke('identify-animal-disease', {
          body: { imageUrl: publicUrl }
        });

      if (identifyError) throw identifyError;

      setResult(identifyData);
      incrementDetection();
      toast.success('Disease identified successfully!');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!result) return;
    generateResultPdf({
      title: 'Animal Disease Report',
      type: 'animal-disease',
      data: {
        disease_name: result.disease_name,
        animal_type: result.animal_type,
        treatment: result.treatment,
        prevention: result.prevention,
        urgency: result.urgency,
        confidence: `${result.confidence}%`
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" />
            Identify Animal Diseases
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
              Upload a photo of your animal to identify diseases and get treatment advice.
            </p>
            
            <input
              type="file"
              accept="image/*"
              capture="environment"
              id="animal-disease-capture"
              className="hidden"
              onChange={handleImageUpload}
              disabled={loading}
            />
            <input
              type="file"
              accept="image/*"
              id="animal-disease-upload"
              className="hidden"
              onChange={handleImageUpload}
              disabled={loading}
            />
            
            <div className="grid grid-cols-2 gap-3">
              <label htmlFor="animal-disease-capture">
                <Button className="w-full" size="lg" disabled={loading} asChild>
                  <span>
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Analyzing...
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
              <label htmlFor="animal-disease-upload">
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
            <h4 className="font-semibold text-sm text-primary">Results:</h4>
            <p className="text-sm"><strong>Disease:</strong> {result.disease_name}</p>
            <p className="text-sm"><strong>Animal:</strong> {result.animal_type}</p>
            <p className="text-sm"><strong>Treatment:</strong> {result.treatment}</p>
            <p className="text-sm"><strong>Prevention:</strong> {result.prevention}</p>
            <p className="text-sm"><strong>Confidence:</strong> {result.confidence}%</p>
            {result.urgency === 'high' && (
              <p className="text-sm text-destructive font-semibold">⚠️ Urgent! Contact a veterinarian immediately.</p>
            )}
            
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

export default AnimalDiseaseScanner;
