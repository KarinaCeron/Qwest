import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayNameField, setDisplayNameField] = useState('');
  const [location, setLocation] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Qwest | Sign In';
    const metaDescName = 'description';
    let meta = document.querySelector(`meta[name="${metaDescName}"]`);
    const content = 'Sign in to Qwest: manage your job applications.';
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', metaDescName); document.head.appendChild(meta); }
    meta.setAttribute('content', content);
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: signupEmail, password: signupPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName, last_name: lastName,
            display_name: displayNameField || `${firstName} ${lastName}`.trim() || signupEmail,
            location, linkedin_url: linkedinUrl, portfolio_url: portfolioUrl, bio
          }
        }
      });
      if (error) {
        if (error.message.includes('User already registered')) {
          toast({ title: 'User already registered', description: 'This email is already registered. Try signing in.', variant: 'destructive' });
        } else {
          toast({ title: 'Sign up error', description: error.message, variant: 'destructive' });
        }
      } else {
        const userId = signUpData?.user?.id;
        if (userId) {
          const { error: profileError } = await supabase.from('profiles').upsert(
            [{ user_id: userId, display_name: displayNameField || `${firstName} ${lastName}`.trim() || signupEmail, first_name: firstName, last_name: lastName, location, linkedin_url: linkedinUrl, portfolio_url: portfolioUrl, bio }],
            { onConflict: 'user_id' }
          );
          if (profileError) console.error('Error creating profile:', profileError);
        }
        toast({ title: 'Registration successful', description: 'Your account has been created.' });
        setSignupEmail(''); setSignupPassword(''); setFirstName(''); setLastName('');
        setDisplayNameField(''); setLocation(''); setLinkedinUrl(''); setPortfolioUrl(''); setBio('');
        if (signUpData?.session) navigate('/');
      }
    } catch (error) {
      toast({ title: 'Error', description: 'An unexpected error occurred', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000));
      const authPromise = supabase.auth.signInWithPassword({ email, password });
      const { error } = await Promise.race([authPromise, timeoutPromise]) as any;
      if (error) {
        const msg = (error as any)?.message || '';
        if (msg.toLowerCase().includes('email not confirmed')) {
          setNeedsConfirmation(true);
          toast({ title: 'Confirm your email', description: 'You must confirm your account from the email sent to sign in.' });
        } else {
          toast({ title: 'Sign in error', description: msg || 'Invalid credentials', variant: 'destructive' });
        }
      } else {
        setNeedsConfirmation(false);
        toast({ title: 'Welcome', description: 'You have signed in successfully.' });
        navigate('/');
      }
    } catch (error) {
      const isTimeout = error instanceof Error && error.message === 'timeout';
      toast({
        title: isTimeout ? 'Slow connection' : 'Error',
        description: isTimeout ? 'Could not connect to the server. Try again or use the published version.' : 'An unexpected error occurred. Try again.',
        variant: 'destructive'
      });
    } finally { setLoading(false); }
  };

  const handleResendConfirmation = async () => {
    if (!email) { toast({ title: 'Enter your email', description: 'Type your email and try again.' }); return; }
    try {
      setResendLoading(true);
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: redirectUrl } });
      if (error) { toast({ title: 'Could not resend', description: error.message, variant: 'destructive' }); }
      else { toast({ title: 'Email resent', description: 'Check your inbox or spam folder.' }); }
    } finally { setResendLoading(false); }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast({ title: 'Could not send reset email', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Check your inbox', description: 'We sent you a password reset link.' });
        setForgotOpen(false);
        setForgotEmail('');
      }
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-14 h-14 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg mb-2">
            <Compass className="h-7 w-7 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Qwest</CardTitle>
          <CardDescription>Manage your job applications</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input id="signin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input id="signin-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
                <div className="text-right">
                  <Button type="button" variant="link" className="px-0 h-auto text-sm" onClick={() => { setForgotEmail(email); setForgotOpen(true); }}>
                    Forgot your password?
                  </Button>
                </div>
                {needsConfirmation && (
                  <div className="text-sm text-muted-foreground mt-3">
                    You must confirm your email to sign in.
                    <Button type="button" variant="link" className="px-2" onClick={handleResendConfirmation} disabled={resendLoading}>
                      {resendLoading ? 'Resending...' : 'Resend confirmation'}
                    </Button>
                  </div>
                )}
              </form>
              {forgotOpen && (
                <form onSubmit={handleForgotPassword} className="mt-4 space-y-3 border-t pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Recover password</Label>
                    <Input id="forgot-email" type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="your@email.com" required />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" className="flex-1" disabled={forgotLoading}>
                      {forgotLoading ? 'Sending...' : 'Send reset link'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setForgotOpen(false)}>Cancel</Button>
                  </div>
                </form>
              )}
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">First Name *</Label>
                    <Input id="first-name" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Last Name *</Label>
                    <Input id="last-name" type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display-name">Display Name</Label>
                  <Input id="display-name" type="text" value={displayNameField} onChange={(e) => setDisplayNameField(e.target.value)} placeholder="John D. (optional - auto-generated)" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email *</Label>
                  <Input id="signup-email" type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} placeholder="your@email.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password *</Label>
                  <Input id="signup-password" type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="linkedin-url">LinkedIn</Label>
                  <Input id="linkedin-url" type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/your-profile" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="portfolio-url">Portfolio/Website</Label>
                  <Input id="portfolio-url" type="url" value={portfolioUrl} onChange={(e) => setPortfolioUrl(e.target.value)} placeholder="https://your-portfolio.com" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." rows={3} />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing up...' : 'Sign Up'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
