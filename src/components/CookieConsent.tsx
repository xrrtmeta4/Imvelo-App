import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Cookie, Shield, BarChart2, HelpCircle } from 'lucide-react';

const STORAGE_KEY = 'imvelo_cookie_consent';

type Consent = {
  necessary: true; // always on
  analytics: boolean;
  marketing: boolean;
  timestamp: number;
};

const defaultConsent: Consent = {
  necessary: true,
  analytics: false,
  marketing: false,
  timestamp: 0,
};

const readConsent = (): Consent | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Consent>;
    return { ...defaultConsent, ...parsed, timestamp: parsed.timestamp ?? 0 };
  } catch {
    return null;
  }
};

const writeConsent = (c: Consent) => {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  }
};

export const CookieConsent = () => {
  const [visible, setVisible] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [consent, setConsent] = useState<Consent>(defaultConsent);

  useEffect(() => {
    if (readConsent()) {
      setVisible(false);
      return;
    }
    // Show on next idle tick so it doesn't block first paint
    const id = window.setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(id);
  }, []);

  const acceptAll = useCallback(() => {
    const c: Consent = { necessary: true, analytics: true, marketing: true, timestamp: Date.now() };
    writeConsent(c);
    setConsent(c);
    setVisible(false);
  }, []);

  const save = useCallback(() => {
    const c: Consent = { ...consent, timestamp: Date.now() };
    writeConsent(c);
    setVisible(false);
  }, [consent]);

  const rejectNonEssential = useCallback(() => {
    const c: Consent = { necessary: true, analytics: false, marketing: false, timestamp: Date.now() };
    writeConsent(c);
    setConsent(c);
    setVisible(false);
  }, []);

  const toggle = useCallback((key: 'analytics' | 'marketing') => {
    setConsent((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-labelledby="cookie-consent-title"
      className="fixed z-[100] inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-none"
    >
      <div className="w-full sm:max-w-lg bg-popover border border-border shadow-2xl sm:rounded-xl sm:pointer-events-auto pointer-events-auto">
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <Cookie className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" aria-hidden />
            <div className="flex-1">
              <h2 id="cookie-consent-title" className="font-semibold text-base">We use cookies</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Imvelo only uses essential cookies to keep the app running (session/auth). We never sell your data.
                Select your preferences below.
              </p>
            </div>
          </div>

          {showManage && (
            <div className="mt-4 space-y-3" aria-label="Cookie preferences">
              <div className="flex items-center justify-between p-2 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-green-600" aria-hidden />
                  <span className="text-sm">Necessary cookies</span>
                </div>
                <span className="text-xs font-medium text-green-700">Always active</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg border">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-600" aria-hidden />
                  <span className="text-sm">Analytics cookies</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={consent.analytics}
                  tabIndex={0}
                  onClick={() => toggle('analytics')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle('analytics'); } }}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    consent.analytics ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span className="sr-only">Toggle analytics</span>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    consent.analytics ? 'translate-x-5' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg border">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-purple-600" aria-hidden />
                  <span className="text-sm">Marketing cookies</span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={consent.marketing}
                  tabIndex={0}
                  onClick={() => toggle('marketing')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle('marketing'); } }}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    consent.marketing ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span className="sr-only">Toggle marketing</span>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                    consent.marketing ? 'translate-x-5' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            </div>
          )}

          <div className="mt-4 flex flex-col sm:flex-row gap-2">
            {showManage ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setShowManage(false)} className="flex-1">
                  Cancel
                </Button>
                <Button size="sm" onClick={save} className="flex-1">
                  Save preferences
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={rejectNonEssential} className="flex-1">
                  Decline non-essential
                </Button>
                <Button size="sm" onClick={acceptAll} className="flex-1">
                  Accept all
                </Button>
              </>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <a
              href="/privacy-policy"
              onClick={() => setVisible(false)}
              className="underline hover:text-foreground"
            >
              Cookie Policy
            </a>
            <button
              type="button"
              onClick={() => setShowManage((v) => !v)}
              className="underline hover:text-foreground"
            >
              {showManage ? '← Back' : 'Manage preferences'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;

export const getCookieConsent = (): Consent | null => readConsent();
