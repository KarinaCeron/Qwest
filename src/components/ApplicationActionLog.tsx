import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, ClipboardList } from 'lucide-react';

interface ActionLogEntry {
  id: string;
  content: string;
  created_at: string;
}

interface Props {
  applicationId: string;
  userId: string;
}

export function ApplicationActionLog({ applicationId, userId }: Props) {
  const { toast } = useToast();
  const [entries, setEntries] = useState<ActionLogEntry[]>([]);
  const [newEntry, setNewEntry] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('application_actions')
      .select('id, content, created_at')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (applicationId) fetchEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId]);

  const handleAdd = async () => {
    const content = newEntry.trim();
    if (!content) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('application_actions')
      .insert({ application_id: applicationId, user_id: userId, content })
      .select('id, content, created_at')
      .single();
    setSaving(false);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setEntries((prev) => [data as ActionLogEntry, ...prev]);
    setNewEntry('');
  };

  const handleDelete = async (id: string) => {
    const prev = entries;
    setEntries((e) => e.filter((x) => x.id !== id));
    const { error } = await supabase.from('application_actions').delete().eq('id', id);
    if (error) {
      setEntries(prev);
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-primary" />
        <Label className="text-base font-semibold">Action Log</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Track actions taken on this application. Dates are recorded automatically.
      </p>

      <div className="space-y-2">
        <Textarea
          value={newEntry}
          onChange={(e) => setNewEntry(e.target.value)}
          placeholder="e.g. Sent follow-up email to recruiter"
          rows={2}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handleAdd}
            disabled={saving || !newEntry.trim()}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add entry
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {!loading && entries.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No entries yet.</p>
        )}
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-start justify-between gap-2 rounded-md border bg-background p-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-1">{formatDate(entry.created_at)}</p>
              <p className="text-sm whitespace-pre-wrap break-words">{entry.content}</p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
              onClick={() => handleDelete(entry.id)}
              aria-label="Delete entry"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
