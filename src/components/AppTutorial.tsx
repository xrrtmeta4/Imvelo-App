import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { ChevronRight, ChevronLeft } from 'lucide-react';

const STORAGE_PREFIX = 'imvelo_tutorial_seen_';

const steps = [
  { image: '/tour/field.jpg', alt: 'Farmers ploughing a green field below misty mountains', title: 'Welcome to Imvelo', body: "Your AI-powered farming companion. Let's take a quick tour of what you can do." },
  { image: '/tour/soil.jpg', alt: 'Farmer holding rich dark compost soil above a garden bed', title: 'Soil & Pest Scanning', body: 'Snap a photo of soil, a leaf or a pest — Chloe identifies it in seconds with treatment guidance.' },
  { image: '/tour/irrigation.jpg', alt: 'Farmer watering leafy green vegetables in raised beds', title: 'Weather & Smart Irrigation', body: 'Hyper-local forecasts plus data-driven watering schedules based on rainfall, ET₀ and your soil type.' },
  { image: '/tour/market.jpg', alt: 'Vendor seated among baskets of fresh produce at a market', title: 'Markets & Records', body: 'Track finances, view live market prices and connect with extension officers. You are ready to farm smarter!' },
];

export default function AppTutorial() {
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (loading || !user) return;
    const key = STORAGE_PREFIX + user.id;
    if (!localStorage.getItem(key)) {
      const t = setTimeout(() => setOpen(true), 800);
      return () => clearTimeout(t);
    }
  }, [user, loading]);

  const finish = () => {
    if (user) localStorage.setItem(STORAGE_PREFIX + user.id, '1');
    setOpen(false);
    setStep(0);
  };

  if (!open) return null;
  const S = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl bg-card border border-border shadow-2xl overflow-hidden animate-scale-in">
        <button
          onClick={finish}
          className="absolute top-3 right-3 z-10 rounded-full px-3 py-1.5 text-xs font-medium bg-muted hover:bg-accent text-muted-foreground transition-colors"
        >
          Skip
        </button>

        <div className="relative h-44 overflow-hidden bg-muted">
          <img
            src={S.image}
            alt={S.alt}
            loading="eager"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
        </div>

        <div className="p-6 space-y-4">
          <div>
            <p className="text-xs font-medium text-primary uppercase tracking-wider">Step {step + 1} of {steps.length}</p>
            <h2 className="text-2xl font-bold text-foreground mt-1">{S.title}</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{S.body}</p>

          <div className="flex gap-1.5 pt-2">
            {steps.map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
            {isLast ? (
              <Button onClick={finish} size="sm">
                Get started
              </Button>
            ) : (
              <Button onClick={() => setStep((s) => s + 1)} size="sm" className="gap-1">
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}