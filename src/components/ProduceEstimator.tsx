import { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, Download, Crown, Upload, RefreshCw, Leaf, Droplets, Zap, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { generateResultPdf } from '@/lib/generateResultPdf';
import { showLimitReached } from '@/lib/limitPrompt';
import { useUsageLimits } from '@/hooks/useUsageLimits';

const STRESS_ICONS: Record<string, JSX.Element> = {
  healthy: <Leaf className="w-5 h-5 text-green-500" />,
  mild_stress: <Leaf className="w-5 h-5 text-lime-500" />,
  moderate_stress: <Leaf className="w-5 h-5 text-yellow-500" />,
  severe_stress: <Leaf className="w-5 h-5 text-orange-500" />,
  water_stressed: <Droplets className="w-5 h-5 text-blue-500" />,
  nutrient_deficient: <Zap className="w-5 h-5 text-purple-500" />,
  pest_damage: <AlertTriangle className="w-5 h-5 text-red-500" />,
  diseased: <AlertTriangle className="w-5 h-5 text-red-600" />,
  healthy_animal: <Leaf className="w-5 h-5 text-green-400" />,
  stressed_animal: <AlertTriangle className="w-5 h-5 text-orange-600" />,
};

// Compute vegetation/water indices on-device from a phone camera image.
// Uses green vs red channel difference as an NDVI-like proxy: healthy tissue
// reflects more in the green and absorbs in red; the gap = vigor. Water stress
// shows as reduced green reflectance.
const computeIndices = (img: HTMLImageElement): {
  ndvi: number; evi: number; waterIndex: number; greenness: number;
} | null => {
  try {
    const w = Math.max(1, Math.min(img.naturalWidth || 400, 512));
    const h = Math.max(1, Math.min(img.naturalHeight || 400, 512));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    const data = ctx.getImageData(0, 0, w, h).data;

    let sumG = 0, sumR = 0, sumB = 0, sumNdi = 0, sumEvi = 0, sumWater = 0, px = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      // Skip near-black / over-exposed pixels for a stable index
      const mean = (r + g + b) / 3;
      if (mean < 0.05 || mean > 0.98) continue;
      px++;
      sumG += g; sumR += r; sumB += b;
      // NDVI-like: (green - red) / (green + red)  [proxy, since NIR channel is absent]
      const nirProxy = Math.max(g, r); // phone NIR-leak makes max channel a usable NIR-proxy
      const ndvi = (nirProxy !== 0) ? (nirProxy - r) / (nirProxy + r) : 0;
      if (ndvi > 0) { sumNdi += ndvi; }
      // EVI-like ratio
      sumEvi += Math.max(0, (g - r) * (nirProxy > 0 ? 1 / (nirProxy + 0.5) : 0));
      // Water index: green / red-ish  (less red-reflection => water stress)
      sumWater += r > 0 ? g / r : 0;
    }
    if (px === 0) return null;

    const ndvi = sumNdi / px;
    const evi = sumEvi / px;
    const waterIndex = sumWater / px;
    const greenness = sumG / px;
    return {
      ndvi: Math.max(-1, Math.min(1, ndvi)),
      evi: Math.max(0, Math.min(3, evi)),
      waterIndex: Math.max(0, Math.min(1, waterIndex)),
      greenness: Math.max(0, Math.min(1, greenness)),
    };
  } catch (e) {
    console.warn('Index computation failed:', e);
    return null;
  }
};

