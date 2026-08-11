import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let initialized = false;
    let active = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return;

        // Only an explicit sign-out may clear the session. Any other null
        // session (transient boot value, failed refresh retry, background tab
        // wake-up) is ignored so the user is never bounced to /auth randomly.
        if (!session) {
          if (event === 'SIGNED_OUT') {
            initialized = true;
            setSession(null);
            setUser(null);
            setLoading(false);
          }
          return;
        }

        initialized = true;
        setSession(session);
        setUser(session.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      initialized = true;
      setSession((prev) => prev ?? session);
      setUser((prev) => prev ?? session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      initialized = true;
      setLoading(false);
    });

    // When the app returns from the background (mobile/PWA), re-hydrate the
    // session instead of letting a stale null state redirect to /auth.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!active || !session) return;
        setSession(session);
        setUser(session.user ?? null);
        setLoading(false);
      }).catch(() => undefined);
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisible);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
