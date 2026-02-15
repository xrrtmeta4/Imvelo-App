import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Sprout, Loader2, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { Separator } from '@/components/ui/separator';

const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(8, 'Phone number is required').regex(/^[+]?[0-9\s-]+$/, 'Invalid phone number format'),
  country: z.string().min(2, 'Country is required'),
});

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    country: '',
    role: 'farmer' as 'farmer' | 'trader' | 'extension_officer',
  });

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

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });

      if (error) {
        console.error('Google OAuth error:', error);
        toast.error(error.message || 'Failed to sign in with Google');
        return;
      }
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      toast.error('Failed to sign in with Google. Please try email login.');
    } finally {
      setLoading(false);
    }
  };

  // Check for reset mode from URL
  useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'reset') {
      setMode('reset');
    }
  });

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Sign In';
      case 'signup': return 'Create Account';
      case 'forgot': return 'Reset Password';
      case 'reset': return 'Set New Password';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'login': return 'Sign in with your account';
      case 'signup': return 'Register for Imvelo';
      case 'forgot': return 'Enter your email to receive a reset link';
      case 'reset': return 'Enter your new password';
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary to-primary/80 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-primary p-3 rounded-full">
              <Sprout className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Imvelo</CardTitle>
          <CardDescription>{getDescription()}</CardDescription>
        </CardHeader>
        <CardContent>
          {(mode === 'forgot' || mode === 'reset') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMode('login')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
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
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+268 7921 5621"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    disabled={loading}
                  />
                   <p className="text-xs text-muted-foreground">For SMS weather alerts and farming tips</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
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
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value: any) => setFormData({ ...formData, role: value })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="farmer">Farmer</SelectItem>
                      <SelectItem value="trader">Trader</SelectItem>
                      <SelectItem value="extension_officer">Extension Officer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {mode !== 'reset' && (
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
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
                <Label htmlFor="password">{mode === 'reset' ? 'New Password' : 'Password'}</Label>
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
                <Label htmlFor="confirmPassword">Confirm Password</Label>
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
                  Please wait...
                </>
              ) : (
                <>{getTitle()}</>
              )}
            </Button>
          </form>

          {(mode === 'login' || mode === 'signup') && (
            <>
              <div className="relative my-4">
                <Separator />
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  or
                </span>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
            </>
          )}

          {mode === 'login' && (
            <div className="mt-4 text-center space-y-2">
              <Button variant="link" onClick={() => setMode('forgot')} disabled={loading} className="text-sm">
                Forgot Password?
              </Button>
              <div>
                <Button variant="link" onClick={() => setMode('signup')} disabled={loading}>
                  Don't have an account? Sign Up
                </Button>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div className="mt-4 text-center">
              <Button variant="link" onClick={() => setMode('login')} disabled={loading}>
                Already have an account? Sign In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
        <Link to="/about" className="text-primary-foreground/80 hover:text-primary-foreground underline">About Us</Link>
        <Link to="/contact" className="text-primary-foreground/80 hover:text-primary-foreground underline">Contact</Link>
        <Link to="/privacy-policy" className="text-primary-foreground/80 hover:text-primary-foreground underline">Privacy Policy</Link>
        <Link to="/terms-of-service" className="text-primary-foreground/80 hover:text-primary-foreground underline">Terms of Service</Link>
      </div>
    </div>
  );
};

export default Auth;
