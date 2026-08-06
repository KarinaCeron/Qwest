import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Save, Pencil, X } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';

interface ProfileData {
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  location: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  bio: string | null;
}

const emptyProfile: ProfileData = {
  display_name: '',
  first_name: '',
  last_name: '',
  location: '',
  linkedin_url: '',
  portfolio_url: '',
  bio: '',
};

const profileSchema = z.object({
  display_name: z.string().trim().max(80, 'Display name must be under 80 characters').nullable(),
  first_name: z.string().trim().max(50, 'First name must be under 50 characters').nullable(),
  last_name: z.string().trim().max(50, 'Last name must be under 50 characters').nullable(),
  location: z.string().trim().max(120, 'Location must be under 120 characters').nullable(),
  linkedin_url: z.string().trim().max(255).url('Must be a valid URL').or(z.literal('')).nullable(),
  portfolio_url: z.string().trim().max(255).url('Must be a valid URL').or(z.literal('')).nullable(),
  bio: z.string().trim().max(1000, 'Bio must be under 1000 characters').nullable(),
});

const Profile = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ProfileData>(emptyProfile);
  const [original, setOriginal] = useState<ProfileData>(emptyProfile);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<[string, string]>(['', '']);
  const [originalRoles, setOriginalRoles] = useState<[string, string]>(['', '']);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('display_name, first_name, last_name, location, linkedin_url, portfolio_url, bio, target_roles')
        .eq('user_id', user.id)
        .maybeSingle();
      const loaded: ProfileData = {
        display_name: data?.display_name ?? '',
        first_name: data?.first_name ?? '',
        last_name: data?.last_name ?? '',
        location: data?.location ?? '',
        linkedin_url: data?.linkedin_url ?? '',
        portfolio_url: data?.portfolio_url ?? '',
        bio: data?.bio ?? '',
      };
      const loadedRoles = ((data as any)?.target_roles ?? []) as string[];
      const rolePair: [string, string] = [loadedRoles[0] ?? '', loadedRoles[1] ?? ''];
      setRoles(rolePair);
      setOriginalRoles(rolePair);
      setProfile(loaded);
      setOriginal(loaded);
      setLoadingProfile(false);
    };
    load();
  }, [user]);

  const set = (k: keyof ProfileData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setProfile((p) => ({ ...p, [k]: e.target.value }));

  const handleCancel = () => {
    setRoles(originalRoles);
    setProfile(original);
    setEditing(false);
  };

  const handleSave = async () => {
    if (!user) return;
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) {
      toast({ title: 'Invalid input', description: parsed.error.errors[0].message, variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = Object.fromEntries(
      Object.entries(parsed.data).map(([k, v]) => [k, v === '' ? null : v])
    );
    const target_roles = roles.map((r) => r.trim()).filter(Boolean).slice(0, 2);
    const { error } = await supabase
      .from('profiles')
      .update({ ...payload, target_roles } as any)
      .eq('user_id', user.id);
    setSaving(false);
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return;
    }
    setOriginal(profile);
    setOriginalRoles(roles);
    setEditing(false);
    toast({ title: '✅ Profile updated' });
  };

  if (loading || !user) return null;

  const initial = (profile.first_name?.[0] || user.email?.[0] || 'U').toUpperCase();
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ');

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle="My Profile" />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        {loadingProfile ? (
          <p className="text-center text-muted-foreground py-12">Loading profile...</p>
        ) : (
          <Card className="bg-gradient-card">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-2 border-primary/20">
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-2xl font-semibold">
                    {initial}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{profile.display_name || fullName || 'Your Profile'}</CardTitle>
                  <p className="text-muted-foreground text-sm">{user.email}</p>
                </div>
              </div>
              {!editing ? (
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCancel} disabled={saving}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={saving} className="bg-gradient-primary">
                    <Save className="h-4 w-4 mr-1" />
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First Name</Label>
                  <Input id="first_name" value={profile.first_name ?? ''} onChange={set('first_name')} disabled={!editing} maxLength={50} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last Name</Label>
                  <Input id="last_name" value={profile.last_name ?? ''} onChange={set('last_name')} disabled={!editing} maxLength={50} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input id="display_name" value={profile.display_name ?? ''} onChange={set('display_name')} disabled={!editing} maxLength={80} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={user.email ?? ''} disabled readOnly />
                <p className="text-xs text-muted-foreground">Email cannot be changed.</p>
              </div>
              <div className="space-y-2">
                <Label>Roles I'm chasing</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    id="target_role_1"
                    value={roles[0]}
                    onChange={(e) => setRoles(([, b]) => [e.target.value, b])}
                    disabled={!editing}
                    maxLength={80}
                    placeholder="e.g. VP of Product"
                  />
                  <Input
                    id="target_role_2"
                    value={roles[1]}
                    onChange={(e) => setRoles(([a]) => [a, e.target.value])}
                    disabled={!editing}
                    maxLength={80}
                    placeholder="e.g. Head of Growth (optional)"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Highlight up to two target roles.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" value={profile.location ?? ''} onChange={set('location')} disabled={!editing} maxLength={120} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                <Input id="linkedin_url" type="url" placeholder="https://linkedin.com/in/..." value={profile.linkedin_url ?? ''} onChange={set('linkedin_url')} disabled={!editing} maxLength={255} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="portfolio_url">Portfolio URL</Label>
                <Input id="portfolio_url" type="url" placeholder="https://..." value={profile.portfolio_url ?? ''} onChange={set('portfolio_url')} disabled={!editing} maxLength={255} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" rows={4} value={profile.bio ?? ''} onChange={set('bio')} disabled={!editing} maxLength={1000} />
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Profile;
