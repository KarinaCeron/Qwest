import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Linkedin, Globe, MapPin, Pencil, Quote, Target } from 'lucide-react';

interface ProfileData {
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  target_roles: string[] | null;
}

export function ProfileHero() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, first_name, last_name, avatar_url, bio, location, linkedin_url, portfolio_url, target_roles')
        .eq('user_id', user.id)
        .maybeSingle();
      setProfile((data as ProfileData) ?? null);
      setLoading(false);
    };
    load();
  }, [user]);

  const fullName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') ||
    profile?.display_name ||
    user?.email?.split('@')[0] ||
    'Your profile';

  const initials = fullName
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Card className="overflow-hidden border-none shadow-lg">
      <div className="h-24 bg-gradient-primary" />
      <CardContent className="-mt-12 space-y-4 pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <Avatar className="h-24 w-24 border-4 border-card shadow-md">
              <AvatarImage src={profile?.avatar_url ?? undefined} alt={fullName} />
              <AvatarFallback className="bg-gradient-primary text-2xl text-primary-foreground">
                {initials || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="pb-1">
              {loading ? (
                <Skeleton className="h-7 w-40" />
              ) : (
                <h2 className="text-2xl font-bold leading-tight">{fullName}</h2>
              )}
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              {profile?.location && (
                <Badge variant="secondary" className="mt-2 gap-1 font-normal">
                  <MapPin className="h-3 w-3" />
                  {profile.location}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {profile?.linkedin_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                  <Linkedin className="mr-1 h-4 w-4" /> LinkedIn
                </a>
              </Button>
            )}
            {profile?.portfolio_url && (
              <Button variant="outline" size="sm" asChild>
                <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer">
                  <Globe className="mr-1 h-4 w-4" /> Portfolio
                </a>
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild>
              <Link to="/profile">
                <Pencil className="mr-1 h-4 w-4" /> Edit
              </Link>
            </Button>
          </div>
        </div>

        {(profile?.target_roles ?? []).length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <Target className="h-3.5 w-3.5 text-primary" />
              Chasing
            </span>
            {(profile?.target_roles ?? []).slice(0, 2).map((role) => (
              <Badge key={role} className="bg-gradient-primary text-primary-foreground">
                {role}
              </Badge>
            ))}
          </div>
        )}

        {loading ? (
          <Skeleton className="h-16 w-full" />
        ) : profile?.bio ? (
          <div className="relative rounded-lg bg-muted/50 p-4 pl-10">
            <Quote className="absolute left-3 top-4 h-4 w-4 text-primary" />
            <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-line">{profile.bio}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
            Add a short bio so your Qwest tells your story.{' '}
            <Link to="/profile" className="text-primary underline">
              Write it now
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
