import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Sprout, Loader2, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/hooks/useLanguage';
import SEO from '@/components/SEO';
import authBg from '@/assets/auth-field.jpg.asset.json';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(8, 'Phone number is required').regex(/^[+]?[0-9\s-]+$/, 'Invalid phone number format'),
  country: z.string().min(2, 'Country is required'),
});

const Auth = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    country: '',
    role: 'farmer' as 'farmer' | 'trader',
  });

  const handleOAuthSignIn = async (provider: 'google') => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error(`${provider} sign in error:`, error);
      const message = String(error?.message || '').toLowerCase();
      if (message.includes('unsupported provider') || message.includes('missing oauth secret') || message.includes('provider not configured')) {
        toast.error(`${provider.charAt(0).toUpperCase() + provider.slice(1)} OAuth is not configured in Supabase. Please add the provider credentials and try again.`);
      } else {
        toast.error(error.message || `${provider.charAt(0).toUpperCase() + provider.slice(1)} sign in failed`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Invalid email or password');
          } else {
            toast.error(error.message);
          }
          return;
        }

        if (data.user) {
          toast.success('Login successful!');
          navigate('/');
        }
      } else if (mode === 'signup') {
        const validation = signupSchema.safeParse({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          phone: formData.phone,
          country: formData.country,
        });

        if (!validation.success) {
          toast.error(validation.error.errors[0].message);
          return;
        }

        const redirectUrl = `${window.location.origin}/`;

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              full_name: formData.full_name,
              phone: formData.phone,
              country: formData.country,
              role: formData.role,
            },
          },
        });

        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Email already registered. Please login.');
          } else {
            toast.error(error.message);
          }
          return;
        }

        if (data.user) {
          toast.success('Registration successful! You can now login.');
          setMode('login');
        }
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
          redirectTo: `${window.location.origin}/auth?mode=reset`,
        });

        if (error) {
          toast.error(error.message);
          return;
        }

        toast.success('Password reset email sent! Check your inbox.');
        setMode('login');
      } else if (mode === 'reset') {
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match');
          return;
        }

        if (formData.password.length < 6) {
          toast.error('Password must be at least 6 characters');
          return;
        }

        const { error } = await supabase.auth.updateUser({
          password: formData.password,
        });

        if (error) {
          toast.error(error.message);
          return;
        }

        toast.success('Password updated successfully!');
        navigate('/');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'reset') {
      setMode('reset');
    }
  });

  const getTitle = () => {
    switch (mode) {
      case 'login': return t('signIn');
      case 'signup': return t('signUp');
      case 'forgot': return t('resetPassword');
      case 'reset': return t('setNewPassword');
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'login': return t('signInWith');
      case 'signup': return t('registerFor');
      case 'forgot': return t('enterEmailReset');
      case 'reset': return t('enterNewPassword');
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4">
      <img
        src={authBg.url}
        alt="Farmer inspecting a maize field at sunset"
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/80 to-background/95" />
      <div className="relative w-full flex flex-col items-center">
      <SEO
        title={`${getTitle()} - Imvelo`}
        description="Sign in or create an Imvelo account to access AI pest scanning, weather alerts, and farm management tools for African farmers."
        path="/auth"
      />
      <main className="w-full max-w-md flex flex-col items-center">
      <Card className="w-full max-w-md bg-card/95 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-4 rounded-full shadow-lg">
              <Sprout className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Imvelo App</h1>
          <h2 className={`mt-2 font-extrabold tracking-tight text-primary ${mode === 'signup' ? 'text-4xl sm:text-5xl' : 'text-xl'}`}>
            {getTitle()}
          </h2>
          <CardDescription className="mt-1">{getDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          {(mode === 'login' || mode === 'signup') && (
            <div className="space-y-3 mb-4">
              <Button
                type="button"
                variant="secondary"
                className="w-full gap-2 bg-white hover:bg-gray-50 border border-gray-200"
                onClick={() => handleOAuthSignIn('google')}
                disabled={loading}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.0 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span className="text-gray-700 font-medium">Sign in with Google</span>
              </Button>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="h-px flex-1 bg-border" />
                <span>or</span>
                <span className="h-px flex-1 bg-border" />
              </div>
            </div>
          )}
          {(mode === 'forgot' || mode === 'reset') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode('login')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('backToLogin')}
            </Button>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="full_name">{t('fullName')}</Label>
                  <Input
                    id="full_name"
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">{t('phone')} *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+268 7921 5621"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    disabled={loading}
                  />
                   <p className="text-xs text-muted-foreground">{t('phoneHint')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">{t('country')} *</Label>
                  <Input
                    id="country"
                    type="text"
                    placeholder="e.g. Eswatini"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">{t('role')}</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: any) => setFormData({ ...formData, role: value })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="farmer">{t('farmer')}</SelectItem>
                      <SelectItem value="trader">{t('trader')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {mode !== 'reset' && (
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
            )}

            {(mode === 'login' || mode === 'signup' || mode === 'reset') && (
              <div className="space-y-2">
                <Label htmlFor="password">{mode === 'reset' ? t('newPassword') : t('password')}</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>
            )}

            {mode === 'reset' && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('pleaseWait')}
                </>
              ) : (
                <>{getTitle()}</>
              )}
            </Button>
          </form>

          {mode === 'login' && (
            <div className="mt-4 text-center space-y-2">
              <Button variant="link" onClick={() => setMode('forgot')} disabled={loading} className="text-sm">
                {t('forgotPassword')}
              </Button>
              <div>
                <Button variant="link" onClick={() => setMode('signup')} disabled={loading}>
                  {t('dontHaveAccount')}
                </Button>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div className="mt-4 text-center">
              <Button variant="link" onClick={() => setMode('login')} disabled={loading}>
                {t('alreadyHaveAccount')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
        <Link to="/about" className="text-foreground font-medium hover:underline underline">{t('aboutUs')}</Link>
        <Link to="/contact" className="text-foreground font-medium hover:underline underline">{t('contact')}</Link>
        <Link to="/privacy-policy" className="text-foreground font-medium hover:underline underline">{t('privacyPolicy')}</Link>
        <Link to="/terms-of-service" className="text-foreground font-medium hover:underline underline">{t('termsOfService')}</Link>
      </div>
      </main>
      </div>
    </div>
  );
};

export default Auth;
