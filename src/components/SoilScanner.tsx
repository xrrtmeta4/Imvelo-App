import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mountain, Camera, Upload, Download, Crown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { generateResultPdf } from '@/lib/generateResultPdf';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { showLimitReached } from '@/lib/limitPrompt';
import ScanningOverlay from './ScanningOverlay';

const SoilScanner = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { canUseDetection, incrementDetection, getRemainingDetections, openUpgrade, isPremium } = useUsageLimits();

  const remaining = getRemainingDetections();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;

    // Soil analysis is free for all users

    const file = e.target.files[0];
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setLoading(true);
    setResult(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `soil-analysis/${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('pest-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('pest-images')
        .getPublicUrl(fileName);

      const { data, error } = await supabase.functions.invoke('analyze-soil', {
        body: { imageUrl: publicUrl }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.soilType) throw new Error('Soil analysis failed. Try a closer, well-lit soil photo.');

      setResult(data);
      incrementDetection();
      toast.success('Soil analysis complete!');

      // Auto-submit to knowledge graph
      try {
        await supabase.functions.invoke('knowledge-graph-ingest', {
          body: {
            contributionType: 'scan_confirmation',
            entities: [
              { name: data.soilType, nodeType: 'soil_type' }
            ],
            context: { 
              scanType: 'soil', 
              phEstimate: data.phEstimate, 
              texture: data.texture, 
              drainage: data.drainage,
              confidence: data.confidence 
            },
            userId: user.id
          }
        });
      } catch (graphErr) {
        console.error('Knowledge graph ingest failed (non-fatal):', graphErr);
      }
    } catch (error: any) {
      console.error('Error:', error);
      const msg = error?.context?.body || error?.message || '';
      if (/scans for this week|limit_reached/i.test(msg)) {
        showLimitReached('scan');
      } else if (/rate|429|quota/i.test(msg)) {
        toast.error('AI is busy right now. Please retry in a moment.');
      } else if (/network|failed to fetch|offline/i.test(msg)) {
        toast.error('Network issue — check your connection.');
      } else if (/storage|upload|bucket/i.test(msg)) {
        toast.error('Upload failed — try a smaller or clearer photo.');
      } else {
        toast.error(`Analysis failed: ${msg?.slice(0, 100) || 'Please try again with a clearer photo.'}`);
      }
    } finally {
      setLoading(false);
      setTimeout(() => { URL.revokeObjectURL(localPreview); setPreviewUrl(null); }, 400);
    }
  };

  const handleDownloadPdf = () => {
    if (!result) return;
    generateResultPdf({
      title: 'Soil Analysis Report',
      type: 'soil',
      data: {
        soil_type: result.soilType,
        ph_estimate: result.phEstimate,
        texture: result.texture,
        organic_matter: result.organicMatter,
        drainage: result.drainage,
        recommendations: result.recommendations?.join('; '),
        confidence: `${result.confidence}%`
      }
    });
  };

  return (
    <>
      <ScanningOverlay active={loading} label="SOIL SCAN" imageUrl={previewUrl} />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Mountain className="w-5 h-5 text-primary" />
              Soil Analysis
            </span>
            {!isPremium && (
              <span className="text-xs font-normal text-muted-foreground">
                {remaining} scan this week
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Take a close-up photo of your soil to get type, pH estimate, texture, and improvement recommendations.
          </p>

          {!canUseDetection() ? (
            <div className="text-center py-4 space-y-3">
              <p className="text-sm text-muted-foreground">
                You've used your free scan this week.
              </p>
              <Button onClick={openUpgrade} className="gap-2">
                <Crown className="w-4 h-4" />
                Upgrade for More Scans
              </Button>
            </div>
          ) : (
            <>
              <input type="file" accept="image/*" capture="environment" id="soil-capture" className="hidden" onChange={handleImageUpload} disabled={loading} />
              <input type="file" accept="image/*" id="soil-upload" className="hidden" onChange={handleImageUpload} disabled={loading} />

              <div className="grid grid-cols-2 gap-3">
                <label htmlFor="soil-capture">
                  <Button className="w-full" size="lg" disabled={loading} asChild>
                    <span><Camera className="w-5 h-5 mr-2" />Camera</span>
                  </Button>
                </label>
                <label htmlFor="soil-upload">
                  <Button variant="outline" className="w-full" size="lg" disabled={loading} asChild>
                    <span><Upload className="w-5 h-5 mr-2" />Upload</span>
                  </Button>
                </label>
              </div>
            </>
          )}

          {result && (
            <div className="mt-4 p-4 rounded-lg bg-accent space-y-2">
              <h4 className="font-semibold text-sm text-primary">Results:</h4>
              <p className="text-sm"><strong>Soil Type:</strong> {result.soilType}</p>
              <p className="text-sm"><strong>pH Estimate:</strong> {result.phEstimate}</p>
              <p className="text-sm"><strong>Texture:</strong> {result.texture}</p>
              <p className="text-sm"><strong>Organic Matter:</strong> {result.organicMatter}</p>
              <p className="text-sm"><strong>Drainage:</strong> {result.drainage}</p>
              <p className="text-sm"><strong>Confidence:</strong> {result.confidence}%</p>
              {result.recommendations?.length > 0 && (
                <div>
                  <p className="text-sm font-medium mt-2">Recommendations:</p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground">
                    {result.recommendations.map((r: string, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
              <Button onClick={handleDownloadPdf} variant="outline" className="w-full mt-3">
                <Download className="w-4 h-4 mr-2" />
                Download PDF Report
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default SoilScanner;
