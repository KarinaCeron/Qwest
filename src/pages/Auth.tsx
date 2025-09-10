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
  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Profile signup states
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [bio, setBio] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Qwest | Iniciar sesión';
    const metaDescName = 'description';
    let meta = document.querySelector(`meta[name="${metaDescName}"]`);
    const content = 'Inicia sesión en Qwest: gestiona tus postulaciones de empleo.';
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', metaDescName);
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
  }, []);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data: signUpData, error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
            display_name: displayName || `${firstName} ${lastName}`.trim() || signupEmail,
            phone: phone,
            location: location,
            linkedin_url: linkedinUrl,
            portfolio_url: portfolioUrl,
            bio: bio
          }
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          toast({
            title: 'Usuario ya registrado',
            description: 'Este email ya está registrado. Intenta iniciar sesión.',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Error al registrarse',
            description: error.message,
            variant: 'destructive'
          });
        }
      } else {
        // Si la confirmación de email está desactivada, ya hay sesión y podemos crear el perfil inmediatamente
        const userId = signUpData?.user?.id;
        if (userId) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert(
              [{
                user_id: userId,
                display_name: displayName || `${firstName} ${lastName}`.trim() || signupEmail,
                first_name: firstName,
                last_name: lastName,
                phone,
                location,
                linkedin_url: linkedinUrl,
                portfolio_url: portfolioUrl,
                bio
              }],
              { onConflict: 'user_id' }
            );
          
          if (profileError) {
            console.error('Error creando perfil:', profileError);
          }
        }

        toast({
          title: 'Registro exitoso',
          description: 'Tu cuenta ha sido creada.',
        });
        // Reset form
        setSignupEmail('');
        setSignupPassword('');
        setFirstName('');
        setLastName('');
        setDisplayName('');
        setPhone('');
        setLocation('');
        setLinkedinUrl('');
        setPortfolioUrl('');
        setBio('');
        
        // Si hay sesión activa, navega a inicio
        if (signUpData?.session) {
          navigate('/');
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Ocurrió un error inesperado',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        const msg = (error as any)?.message || '';
        if (msg.toLowerCase().includes('email not confirmed')) {
          setNeedsConfirmation(true);
          toast({
            title: 'Confirma tu email',
            description: 'Debes confirmar tu cuenta desde el correo enviado para poder iniciar sesión.',
          });
        } else {
          toast({
            title: 'Error al iniciar sesión',
            description: msg || 'Credenciales inválidas',
            variant: 'destructive'
          });
        }
      } else {
        setNeedsConfirmation(false);
        toast({
          title: 'Bienvenido',
          description: 'Has iniciado sesión correctamente.',
        });
        navigate('/');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Ocurrió un error inesperado',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      toast({
        title: 'Ingresa tu email',
        description: 'Escribe tu email y vuelve a intentar.',
      });
      return;
    }
    try {
      setResendLoading(true);
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: redirectUrl }
      });
      if (error) {
        toast({
          title: 'No se pudo reenviar',
          description: error.message,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Correo reenviado',
          description: 'Revisa tu bandeja de entrada o spam.',
        });
      }
    } finally {
      setResendLoading(false);
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
        <CardDescription>
          Gestiona tus postulaciones de empleo
        </CardDescription>
        <div className="text-xs text-muted-foreground mt-2 p-2 bg-muted rounded">
          <strong>Usuario demo:</strong> evelyn@example.com | <strong>Pass:</strong> 123456789
        </div>
      </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="signup">Registrarse</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Contraseña</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Iniciando...' : 'Iniciar Sesión'}
                </Button>
                {needsConfirmation && (
                  <div className="text-sm text-muted-foreground mt-3">
                    Debes confirmar tu email para iniciar sesión.
                    <Button
                      type="button"
                      variant="link"
                      className="px-2"
                      onClick={handleResendConfirmation}
                      disabled={resendLoading}
                    >
                      {resendLoading ? 'Reenviando...' : 'Reenviar confirmación'}
                    </Button>
                  </div>
                )}
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first-name">Nombre *</Label>
                    <Input
                      id="first-name"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Juan"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-name">Apellido *</Label>
                    <Input
                      id="last-name"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Pérez"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="display-name">Nombre a mostrar</Label>
                  <Input
                    id="display-name"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Juan P. (opcional - se auto-genera)"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email *</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    placeholder="tu@email.com"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Contraseña *</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location">Ubicación</Label>
                  <Input
                    id="location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ciudad, País"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="linkedin-url">LinkedIn</Label>
                  <Input
                    id="linkedin-url"
                    type="url"
                    value={linkedinUrl}
                    onChange={(e) => setLinkedinUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/tu-perfil"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="portfolio-url">Portfolio/Sitio Web</Label>
                  <Input
                    id="portfolio-url"
                    type="url"
                    value={portfolioUrl}
                    onChange={(e) => setPortfolioUrl(e.target.value)}
                    placeholder="https://tu-portfolio.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bio">Biografía</Label>
                  <Textarea
                    id="bio"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Cuéntanos sobre ti..."
                    rows={3}
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Registrando...' : 'Registrarse'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}