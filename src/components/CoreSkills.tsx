import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Sparkles, X } from 'lucide-react';

export function CoreSkills() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [skills, setSkills] = useState<string[]>([]);
  const [meanings, setMeanings] = useState<Record<string, string>>({});
  const [bulk, setBulk] = useState('');
  const loadedUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    if (loadedUserId.current === user.id) return;
    const load = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('skills, skill_meanings')
        .eq('user_id', user.id)
        .maybeSingle();
      const loaded = (((data as any)?.skills ?? []) as string[]).map((s) => (s ?? '').trim()).filter(Boolean);
      const deduped: string[] = [];
      loaded.forEach((s) => {
        if (!deduped.some((d) => d.toLowerCase() === s.toLowerCase())) deduped.push(s);
      });
      setSkills(deduped);
      setMeanings((((data as any)?.skill_meanings ?? {}) as Record<string, string>) || {});
      loadedUserId.current = user.id;
      setLoading(false);
    };
    load();
  }, [user?.id]);

  const buildPayload = (skillList: string[], meaningMap: Record<string, string>) => {
    const cleanSkills = skillList.map((s) => s.trim()).filter(Boolean).slice(0, 100);
    const cleanMeanings: Record<string, string> = {};
    cleanSkills.forEach((s) => {
      const meaning = (meaningMap[s] ?? '').trim();
      if (meaning) cleanMeanings[s] = meaning.slice(0, 500);
    });
    return { skills: cleanSkills, skill_meanings: cleanMeanings };
  };

  const save = async (skillList: string[], meaningMap: Record<string, string>) => {
    if (!user) return;
    const payload = buildPayload(skillList, meaningMap);
    const { error } = await supabase
      .from('profiles')
      .update(payload as any)
      .eq('user_id', user.id);
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
    }
  };

  const removeSkill = (skill: string) => {
    const nextSkills = skills.filter((s) => s !== skill);
    const nextMeanings = { ...meanings };
    delete nextMeanings[skill];
    setSkills(nextSkills);
    setMeanings(nextMeanings);
    void save(nextSkills, nextMeanings);
  };

  const handleBulkAdd = () => {
    const items = bulk
      .split(/[\n,;]+/)
      .map((s) => s.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    if (items.length === 0) return;
    const next = [...skills];
    let added = 0;
    let duplicates = 0;
    items.forEach((item) => {
      if (next.some((s) => s.toLowerCase() === item.toLowerCase())) {
        duplicates += 1;
        return;
      }
      next.push(item);
      added += 1;
    });
    setSkills(next);
    setBulk('');
    if (added > 0) void save(next, meanings);
    if (duplicates > 0) {
      toast({
        title: added > 0 ? `${added} skill${added > 1 ? 's' : ''} added` : 'Nothing to add',
        description: `${duplicates} duplicate${duplicates > 1 ? 's' : ''} skipped.`,
      });
    }
  };

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
          <div className="space-y-2">
            <label htmlFor="bulk_skills" className="text-sm font-medium leading-none">
              Add skills
            </label>
            <p className="text-xs text-muted-foreground">
              Paste one per line or separate with commas — duplicates are skipped automatically.
            </p>
            <pre className="rounded-md bg-muted/60 p-2 text-xs text-muted-foreground whitespace-pre-wrap">
{`Product Strategy
Roadmapping, Customer Research
AI Products`}
            </pre>
            <Textarea
              id="bulk_skills"
              rows={3}
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              placeholder="Product Strategy, Roadmapping, Customer Research"
            />
            <Button variant="outline" size="sm" onClick={handleBulkAdd} disabled={!bulk.trim()}>
              <Plus className="mr-1 h-4 w-4" /> Add all
            </Button>
          </div>

          {skills.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              No skills yet. Paste your strengths above and click Add all.
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
                    onBlur={() => void save(skills, meanings)}
                    placeholder={`What does "${skill}" mean for you? e.g. how you apply it and the impact you create`}
                    maxLength={500}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
