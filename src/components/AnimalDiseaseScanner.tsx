import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Stethoscope, Camera, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const AnimalDiseaseScanner = () => {
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
      const fileName = `animal-disease/${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('pest-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('pest-images')
        .getPublicUrl(fileName);

      // Call AI identification
      const { data: identifyData, error: identifyError } = await supabase.functions
        .invoke('identify-animal-disease', {
          body: { imageUrl: publicUrl }
        });

      if (identifyError) throw identifyError;

      setResult(identifyData);
      toast.success('Sifo sitfoliwe ngempumelelo!');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Kukhona lokwehlulekile. Sicela uzame futhi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-primary" />
          Bona Tifo Tetilwane
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Layisha sitfombe sesilwane sakho kutfola sifo nekwelapha.
        </p>
        
        <input
          type="file"
          accept="image/*"
          capture="environment"
          id="animal-disease-upload"
          className="hidden"
          onChange={handleImageUpload}
          disabled={loading}
        />
        
        <label htmlFor="animal-disease-upload">
          <Button className="w-full" size="lg" disabled={loading} asChild>
            <span>
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Kuyahlolwa...
                </>
              ) : (
                <>
                  <Camera className="w-5 h-5 mr-2" />
                  Tsatsa Sitfombe Sesilwane
                </>
              )}
            </span>
          </Button>
        </label>

        {result && (
          <div className="mt-4 p-4 rounded-lg bg-accent space-y-2">
            <h4 className="font-semibold text-sm text-primary">Imiphumela:</h4>
            <p className="text-sm"><strong>Sifo:</strong> {result.disease_name}</p>
            <p className="text-sm"><strong>Tilwane:</strong> {result.animal_type}</p>
            <p className="text-sm"><strong>Lokwelapha:</strong> {result.treatment}</p>
            <p className="text-sm"><strong>Lucwaningo:</strong> {result.prevention}</p>
            <p className="text-sm"><strong>Lizinga lekuciniseka:</strong> {result.confidence}%</p>
            {result.urgency === 'high' && (
              <p className="text-sm text-destructive font-semibold">⚠️ Phutfuma! Shayela udokotela wetilwane.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AnimalDiseaseScanner;