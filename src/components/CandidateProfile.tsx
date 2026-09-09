import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, UserRound } from 'lucide-react';

interface CompensationItem {
  kind: string;
  label: string | null;
  value: string | null;
  min_value: string | null;
  currency: string;
  period: string;
  required: boolean;
}

function buildSummary(
  targetRoles: string[],
  skills: string[],
  compItems: CompensationItem[]
): string {
  const salaries = compItems.filter((c) => c.kind === 'salary');
  const benefits = compItems.filter((c) => c.kind !== 'salary');
  const parts: string[] = [];
  if (targetRoles.length > 0) {
    parts.push(`Candidate targeting ${targetRoles.join(' and ')} roles.`);
  } else {
    parts.push('Candidate currently defining their target roles.');
  }
  if (skills.length > 0) {
    parts.push(`Core skills: ${skills.join(', ')}.`);
  }
  if (salaries.length > 0) {
    const s = salaries
      .map((c) => {
        const desired = c.value ? `${c.currency} ${c.value}` : null;
        const min = c.min_value ? `${c.currency} ${c.min_value}` : null;
        if (desired && min) return `desired ${desired}, minimum ${min} (${c.period})`;
        if (desired) return `desired ${desired} (${c.period})`;
        if (min) return `minimum ${min} (${c.period})`;
        return null;
      })
      .filter(Boolean)
      .join('; ');
    if (s) parts.push(`Compensation target: ${s}.`);
  }
  if (benefits.length > 0) {
    const b = benefits
      .map((c) => `${c.label ?? c.value ?? ''}${c.required ? ' (required)' : ''}`.trim())
      .filter(Boolean)
      .join(', ');
    if (b) parts.push(`Key benefits: ${b}.`);
  }
  return parts.join(' ');
}

export function CandidateProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState('');
  const [targetRoles, setTargetRoles] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [compItems, setCompItems] = useState<CompensationItem[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRef = useRef(summary);

  useEffect(() => {
    latestRef.current = summary;
  }, [summary]);

  const persist = useCallback(async (value: string) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ candidate_profile: value.trim() || null } as any)
      .eq('user_id', user.id);
    setSaving(false);
    if (error) {
      toast({ title: '❌ Could not save your candidate profile', description: error.message, variant: 'destructive' });
    }
  }, [user, toast]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: profile }, { data: comp }] = await Promise.all([
        supabase
          .from('profiles')
          .select('target_roles, skills')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('compensation_items')
          .select('kind, label, value, min_value, currency, period, required')
          .eq('user_id', user.id)
          .order('sort_order', { ascending: true }),
      ]);
      const { data: cp } = await supabase
        .from('profiles')
        .select('candidate_profile')
        .eq('user_id', user.id)
        .maybeSingle();
      const loadedTargetRoles = (profile?.target_roles ?? []).filter(Boolean);
      const loadedSkills = (profile?.skills ?? []).filter(Boolean);
      const loadedCompItems = (comp ?? []) as CompensationItem[];
      const loadedSummary = ((cp as any)?.candidate_profile as string) ?? '';

      setTargetRoles(loadedTargetRoles);
      setSkills(loadedSkills);
      setCompItems(loadedCompItems);
      setSummary(loadedSummary);
      setLoading(false);

      if (!loadedSummary.trim()) {
        const generated = buildSummary(loadedTargetRoles, loadedSkills, loadedCompItems);
        setSummary(generated);
        persist(generated);
        toast({ title: '✨ Summary generated from your Qwest' });
      }
    };
    load();
  }, [user, persist]);

  // Flush pending autosave on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleChange = (value: string) => {
    setSummary(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => persist(value), 1200);
  };

  const salaries = compItems.filter((c) => c.kind === 'salary');
  const benefits = compItems.filter((c) => c.kind !== 'salary');

  if (!user) return null;

  return (
    <Card className="bg-gradient-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <UserRound className="h-5 w-5" />
          Qwest candidate profile
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Chasing</p>
                <div className="flex flex-wrap gap-1">
                  {targetRoles.length > 0 ? (
                    targetRoles.map((r) => <Badge key={r} variant="secondary">{r}</Badge>)
                  ) : (
                    <span className="text-sm text-muted-foreground">No target roles set</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Core skills</p>
                <div className="flex flex-wrap gap-1">
                  {skills.length > 0 ? (
                    skills.map((s) => <Badge key={s} variant="outline">{s}</Badge>)
                  ) : (
                    <span className="text-sm text-muted-foreground">No core skills set</span>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Compensation & benefits</p>
                {compItems.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {salaries.map((c, i) => (
                      <Badge key={`s-${i}`} variant="secondary">
                        {c.currency} {c.value ?? c.min_value ?? ''} {c.period}
                      </Badge>
                    ))}
                    {benefits.map((c, i) => (
                      <Badge key={`b-${i}`} variant="outline">
                        {c.label ?? c.value}
                        {c.required ? ' *' : ''}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No compensation targets set</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Summary {saving && <span className="normal-case">— saving…</span>}
              </p>
              <Textarea
                rows={6}
                value={summary}
                onChange={(e) => handleChange(e.target.value)}
                placeholder="Summarize who you are as a candidate: the roles you're aiming for, your compensation expectations, and the benefits that matter to you."
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">
                This summary is generated from your Qwest and saves automatically. You can edit it at any time.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
