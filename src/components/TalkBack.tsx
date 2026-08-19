import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type SpeechState = 'idle' | 'speaking' | 'paused';

const getSpeech = (): SpeechSynthesis | null =>
  typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

export const TalkBack = () => {
  const [state, setState] = useState<SpeechState>('idle');
  const [supported] = useState(() => getSpeech() !== null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const buildMessage = (): string => {
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 18) greeting = 'Good afternoon';
    else if (hour >= 18) greeting = 'Good evening';

    const parts = [
      `${greeting}, welcome to Imvelo, your modern farming assistant.`,
      'Tap the microphone button again to pause the talk-back.',
    ];

    const weatherText = document.querySelector('[data-talkback-weather]')?.textContent;
    if (weatherText) parts.unshift(`Weather update: ${weatherText}.`);

    return parts.join(' ');
  };

  const speak = (text: string) => {
    const synth = getSpeech();
    if (!synth) return;

    const utter = new SpeechSynthesisUtterance(text);
    const voices = () => speechSynthesis.getVoices();
    // Prefer a clear English voice (many African-language TTS engines are limited);
    // users can change browser defaults.
    const voice = voices().find((v) => v.lang.startsWith('en-')) || voices()[0];
    if (voice) utter.voice = voice;
    utter.rate = 1;
    utter.pitch = 1;
    utter.volume = 1;

    utter.onend = () => setState('idle');
    utter.onerror = (e) => {
      console.error('[TalkBack] speech error:', e);
      setState('idle');
    };

    utteranceRef.current = utter;
    setState('speaking');
    synth.speak(utter);
  };

  const stop = () => {
    const synth = getSpeech();
    if (synth) synth.cancel();
    setState('idle');
    utteranceRef.current = null;
  };

  const toggle = () => {
    const synth = getSpeech();
    if (!synth) return;

    if (state === 'speaking') {
      synth.pause();
      setState('paused');
    } else if (state === 'paused') {
      synth.resume();
      setState('speaking');
    } else {
      speak(buildMessage());
    }
  };

  useEffect(() => {
    // Keep voices list warm (some browsers populate async).
    const v = getSpeech();
    if (v) {
      const populate = () => speechSynthesis.getVoices();
      populate();
      const t = setTimeout(populate, 500);
      return () => clearTimeout(t);
    }
  }, []);

  if (!supported) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="text-white/70 hover:text-white"
        aria-label="Talk-back not supported in this browser"
        title="Talk-back is not supported in this browser"
      >
        <MicOff className="w-4 h-4" />
      </Button>
    );
  }

  const label =
    state === 'speaking' ? 'Pause talk-back' : state === 'paused' ? 'Resume talk-back' : 'Read the page aloud (talk-back)';

  return (
    <div className="flex items-center gap-1">
      {state === 'speaking' && <Pause className="w-3 h-3 text-white/60 animate-pulse" />}
      <Button
        variant="ghost"
        size="sm"
        className="text-white/80 hover:text-white hover:bg-white/10 focus:ring-2 focus:ring-white/30 focus:outline-none"
        aria-label={label}
        aria-pressed={state !== 'idle'}
        title={label}
        onClick={() => {
          if (state === 'idle') {
            toast.success('Talk-back started. Listen for the page summary.');
          }
          toggle();
        }}
      >
        {state === 'speaking' ? <Pause className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
      </Button>
      {state !== 'idle' && (
        <Button
          variant="ghost"
          size="sm"
          className="text-white/60 hover:text-white hover:bg-white/10"
          aria-label="Stop talk-back"
          title="Stop talk-back"
          onClick={stop}
        >
          <MicOff className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
};

export default TalkBack;
