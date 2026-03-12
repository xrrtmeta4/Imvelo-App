import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FlaskConical, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const CROPS = ['Maize', 'Beans', 'Sorghum', 'Sweet Potato', 'Groundnuts', 'Tomatoes', 'Cabbage', 'Onions', 'Sugarcane', 'Cotton'];
const SOIL_TYPES = ['Clay', 'Sandy', 'Loam', 'Silt', 'Clay Loam', 'Sandy Loam'];
const GROWTH_STAGES = ['Pre-planting', 'Seedling', 'Vegetative', 'Flowering', 'Fruiting', 'Maturity'];

const FertilizerCalculator = () => {
  const navigate = useNavigate();
  const [crop, setCrop] = useState('');
  const [soilType, setSoilType] = useState('');
  const [fieldSize, setFieldSize] = useState('');
  const [growthStage, setGrowthStage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleCalculate = async () => {
    if (!crop || !soilType || !fieldSize) { toast.error('Please fill all required fields'); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: `As an agricultural fertilizer expert, provide detailed NPK fertilizer recommendations for:
          - Crop: ${crop}
          - Soil Type: ${soilType}
          - Field Size: ${fieldSize} hectares
          - Growth Stage: ${growthStage || 'General'}
          
          Please provide:
          1. Recommended NPK ratio
          2. Application rate per hectare
          3. Total amount needed for the field
          4. Application method and timing
          5. Organic alternatives if available
          6. Important precautions
          
          Format with clear headings and be specific with quantities in kg.`,
          language: 'en'
        }
      });
      if (error) throw error;
      setResult(data.response || data.message);
    } catch (err) {
      toast.error('Failed to calculate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-gradient-to-br from-purple-700 to-purple-600 text-white py-6 px-4">
        <div className="max-w-screen-sm mx-auto">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-white/80 mb-3 text-sm"><ArrowLeft className="w-4 h-4" /> Back</button>
          <h1 className="text-2xl font-bold">🧪 Fertilizer Calculator</h1>
          <p className="text-white/80 text-sm">AI-powered NPK recommendations</p>
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-4 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div><Label>Crop *</Label>
              <Select value={crop} onValueChange={setCrop}>
                <SelectTrigger><SelectValue placeholder="Select crop" /></SelectTrigger>
                <SelectContent>{CROPS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Soil Type *</Label>
              <Select value={soilType} onValueChange={setSoilType}>
                <SelectTrigger><SelectValue placeholder="Select soil type" /></SelectTrigger>
                <SelectContent>{SOIL_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Field Size (hectares) *</Label>
              <Input type="number" value={fieldSize} onChange={e => setFieldSize(e.target.value)} placeholder="e.g. 2.5" />
            </div>
            <div><Label>Growth Stage</Label>
              <Select value={growthStage} onValueChange={setGrowthStage}>
                <SelectTrigger><SelectValue placeholder="Select stage (optional)" /></SelectTrigger>
                <SelectContent>{GROWTH_STAGES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button onClick={handleCalculate} className="w-full gap-2" disabled={loading || !crop || !soilType || !fieldSize}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
              {loading ? 'Calculating...' : 'Get Recommendations'}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className="border-purple-200 dark:border-purple-800">
            <CardContent className="p-4">
              <h3 className="font-bold text-foreground mb-2 flex items-center gap-2"><FlaskConical className="w-4 h-4 text-purple-600" /> Recommendations</h3>
              <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{result}</div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default FertilizerCalculator;
