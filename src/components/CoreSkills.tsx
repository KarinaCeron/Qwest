import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Save, Sparkles, X } from 'lucide-react';

type SaveStatus = 'idle' | 'saving' | 'saved';

export function CoreSkills() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [meanings, setMeanings] = useState<Record<string, string>>({});
  const [newSkill, setNewSkill] = useState('');
  const [bulk, setBulk] = useState('');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const loadedUserId = useRef<string | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) return;
    if (loadedUserId.current === user.id) return;
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('skills, skill_meanings')
        .eq('user_id', user.id)
        .maybeSingle();
      setSkills((((data as any)?.skills ?? []) as string[]).filter(Boolean));
      setMeanings((((data as any)?.skill_meanings ?? {}) as Record<string, string>) || {});
      loadedUserId.current = user.id;
      setLoading(false);
    };
    load();
  }, [user?.id]);

  useEffect(() => {
    if (loadedUserId.current !== user?.id) return;
    setSaveStatus('idle');
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      void performSave({ silent: true });
    }, 800);
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [meanings, skills, user?.id]);

  const buildPayload = () => {
    const cleanSkills = skills.map((s) => s.trim()).filter(Boolean).slice(0, 100);
    const cleanMeanings: Record<string, string> = {};
    cleanSkills.forEach((s) => {
      const meaning = (meanings[s] ?? '').trim();
      if (meaning) cleanMeanings[s] = meaning.slice(0, 500);
    });
    return { skills: cleanSkills, skill_meanings: cleanMeanings };
  };

  const performSave = async (options?: { silent?: boolean }) => {
    if (!user) return;
    if (!options?.silent) setSaving(true);
    setSaveStatus('saving');
    const payload = buildPayload();
    const { error } = await supabase
      .from('profiles')
      .update(payload as any)
      .eq('user_id', user.id);
    if (!options?.silent) setSaving(false);
    if (error) {
      setSaveStatus('idle');
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      return;
    }
    setSkills(payload.skills);
    setMeanings(payload.skill_meanings);
    setSaveStatus('saved');
    if (!options?.silent) {
      toast({ title: '✅ Core skills saved' });
    }
  };

  const addSkill = (value: string) => {
    const clean = value.trim();
    if (!clean) return;
    setSkills((prev) => (prev.some((s) => s.toLowerCase() === clean.toLowerCase()) ? prev : [...prev, clean]));
  };

  const removeSkill = (skill: string) => {
    setSkills((prev) => prev.filter((s) => s !== skill));
    setMeanings((prev) => {
      const next = { ...prev };
      delete next[skill];
      return next;
    });
  };

  const handleBulkAdd = () => {
    const items = bulk
      .split(/[\n,;]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length === 0) return;
    setSkills((prev) => {
      const next = [...prev];
      items.forEach((item) => {
        if (!next.some((s) => s.toLowerCase() === item.toLowerCase())) next.push(item);
      });
      return next;
    });
    setBulk('');
  };

  const statusText =
    saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Auto-saved' : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5" />
            Core skills
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSkill(newSkill);
                  setNewSkill('');
                }
              }}
              placeholder="Add a skill, e.g. Product Discovery"
              maxLength={80}
            />
            <Button
              variant="outline"
              onClick={() => {
                addSkill(newSkill);
                setNewSkill('');
              }}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {skills.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              No skills yet. Add the strengths you want recruiters to see.
            </p>
          ) : (
            <div className="space-y-3">
              {skills.map((skill) => (
                <div key={skill} className="rounded-lg border bg-background/60 p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="py-1 text-sm font-normal">
                      {skill}
                    </Badge>
                    <button
                      type="button"
                      aria-label={`Remove ${skill}`}
                      className="rounded-full p-1 text-muted-foreground hover:bg-muted"
                      onClick={() => removeSkill(skill)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <Textarea
                    rows={2}
                    value={meanings[skill] ?? ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setMeanings((prev) => ({ ...prev, [skill]: value }));
                    }}
                    placeholder={`What does "${skill}" mean for you? e.g. how you apply it and the impact you create`}
                    maxLength={500}
                  />
                </div>
              ))}
            </div>
          )}


          <div className="space-y-2">
            <label htmlFor="bulk_skills" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Paste multiple skills
            </label>
            <Textarea
              id="bulk_skills"
              rows={3}
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              placeholder="One per line, or separated by commas"
            />
            <Button variant="outline" size="sm" onClick={handleBulkAdd} disabled={!bulk.trim()}>
              <Plus className="mr-1 h-4 w-4" /> Add all
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <Button className="flex-1 bg-gradient-primary" onClick={() => performSave()} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save core skills
            </Button>
            <span className="text-xs text-muted-foreground whitespace-nowrap w-20 text-right">
              {statusText}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
