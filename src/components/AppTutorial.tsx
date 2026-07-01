import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { X, ChevronRight, ChevronLeft, Sparkles, Camera, Cloud, CloudLightning, Droplets, MessageCircle, Mic, Store } from 'lucide-react';

const STORAGE_PREFIX = 'imvelo_tutorial_seen_';

const steps = [
  { icon: Sparkles, title: 'Welcome to Imvelo', body: "Your AI-powered farming companion. Let's take a quick tour of what you can do." },
  { icon: Camera, title: 'Pest & Disease Scanner', body: 'Snap a photo of any leaf or pest — Quantum AI identifies it in seconds with treatment guidance.' },
  { icon: Cloud, title: 'Hyper-local Weather', body: 'GPS-accurate forecasts, alerts and a daily briefing tailored for your farm.' },
  { icon: CloudLightning, title: 'Climate Volatility Engine', body: 'See 2-week, 3-month, 6-month and 1-year outlooks with yield projections and adaptive actions.' },
  { icon: Droplets, title: 'Smart Irrigation', body: 'Data-driven watering schedules based on rainfall, ET₀ and your soil type.' },
  { icon: Mic, title: 'Voice Navigation', body: 'Tap the mic (bottom-left) and say things like "open weather" or "scan pest" to move hands-free.' },
  { icon: MessageCircle, title: 'AI Chat Assistant', body: 'Ask anything about farming — text or voice — with a stunning conversational interface.' },
  { icon: Store, title: 'Marketplace & More', body: 'Sell produce, track finances, view market prices, and connect with extension officers. You are ready to farm smarter!' },
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
  const Icon = S.icon;
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

        <div className="relative h-40 bg-gradient-to-br from-primary via-primary/80 to-primary/40 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_30%_50%,white,transparent_60%)]" />
          <div className="relative rounded-2xl bg-white/15 backdrop-blur-md p-5 border border-white/20">
            <Icon className="w-12 h-12 text-white" />
          </div>
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
              <Button onClick={finish} size="sm" className="gap-1">
                Get started <Sparkles className="w-4 h-4" />
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