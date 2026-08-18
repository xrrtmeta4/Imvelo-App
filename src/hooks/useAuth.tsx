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
    let getSessionDone = false;
    let active = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!active) return;

        if (!session) {
          if (event === 'SIGNED_OUT' && getSessionDone) {
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

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!active) return;
      getSessionDone = true;
      initialized = true;
      if (session) {
        setSession(session);
        setUser(session.user ?? null);
      }
      setLoading(false);
    }).catch((err) => {
      console.error('Failed to get session:', err);
      if (!active) return;
      getSessionDone = true;
      initialized = true;
      setLoading(false);
    });

    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (!active || !session) return;
        setSession(session);
        setUser(session.user ?? null);
        setLoading(false);
      }).catch((err) => {
        console.error('Failed to refresh session on visibility change:', err);
      });
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
