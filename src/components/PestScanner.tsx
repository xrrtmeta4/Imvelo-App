import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bug, Camera, Loader2, Download, Crown, Upload, AlertTriangle, Eye, Atom } from 'lucide-react';
import ScanningOverlay from './ScanningOverlay';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { generateResultPdf } from '@/lib/generateResultPdf';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { showLimitReached } from '@/lib/limitPrompt';

const PestScanner = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [quantumMode, setQuantumMode] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { canUseDetection, incrementDetection, getRemainingDetections, openUpgrade, isPremium } = useUsageLimits();

  const remaining = getRemainingDetections();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    
    if (!canUseDetection()) {
      showLimitReached('scan');
      return;
    }
    
    const file = e.target.files[0];
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setLoading(true);
    setResult(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('pest-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('pest-images')
        .getPublicUrl(fileName);

      const { data: identifyData, error: identifyError } = await supabase.functions
        .invoke('identify-pest', {
          body: { imageUrl: publicUrl, quantum: quantumMode && isPremium }
        });

      if (identifyError) {
        const detail = await (identifyError as any)?.context?.text?.().catch(() => '') ?? '';
        if (/scans for this week|limit_reached/i.test(detail)) {
          showLimitReached('scan');
          return;
        }
        throw identifyError;
      }
      if (identifyData?.error) throw new Error(identifyData.error);
      if (!identifyData?.pest_name) throw new Error('The AI could not read this image. Try a clearer close-up in good light.');

      setResult(identifyData);
      incrementDetection();

      await supabase.from('pest_reports').insert({
        user_id: user.id,
        image_url: publicUrl,
        pest_name: identifyData.pest_name,
        treatment: identifyData.treatment,
        confidence: identifyData.confidence,
      });

      // Auto-submit to knowledge graph
      try {
        await supabase.functions.invoke('knowledge-graph-ingest', {
          body: {
            contributionType: 'scan_confirmation',
            entities: [
              { name: identifyData.pest_name, nodeType: 'pest' },
              ...(identifyData.treatment ? [{ name: identifyData.treatment, nodeType: 'treatment' }] : [])
            ],
            relationships: identifyData.treatment ? [{
              sourceName: identifyData.treatment,
              targetName: identifyData.pest_name,
              relationship: 'treats',
              metadata: { confidence: identifyData.confidence, source: 'ai_scan' }
            }] : [],
            context: { scanType: 'pest', confidence: identifyData.confidence },
            userId: user.id
          }
        });
      } catch (graphErr) {
        console.error('Knowledge graph ingest failed (non-fatal):', graphErr);
      }

      toast.success('Pest identified successfully!');
    } catch (error: any) {
      console.error('Error:', error);
      const msg = error?.context?.body || error?.message || '';
      if (/rate|429|quota/i.test(msg)) toast.error('AI is busy right now. Please retry in a moment.');
      else if (/network|failed to fetch|offline/i.test(msg)) toast.error('Network issue — check your connection and try again.');
      else if (/storage|upload|bucket/i.test(msg)) toast.error('Upload failed — try a smaller or clearer photo.');
      else if (/invalid|unsupported|format/i.test(msg)) toast.error('Unsupported image — use JPG or PNG.');
      else toast.error(`Scan failed: ${msg?.slice(0, 100) || 'Please try again with a clearer photo.'}`);
    } finally {
      setLoading(false);
      // Give the overlay a beat to fade before releasing the object URL
      setTimeout(() => {
        URL.revokeObjectURL(localPreview);
        setPreviewUrl(null);
      }, 400);
    }
  };

  const handleDownloadPdf = () => {
    if (!result) return;
    generateResultPdf({
      title: 'Pest Identification Report',
      type: 'pest',
      data: {
        pest_name: result.pest_name,
        treatment: result.treatment,
        confidence: `${result.confidence}%`,
        ...(result.severity ? { severity: result.severity } : {}),
        ...(Array.isArray(result.evidence) && result.evidence.length ? { evidence: result.evidence } : {}),
        disclaimer: result.disclaimer || 'AI-assisted identification — not a substitute for professional agricultural advice. Always verify with a qualified extension officer before applying any chemical treatment.'
      }
    });
  };

  return (
    <>
      <ScanningOverlay active={loading} label="PEST SCAN" imageUrl={previewUrl} />
      <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-primary" />
            Identify Pests
          </span>
          {!isPremium && (
            <span className="text-xs font-normal text-muted-foreground">
              {remaining} scan this week
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
          <Atom className="w-3 h-3" /> Chloe AI · trained on PlantDoc · IP102 · PlantVillage
        </div>
        {!canUseDetection() ? (
          <div className="text-center py-4 space-y-3">
           <p className="text-sm text-muted-foreground">
              You've used your free scan this week.
            </p>
            <Button onClick={openUpgrade} className="gap-2">
              <Crown className="w-4 h-4" />
              Upgrade for Unlimited
            </Button>
          </div>
        ) : (
          <>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              id="pest-capture"
              className="hidden"
              onChange={handleImageUpload}
              disabled={loading}
            />
            <input
              type="file"
              accept="image/*"
              id="pest-upload"
              className="hidden"
              onChange={handleImageUpload}
              disabled={loading}
            />
            
            <div className="grid grid-cols-2 gap-3">
              <label htmlFor="pest-capture">
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
              <label htmlFor="pest-upload">
                <Button variant="outline" className="w-full" size="lg" disabled={loading} asChild>
                  <span>
                    <Upload className="w-5 h-5 mr-2" />
                    Upload
                  </span>
                </Button>
              </label>
            </div>

            <button
              type="button"
              onClick={() => {
                if (!isPremium) { openUpgrade(); return; }
                setQuantumMode(v => !v);
              }}
              className={`w-full flex items-center justify-between gap-2 text-xs rounded-lg border p-3 transition-colors ${
                quantumMode && isPremium
                  ? 'border-primary bg-primary/5 text-primary'
                  : 'border-border hover:bg-accent text-muted-foreground'
              }`}
            >
              <span className="flex items-center gap-2">
                <Atom className={`w-4 h-4 ${quantumMode && isPremium ? 'animate-pulse' : ''}`} />
                Quantum Intelligence {!isPremium && '(Premium)'}
              </span>
              <span className="text-[10px] font-semibold uppercase">
                {quantumMode && isPremium ? 'ON' : 'OFF'}
              </span>
            </button>
          </>
        )}

        {result && (
          <div className="mt-4 p-4 rounded-lg bg-accent space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-primary">Results:</h4>
              {result.quantum?.enabled && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                  <Atom className="w-3 h-3" /> Quantum · {result.quantum.agreement}
                </span>
              )}
            </div>
            <p className="text-sm"><strong>Pest:</strong> {result.pest_name}</p>
            <p className="text-sm"><strong>Treatment:</strong> {result.treatment}</p>
            <p className="text-sm"><strong>Confidence:</strong> {result.confidence}%</p>
            {result.severity && (
              <p className="text-sm"><strong>Severity:</strong> {result.severity}</p>
            )}

            {Array.isArray(result.evidence) && result.evidence.length > 0 && (
              <div className="mt-2 p-3 rounded-md bg-background/60 border border-border">
                <div className="flex items-center gap-2 mb-1">
                  <Eye className="w-4 h-4 text-primary" />
                  <p className="text-xs font-semibold text-primary">Why the AI reached this decision</p>
                </div>
                <ul className="text-xs list-disc list-inside space-y-0.5">
                  {result.evidence.map((ev: string, i: number) => (
                    <li key={i}>{ev}</li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(result.alternatives) && result.alternatives.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-semibold text-muted-foreground">Possible alternatives:</p>
                <ul className="text-xs list-disc list-inside text-muted-foreground">
                  {result.alternatives.map((a: any, i: number) => (
                    <li key={i}>{a.name}{a.likelihood ? ` — ${a.likelihood}%` : ''}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-3 p-2 rounded-md bg-yellow-500/10 border border-yellow-500/30 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-yellow-900 dark:text-yellow-200 leading-relaxed">
                {result.disclaimer || 'AI-assisted identification — not a substitute for professional agricultural advice. Always verify with a qualified extension officer before applying any chemical treatment.'}
              </p>
            </div>

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
    </>
  );
};

export default PestScanner;
