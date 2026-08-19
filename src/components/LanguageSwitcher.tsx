import { useLanguage } from '@/hooks/useLanguage';
import { Globe } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'sw', label: 'Kiswahili', flag: '🇹🇿' },
  { code: 'ss', label: 'siSwati', flag: '🇸🇿' },
  { code: 'zu', label: 'isiZulu', flag: '🇿🇦' },
  { code: 'xh', label: 'isiXhosa', flag: '🇿🇦' },
  { code: 'yo', label: 'Yorùbá', flag: '🇳🇬' },
  { code: 'ha', label: 'Hausa', flag: '🇳🇬' },
  { code: 'am', label: 'አማርኛ', flag: '🇪🇹' },
  { code: 'ig', label: 'Igbo', flag: '🇳🇬' },
  { code: 'sn', label: 'Shona', flag: '🇿🇼' },
  { code: 'st', label: 'Sesotho', flag: '🇱🇸' },
  { code: 'tn', label: 'Setswana', flag: '🇧🇼' },
  { code: 'lg', label: 'Luganda', flag: '🇺🇬' },
  { code: 'rw', label: 'Kinyarwanda', flag: '🇷🇼' },
  { code: 'ti', label: 'ትግርኛ', flag: '🇪🇷' },
  { code: 'wo', label: 'Wolof', flag: '🇸🇳' },
  { code: 'ln', label: 'Lingala', flag: '🇨🇩' },
  { code: 'so', label: 'Soomaali', flag: '🇸🇴' },
  { code: 'nso', label: 'Sepedi', flag: '🇿🇦' },
  { code: 'tw', label: 'Twi', flag: '🇬🇭' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
];

const LanguageSwitcher = () => {
  const { lang, setLang } = useLanguage();
  const { user } = useAuth();

  const handleChange = async (value: string) => {
    setLang(value);
    // Persist to profile
    if (user) {
      await supabase
        .from('profiles')
        .update({ preferred_language: value })
        .eq('id', user.id);
    }
  };

  const current = LANGUAGES.find(l => l.code === lang);

  return (
    <Select value={lang} onValueChange={handleChange}>
      <SelectTrigger className="w-auto h-8 gap-1 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground text-xs px-2">
        <Globe className="w-3.5 h-3.5" />
        <SelectValue>
          {current?.flag} {current?.label}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {LANGUAGES.map(l => (
          <SelectItem key={l.code} value={l.code} className="text-sm">
            <span className="mr-2">{l.flag}</span>
            {l.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default LanguageSwitcher;
