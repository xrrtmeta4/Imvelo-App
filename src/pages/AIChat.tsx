import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useUsageLimits } from '@/hooks/useUsageLimits';
import { ArrowLeft, Send, Mic, MicOff, Sparkles, Trash2, Crown, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Msg { role: 'user' | 'assistant'; content: string; feedback?: 'up' | 'down' }

type State = 'idle' | 'listening' | 'thinking' | 'speaking';

function AuroraBlob({ state }: { state: State }) {
  const stateClasses: Record<State, string> = {
    idle: 'opacity-70 animate-[aurora_18s_ease-in-out_infinite]',
    listening: 'opacity-100 animate-[aurora_4s_ease-in-out_infinite] scale-110',
    thinking: 'opacity-95 animate-[aurora_2.4s_ease-in-out_infinite] scale-105',
    speaking: 'opacity-100 animate-[aurora_3s_ease-in-out_infinite] scale-110',
  };
  return (
    <div className="relative w-64 h-64 flex items-center justify-center pointer-events-none select-none">
      <div className={`absolute inset-0 rounded-full blur-3xl transition-all duration-700 ${stateClasses[state]}`}
        style={{
          background: 'conic-gradient(from 0deg, #60a5fa, #a78bfa, #f472b6, #34d399, #fbbf24, #60a5fa)'
        }}
      />
      <div className={`absolute inset-6 rounded-full blur-2xl mix-blend-screen transition-all duration-700 ${stateClasses[state]}`}
        style={{ background: 'conic-gradient(from 180deg, #f472b6, #60a5fa, #34d399, #a78bfa, #f472b6)', animationDirection: 'reverse' }}
      />
      <div className="relative w-32 h-32 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center">
        <Sparkles className="w-10 h-10 text-white drop-shadow-lg" />
      </div>
    </div>
  );
}

export default function AIChat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { canUseChat, incrementChat, getRemainingChats, openUpgrade, isPremium } = useUsageLimits();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [state, setState] = useState<State>('idle');
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [autoListen, setAutoListen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    const v = localStorage.getItem('imvelo.autoListen');
    return v === null ? true : v === '1';
  });
  const [preferredLanguage, setPreferredLanguage] = useState('en');
  const recRef = useRef<any>(null);
  const autoListenRef = useRef(autoListen);
  const stateRef = useRef<State>('idle');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { autoListenRef.current = autoListen; }, [autoListen]);
  useEffect(() => { stateRef.current = state; }, [state]);

  useEffect(() => {
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setVoiceSupported(false); return; }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (e: any) => {
      let text = '';
      for (let i = 0; i < e.results.length; i++) text += e.results[i][0].transcript;
      setInput(text);
    };
    rec.onend = () => {
      setListening(false);
      setState('idle');
      // If auto-listen is enabled and we're not busy speaking/thinking, resume listening
      if (autoListenRef.current && stateRef.current === 'idle') {
        setTimeout(() => {
          try {
            recRef.current?.start();
            setListening(true);
            setState('listening');
          } catch { /* already started */ }
        }, 400);
      }
    };
    rec.onerror = () => { setListening(false); setState('idle'); };
    recRef.current = rec;

    return () => {
      try { rec.stop(); } catch { /* ignore */ }
    };
  }, []);

  // Kick off auto-listening on mount when enabled
  useEffect(() => {
    if (!voiceSupported || !autoListen) return;
    const t = setTimeout(() => {
      try {
        recRef.current?.start();
        setListening(true);
        setState('listening');
      } catch { /* ignore */ }
    }, 600);
    return () => clearTimeout(t);
    // Only on mount + when toggled on
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoListen, voiceSupported]);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase.from('profiles').select('preferred_language').eq('id', user.id).single();
      if (data?.preferred_language) setPreferredLanguage(data.preferred_language);
    })();
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, state]);

  const speak = (text: string) => {
    try {
      if (!('speechSynthesis' in window)) return;
      // Pause listening while speaking to avoid feedback loop
      try { recRef.current?.stop(); } catch { /* ignore */ }
      const u = new SpeechSynthesisUtterance(text.replace(/\*+/g, '').slice(0, 500));
      u.rate = 1;
      u.onstart = () => setState('speaking');
      u.onend = () => {
        setState('idle');
        if (autoListenRef.current) {
          setTimeout(() => {
            try {
              recRef.current?.start();
              setListening(true);
              setState('listening');
            } catch { /* ignore */ }
          }, 300);
        }
      };
      window.speechSynthesis.speak(u);
    } catch { /* ignore */ }
  };

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;
    if (!canUseChat()) {
      toast.error('Daily chat limit reached. Upgrade for unlimited conversations!');
      return;
    }
    const userMsg: Msg = { role: 'user', content };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput('');
    setState('thinking');
    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          messages: newMsgs.map(m => ({ role: m.role, content: m.content })),
          preferredLanguage,
          countAsChat: true,
        },
      });
      if (error) {
        const detail = await error?.context?.text?.().catch(() => '') ?? '';
        if (/limit|429/i.test(detail) || error.message?.includes('429')) {
          toast.error("You've used all your free Chloe chats for today. Upgrade for unlimited.");
          setState('idle');
          return;
        }
        throw error;
      }
      const reply: Msg = { role: 'assistant', content: data.response };
      setMessages(prev => [...prev, reply]);
      incrementChat();
      speak(reply.content);
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to get response');
      setState('idle');
    }
  };

  const toggleMic = () => {
    if (!voiceSupported) { toast.error('Voice not supported here'); return; }
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      setState('idle');
    } else {
      setInput('');
      try {
        recRef.current?.start();
        setListening(true);
        setState('listening');
      } catch { /* already */ }
    }
  };

  const remaining = getRemainingChats();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white flex flex-col pb-20">
      <style>{`
        @keyframes aurora {
          0%,100% { transform: rotate(0deg) scale(1); border-radius: 42% 58% 62% 38% / 45% 44% 56% 55%; }
          33% { transform: rotate(120deg) scale(1.08); border-radius: 58% 42% 38% 62% / 62% 55% 45% 38%; }
          66% { transform: rotate(240deg) scale(0.95); border-radius: 50% 50% 33% 67% / 55% 42% 58% 45%; }
        }
      `}</style>

      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 backdrop-blur-md sticky top-0 z-10 bg-black/30">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-white hover:bg-white/10">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="text-center">
          <h1 className="text-sm font-semibold flex items-center gap-1.5 justify-center">
            <Sparkles className="w-4 h-4 text-primary" /> Imvelo AI
          </h1>
          {!isPremium && <p className="text-[10px] text-white/50">{remaining} messages left today</p>}
        </div>
        <Button
          variant="ghost" size="icon"
          onClick={() => { setMessages([]); toast.success('Cleared'); }}
          className="text-white hover:bg-white/10"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </header>

      {voiceSupported && (
        <div className="flex items-center justify-center gap-2 px-4 py-2 text-[11px] text-white/70 border-b border-white/5">
          <span>Auto-listen</span>
          <button
            type="button"
            onClick={() => {
              const next = !autoListen;
              setAutoListen(next);
              localStorage.setItem('imvelo.autoListen', next ? '1' : '0');
              if (!next) {
                try { recRef.current?.stop(); } catch { /* ignore */ }
                setListening(false);
                setState('idle');
                toast.success('Voice input off');
              } else {
                toast.success('Voice input on');
              }
            }}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${autoListen ? 'bg-primary' : 'bg-white/20'}`}
            aria-pressed={autoListen}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${autoListen ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-white/40">{autoListen ? 'always hearing you' : 'tap mic to talk'}</span>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 sm:py-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[45vh] sm:min-h-[60vh] gap-3 sm:gap-6">
            <div className="scale-75 sm:scale-100"><AuroraBlob state={state} /></div>
            <div className="text-center max-w-sm px-2">
              <h2 className="text-xl sm:text-2xl font-semibold mb-1 sm:mb-2">Ask me anything</h2>
              <p className="text-xs sm:text-sm text-white/60">Farming, weather, pests, prices — text or voice.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {['When should I plant maize?', 'How to treat aphids?', 'Best irrigation for beans?', 'Prices this week?'].map(s => (
                <button key={s} onClick={() => send(s)} className="text-xs text-left p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                {m.role === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full mr-2 bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                )}
                <div className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3.5 sm:px-4 py-2.5 text-[13px] sm:text-sm leading-relaxed whitespace-pre-line break-words ${
                  m.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-white/10 backdrop-blur border border-white/10 rounded-tl-sm text-white'
                }`}>
                  {m.content.replace(/\*+/g, '').trim()}
                </div>
              </div>
            ))}
            {state === 'thinking' && (
              <div className="flex justify-start items-center gap-2 animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 via-purple-500 to-pink-500 animate-pulse" />
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 rounded-full bg-white/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {messages.length > 0 && (
        <div className="hidden sm:flex justify-center pb-2">
          <div className="scale-50 -my-8"><AuroraBlob state={state} /></div>
        </div>
      )}

      <div className="px-3 sm:px-4 pt-2 sticky bottom-16 bg-gradient-to-t from-black via-black/95 to-transparent" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
        {!canUseChat() ? (
          <div className="text-center py-3">
            <Button onClick={openUpgrade} className="gap-2">
              <Crown className="w-4 h-4" /> Upgrade for Unlimited
            </Button>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto flex gap-2 items-end">
            <Button
              type="button"
              onClick={toggleMic}
              size="icon"
              className={`rounded-full h-11 w-11 flex-shrink-0 ${listening ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'}`}
            >
              {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder={listening ? 'Listening…' : 'Message Imvelo AI'}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-full h-11"
            />
            <Button
              onClick={() => send()}
              size="icon"
              disabled={!input.trim() || state === 'thinking'}
              className="rounded-full h-11 w-11 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}