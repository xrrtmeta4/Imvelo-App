import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, MicOff, X } from 'lucide-react';
import { toast } from 'sonner';

// Voice command map: phrases → route
const commands: Array<{ keywords: string[]; route: string; label: string }> = [
  { keywords: ['home', 'main', 'dashboard'], route: '/', label: 'Home' },
  { keywords: ['scan', 'scanner', 'pest', 'disease', 'identify'], route: '/scanner', label: 'Scanner' },
  { keywords: ['weather', 'forecast', 'rain'], route: '/weather', label: 'Weather' },
  { keywords: ['climate', 'risk', 'volatility'], route: '/climate-risk', label: 'Climate Risk' },
  { keywords: ['irrigation', 'watering', 'water'], route: '/smart-irrigation', label: 'Smart Irrigation' },
  { keywords: ['ledger', 'finance', 'money', 'expense'], route: '/ledger', label: 'Ledger' },
  { keywords: ['activity', 'activities', 'log'], route: '/farm-activities', label: 'Activities' },
  { keywords: ['crop monitoring', 'monitor crop', 'crop health'], route: '/crop-monitoring', label: 'Crop Monitoring' },
  { keywords: ['crop rotation', 'rotation'], route: '/crop-rotation', label: 'Crop Rotation' },
  { keywords: ['planting', 'plant guide'], route: '/planting-guide', label: 'Planting Guide' },
  { keywords: ['soil'], route: '/soil-management', label: 'Soil' },
  { keywords: ['pesticide', 'spray', 'calendar'], route: '/pesticide-calendar', label: 'Pesticide Calendar' },
  { keywords: ['fertilizer', 'fertiliser'], route: '/fertilizer', label: 'Fertilizer' },
  { keywords: ['harvest'], route: '/harvest-tracker', label: 'Harvest' },
  { keywords: ['price', 'market', 'alerts'], route: '/price-alerts', label: 'Prices' },
  { keywords: ['african markets', 'markets'], route: '/african-markets', label: 'African Markets' },
  { keywords: ['inventory'], route: '/inventory', label: 'Inventory' },
  { keywords: ['livestock', 'animal'], route: '/livestock', label: 'Livestock' },
  { keywords: ['carbon'], route: '/carbon-score', label: 'Carbon Score' },
  { keywords: ['post harvest'], route: '/post-harvest', label: 'Post-Harvest' },
  { keywords: ['extension', 'officer', 'contact'], route: '/extension-directory', label: 'Extension' },
  { keywords: ['knowledge', 'graph'], route: '/knowledge-graph', label: 'Knowledge Graph' },
  { keywords: ['profile', 'account'], route: '/profile', label: 'Profile' },
  { keywords: ['settings'], route: '/settings', label: 'Settings' },
  { keywords: ['chat', 'assistant', 'talk', 'ask'], route: '/ai-chat', label: 'AI Chat' },
  { keywords: ['upgrade', 'premium', 'subscribe'], route: '/upgrade', label: 'Upgrade' },
];

function matchCommand(transcript: string): { route: string; label: string } | null {
  const t = transcript.toLowerCase().trim();
  // Prefer longer keyword matches first
  const sorted = [...commands].sort((a, b) =>
    Math.max(...b.keywords.map(k => k.length)) - Math.max(...a.keywords.map(k => k.length))
  );
  for (const c of sorted) {
    if (c.keywords.some(k => t.includes(k))) return { route: c.route, label: c.label };
  }
  return null;
}

export default function VoiceNav() {
  const navigate = useNavigate();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(true);
  const recRef = useRef<any>(null);

  useEffect(() => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (e: any) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setTranscript(text);
    };
    rec.onend = () => {
      setListening(false);
      setTranscript((prev) => {
        if (!prev) return prev;
        const match = matchCommand(prev);
        if (match) {
          toast.success(`Opening ${match.label}`);
          navigate(match.route);
        } else {
          toast.error(`Sorry, I didn't catch a page. Try "open weather" or "scan pest".`);
        }
        return '';
      });
    };
    rec.onerror = () => setListening(false);
    recRef.current = rec;
  }, [navigate]);

  const toggle = useCallback(() => {
    if (!supported) {
      toast.error('Voice not supported on this browser');
      return;
    }
    if (listening) {
      recRef.current?.stop();
      setListening(false);
    } else {
      setTranscript('');
      try {
        recRef.current?.start();
        setListening(true);
      } catch { /* already started */ }
    }
  }, [listening, supported]);

  if (!supported) return null;

  return (
    <>
      {listening && (
        <div className="fixed inset-x-0 bottom-40 z-40 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto max-w-sm w-full rounded-2xl bg-card/95 backdrop-blur border border-border shadow-2xl p-4 animate-scale-in">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
                <p className="text-xs font-semibold">Listening…</p>
              </div>
              <button onClick={toggle} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-foreground min-h-[1.5rem]">{transcript || <span className="text-muted-foreground italic">Say "open weather", "scan pest", "chat"…</span>}</p>
          </div>
        </div>
      )}
      <button
        onClick={toggle}
        aria-label="Voice navigation"
        className={`fixed bottom-24 left-4 z-40 rounded-full w-12 h-12 shadow-lg flex items-center justify-center transition-all ${
          listening ? 'bg-red-500 text-white scale-110' : 'bg-primary text-primary-foreground hover:scale-105'
        }`}
      >
        {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
      </button>
    </>
  );
}