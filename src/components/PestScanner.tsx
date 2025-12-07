import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bug, Camera, Loader2, Upload } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const PestScanner = () => {
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
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('pest-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('pest-images')
        .getPublicUrl(fileName);

      // Call AI identification
      const { data: identifyData, error: identifyError } = await supabase.functions
        .invoke('identify-pest', {
          body: { imageUrl: publicUrl }
        });

      if (identifyError) throw identifyError;

      setResult(identifyData);

      // Save to database
      await supabase.from('pest_reports').insert({
        user_id: user.id,
        image_url: publicUrl,
        pest_name: identifyData.pest_name,
        treatment: identifyData.treatment,
        confidence: identifyData.confidence,
      });

      toast.success('Isipho sitholiwe ngempumelelo!');
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
          <Bug className="w-5 h-5 text-primary" />
          Bona Tilwakatana
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          id="pest-upload"
          className="hidden"
          onChange={handleImageUpload}
          disabled={loading}
        />
        
        <label htmlFor="pest-upload">
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
                  Tsatsa Sitfombe
                </>
              )}
            </span>
          </Button>
        </label>

        {result && (
          <div className="mt-4 p-4 rounded-lg bg-accent space-y-2">
            <h4 className="font-semibold text-sm text-primary">Imiphumela:</h4>
            <p className="text-sm"><strong>Isipho:</strong> {result.pest_name}</p>
            <p className="text-sm"><strong>Lokwelapha:</strong> {result.treatment}</p>
            <p className="text-sm"><strong>Ukuqiniseka:</strong> {result.confidence}%</p>
          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default PestScanner;
