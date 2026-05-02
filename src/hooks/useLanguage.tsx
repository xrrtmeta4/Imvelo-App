import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { translations } from '@/lib/translations';

interface LanguageContextType {
  lang: string;
  t: (key: string) => string;
  setLang: (lang: string) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'en',
  t: (key) => key,
  setLang: () => {},
});

const CACHE_KEY = (lang: string) => `imvelo_translations_cache_${lang}`;
const PENDING: Record<string, Set<string>> = {};
const TIMERS: Record<string, number> = {};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState(() => localStorage.getItem('imvelo_lang') || 'en');
  const [cache, setCache] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem(CACHE_KEY(localStorage.getItem('imvelo_lang') || 'en'));
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('preferred_language')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.preferred_language) {
          setLangState(data.preferred_language);
          localStorage.setItem('imvelo_lang', data.preferred_language);
        }
      });
  }, [user]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CACHE_KEY(lang));
      setCache(stored ? JSON.parse(stored) : {});
    } catch { setCache({}); }
  }, [lang]);

  const setLang = (newLang: string) => {
    setLangState(newLang);
    localStorage.setItem('imvelo_lang', newLang);
  };

  const flushPending = async (targetLang: string) => {
    const set = PENDING[targetLang];
    if (!set || set.size === 0) return;
    const texts = Array.from(set);
    PENDING[targetLang] = new Set();
    try {
      const { data } = await supabase.functions.invoke('auto-translate', {
        body: { texts, targetLang },
      });
      if (data?.translations) {
        const existing = JSON.parse(localStorage.getItem(CACHE_KEY(targetLang)) || '{}');
        const updated = { ...existing, ...data.translations };
        localStorage.setItem(CACHE_KEY(targetLang), JSON.stringify(updated));
        if (targetLang === lang) setCache(updated);
      }
    } catch (e) {
      console.warn('auto-translate failed', e);
    }
  };

  const queueTranslate = (key: string) => {
    if (lang === 'en') return;
    if (!PENDING[lang]) PENDING[lang] = new Set();
    PENDING[lang].add(key);
    if (TIMERS[lang]) clearTimeout(TIMERS[lang]);
    TIMERS[lang] = setTimeout(() => flushPending(lang), 800) as unknown as number;
  };

  const t = (key: string): string => {
    const fromDict = translations[lang]?.[key];
    if (fromDict) return fromDict;
    const fromCache = cache[key];
    if (fromCache) return fromCache;
    const englishValue = translations['en']?.[key] || key;
    if (lang !== 'en') queueTranslate(englishValue);
    return englishValue;
  };

  return (
    <LanguageContext.Provider value={{ lang, t, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
