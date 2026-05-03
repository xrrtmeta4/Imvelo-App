import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, TrendingUp, RefreshCw, Loader2, ChevronDown } from "lucide-react";
import { useLanguage } from "@/hooks/useLanguage";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLocation as useGeoLocation } from "@/hooks/useLocation";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Practice {
  title: string;
  description: string;
  path: string;
  category?: string;
}

const CACHE_KEY = "imvelo_best_practices_v2";
const CACHE_TTL_MS = 1000 * 60 * 60 * 6; // 6 hours

const BestPractices = () => {
  const { t, lang } = useLanguage();
  const { location } = useGeoLocation();
  const [practices, setPractices] = useState<Practice[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fallback: Practice[] = [
    { title: t('seasonalPlantingGuide'), description: t('learnBestTime'), path: '/planting-guide' },
    { title: t('soilManagement'), description: t('keepSoilHealthy'), path: '/soil-management' },
    { title: t('waterConservation'), description: t('tipsWaterManagement'), path: '/water-conservation' },
  ];

  const fetchPractices = async (force = false) => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!force && cached) {
        const parsed = JSON.parse(cached);
        if (parsed.lang === lang && Date.now() - parsed.ts < CACHE_TTL_MS) {
          setPractices(parsed.practices);
          return;
        }
      }
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('dynamic-best-practices', {
        body: { region: location?.country_name || 'Sub-Saharan Africa', language: lang },
      });
      if (error) throw error;
      if (data?.practices?.length) {
        setPractices(data.practices);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ practices: data.practices, ts: Date.now(), lang }));
      } else {
        setPractices(fallback);
      }
    } catch (e) {
      console.warn('best practices failed', e);
      setPractices(fallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPractices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer select-none">
            <CardTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" />
                {t('bestPractices')}
              </span>
              <ChevronDown className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`} />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3">
            {loading && practices.length === 0 && (
              <div className="flex items-center justify-center py-6 text-muted-foreground text-sm">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {t('loading')}
              </div>
            )}
            {practices.map((practice, idx) => (
              <div
                key={`${practice.path}-${idx}`}
                className="flex items-start gap-3 p-3 rounded-lg bg-accent/50 pointer-events-none select-text"
              >
                <TrendingUp className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">{practice.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">{practice.description}</p>
                </div>
              </div>
            ))}
            <button
              onClick={() => fetchPractices(true)}
              disabled={loading}
              className="w-full text-xs text-muted-foreground hover:text-primary flex items-center justify-center gap-1 pt-2"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              {loading ? t('loading') : t('refresh')}
            </button>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default BestPractices;
