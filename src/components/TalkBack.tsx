import { useEffect, useRef } from 'react';
import { useSettings } from '@/hooks/useSettings';

/**
 * TalkBack: lightweight screen reader for visually impaired users.
 * Announces focused / tapped / hovered interactive elements aloud.
 */
const getLabel = (el: Element | null): string => {
  if (!el) return '';
  const node = el as HTMLElement;
  const aria = node.getAttribute?.('aria-label');
  if (aria) return aria;
  const alt = node.getAttribute?.('alt');
  if (alt) return alt;
  const title = node.getAttribute?.('title');
  if (title) return title;
  const text = (node.innerText || node.textContent || '').trim();
  if (text) return text.slice(0, 220);
  const placeholder = node.getAttribute?.('placeholder');
  return placeholder || '';
};

const speak = (text: string) => {
  if (!text || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1;
  utter.pitch = 1;
  utter.lang = document.documentElement.lang || 'en-US';
  window.speechSynthesis.speak(utter);
};

const TalkBack = () => {
  const { talkBack } = useSettings();
  const lastRef = useRef<string>('');

  useEffect(() => {
    if (!talkBack) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      return;
    }

    const announce = (target: EventTarget | null) => {
      const el = (target as HTMLElement)?.closest?.(
        'button, a, [role="button"], input, select, textarea, h1, h2, h3, [data-talkback]'
      );
      const label = getLabel(el);
      if (!label || label === lastRef.current) return;
      lastRef.current = label;
      speak(label);
    };

    const onFocus = (e: FocusEvent) => announce(e.target);
    const onClick = (e: MouseEvent) => announce(e.target);

    document.addEventListener('focusin', onFocus);
    document.addEventListener('click', onClick, true);
    speak('Talk back is on. Tap any item to hear it read aloud.');

    return () => {
      document.removeEventListener('focusin', onFocus);
      document.removeEventListener('click', onClick, true);
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, [talkBack]);

  return null;
};

export default TalkBack;