const ProduceEstimator = () => {
  const { user } = useAuth();
  const { canUseDetection, incrementDetection, getRemainingDetections, openUpgrade, isPremium } = useUsageLimits();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [indices, setIndices] = useState<any>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const remaining = getRemainingDetections();

  const analyzeLocal = useCallback(() => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) {
      toast.error('Please capture or upload an image first.');
      return;
    }
    const idx = computeIndices(img);
    if (!idx) {
      toast.error('Could not read image data. Try a clearer, well-lit photo.');
      return;
    }
    setIndices(idx);
  }, []);

  const handleFile = (file: File) => {
    if (!canUseDetection()) { showLimitReached('scan'); return; }
    const url = URL.createObjectURL(file);
    setSourceFile(file);
    setPreviewUrl(url);
    setResult(null);
    setIndices(null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    handleFile(file);
  };

  const handleAnalyze = async () => {
    if (!user) return;
    if (!previewUrl) { toast.error('Please capture or upload an image first.'); return; }
    if (!canUseDetection()) { showLimitReached('scan'); return; }

    setAnalyzing(true);
    try {
      if (!sourceFile) throw new Error('No source image file');
      const fileExt = sourceFile.name.split('.').pop() || 'jpg';
      const fileName = `stress-ir/${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase
        .storage.from('pest-images').upload(fileName, sourceFile, {
          contentType: sourceFile.type || 'image/jpeg',
          upsert: true,
        });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('pest-images').getPublicUrl(fileName);

      const idx = indices || (imgRef.current ? computeIndices(imgRef.current) : null);
      if (!idx) throw new Error('Could not compute indices from image');

      const { data, error } = await supabase.functions.invoke('scan-stress-ir', {
        body: {
          imageUrl: publicUrl,
          indices: idx,
        },
      });

      if (error) throw error;
      setResult(data);
      incrementDetection();
      toast.success('Stress analysis complete!');
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error?.message || 'Analysis failed. Try a clearer photo.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!result) return;
    generateResultPdf({
      title: 'Plant / Animal Stress Report',
      type: 'pest',
      data: {
        crop_type: result.cropType,
        estimated_yield: `${result.vigorScore}/100`,
        crop_health: result.healthStatus,
        harvest_time: result.diagnosis?.waterStress ?? '—',
        recommendations: result.recommendations,
        confidence: `${result.confidence}%`
      }
    });
  };

  if (!canUseDetection()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            IR Plant / Animal Stress Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">You've used your free scan quota today.</p>
          <Button onClick={openUpgrade} className="gap-2">
            <Crown className="w-4 h-4" /> Upgrade for Unlimited
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            IR Plant / Animal Stress Scanner
          </span>
          {!isPremium && (
            <span className="text-xs font-normal text-muted-foreground">{remaining} scan left</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Capture or upload a photo of your crop or animal. The phone camera computes NDVI-like and water-stress indices on-device, then Chloe interprets them to detect water stress, nutrient deficiency, disease or pest damage.
        </p>

        {!previewUrl ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label htmlFor="stress-camera">
                <Button className="w-full" size="lg" asChild>
                  <span>
                    <Camera className="w-5 h-5 mr-2" /> Camera
                  </span>
                </Button>
              </label>
              <label htmlFor="stress-upload">
                <Button variant="outline" className="w-full" size="lg" asChild>
                  <span><Upload className="w-5 h-5 mr-2" /> Upload</span>
                </Button>
              </label>
            </div>
            <input
              type="file" accept="image/*" capture="environment" id="stress-camera"
              className="hidden" onChange={handleImageUpload} disabled={loading || analyzing}
            />
            <input
              type="file" accept="image/*" id="stress-upload"
              className="hidden" onChange={handleImageUpload} disabled={loading || analyzing}
            />
          </>
        ) : (
          <div className="space-y-3">
            <img
              ref={el => { if (el) imgRef.current = el; }}
              src={previewUrl}
              alt="Preview"
              className="w-full h-48 object-cover rounded-lg border"
              onLoad={() => { /* indices computed lazily */ }}
            />
            {!indices && (
              <Button size="sm" variant="outline" onClick={analyzeLocal} className="w-full gap-2">
                <RefreshCw className="w-4 h-4" /> Compute indices
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleAnalyze}
                disabled={analyzing || loading}
                className="flex-1 gap-2"
              >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                {analyzing ? 'Scanning…' : 'Scan with AI'}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setPreviewUrl(null); setResult(null); setIndices(null); }}>
                Retake
              </Button>
            </div>
            {indices && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-muted rounded">NDVI: {indices.ndvi.toFixed(2)}</div>
                <div className="p-2 bg-muted rounded">Water idx: {indices.waterIndex.toFixed(2)}</div>
                <div className="p-2 bg-muted rounded">Greenness: {indices.greenness.toFixed(2)}</div>
                <div className="p-2 bg-muted rounded">EVI: {indices.evi.toFixed(2)}</div>
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="mt-4 p-4 rounded-lg bg-accent space-y-2">
            <h4 className="font-semibold text-sm text-primary flex items-center gap-2">
              {STRESS_ICONS[result.healthStatus] ?? <AlertTriangle className="w-5 h-5" />}
              {result.healthStatus.replace('_', ' ')} — vigor {result.vigorScore}/100
            </h4>
            <p className="text-sm">Confidence: {result.confidence}%</p>
            {result.cropType && <p className="text-sm"><strong>Target:</strong> {result.cropType}</p>}
            {result.growthStage && <p className="text-sm"><strong>Growth stage:</strong> {result.growthStage}</p>}
            {result.diagnosis && (
              <div className="text-xs">
                Water: {result.diagnosis.waterStress} · Nutrients: {result.diagnosis.nutrientStatus} · Disease: {result.diagnosis.diseaseRisk} · Pest: {result.diagnosis.pestRisk} · Heat: {result.diagnosis.heatStress}
              </div>
            )}
            {result.visibleSymptoms?.length > 0 && (
              <ul className="text-xs list-disc list-inside">
                {result.visibleSymptoms.map((s: string, i: number) => <li key={i}>{s}</li>)}
              </ul>
            )}
            {result.recommendations?.length > 0 && (
              <div>
                <p className="text-sm font-semibold mt-2">Recommendations:</p>
                <ul className="text-sm list-disc list-inside">
                  {result.recommendations.map((r: string, i: number) => <li key={i}>{r}</li>)}
                </ul>
              </div>
            )}
            <Button onClick={handleDownloadPdf} variant="outline" className="w-full mt-3 gap-2">
              <Download className="w-4 h-4" /> Download PDF Report
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProduceEstimator;
