import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ArrowLeft, Mail, MapPin, Linkedin, Globe, User } from 'lucide-react';

interface ProfileData {
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  location: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  bio: string | null;
}

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('display_name, first_name, last_name, location, linkedin_url, portfolio_url, bio')
        .eq('user_id', user.id)
        .maybeSingle();
      setProfile(data);
      setLoadingProfile(false);
    };
    load();
  }, [user]);

  if (loading || !user) return null;

  const initial = (profile?.first_name?.[0] ?? user.email?.[0] ?? 'U').toUpperCase();
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');

  const Field = ({ icon: Icon, label, value, href }: { icon: typeof User; label: string; value?: string | null; href?: string }) => (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <Icon className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        {value ? (
          href ? (
            <a href={href} target="_blank" rel="noreferrer" className="text-foreground hover:text-primary break-all">{value}</a>
          ) : (
            <p className="text-foreground break-words">{value}</p>
          )
        ) : (
          <p className="text-muted-foreground/60 italic">Not provided</p>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-gradient-card">
        <div className="container mx-auto px-4 py-6 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">My Profile</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {loadingProfile ? (
          <p className="text-center text-muted-foreground py-12">Loading profile...</p>
        ) : (
          <Card className="bg-gradient-card">
            <CardHeader className="flex flex-row items-center gap-4">
              <Avatar className="h-20 w-20 border-2 border-primary/20">
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl font-semibold">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl">{profile?.display_name || fullName || 'Your Profile'}</CardTitle>
                <p className="text-muted-foreground text-sm">{user.email}</p>
              </div>
            </CardHeader>
            <CardContent>
              <Field icon={User} label="Full Name" value={fullName || null} />
              <Field icon={Mail} label="Email" value={user.email} />
              <Field icon={MapPin} label="Location" value={profile?.location} />
              <Field icon={Linkedin} label="LinkedIn" value={profile?.linkedin_url} href={profile?.linkedin_url || undefined} />
              <Field icon={Globe} label="Portfolio" value={profile?.portfolio_url} href={profile?.portfolio_url || undefined} />
              <Field icon={User} label="Bio" value={profile?.bio} />
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Profile;
