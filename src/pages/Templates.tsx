import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { AppHeader } from '@/components/AppHeader';
import { Plus, Pencil, Trash2, Copy, MessageSquareText, Loader2, FolderOpen } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

type Template = {
  id: string;
  title: string;
  content: string;
  category: string | null;
  updated_at: string;
};

const CATEGORIES = [
  { value: 'linkedin-connect', label: 'LinkedIn Connect' },
  { value: 'send-cv', label: 'Send CV / New Application' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'feedback-request', label: 'Feedback after Rejection' },
  { value: 'thank-you', label: 'Thank You' },
  { value: 'other', label: 'Other' },
];

const categoryLabel = (v: string | null) =>
  CATEGORIES.find((c) => c.value === v)?.label ?? 'Other';

export default function TemplatesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<string>('linkedin-connect');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [loading, user, navigate]);

  const load = async () => {
    setLoadingList(true);
    const { data, error } = await supabase
      .from('message_templates')
      .select('id,title,content,category,updated_at')
      .order('updated_at', { ascending: false });
    if (error) {
      toast({ title: 'Failed to load templates', description: error.message, variant: 'destructive' });
    } else {
      setTemplates(data ?? []);
    }
    setLoadingList(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const resetForm = () => {
    setEditing(null);
    setTitle('');
    setContent('');
    setCategory('linkedin-connect');
  };

  const openNew = () => { resetForm(); setOpen(true); };

  const openEdit = (t: Template) => {
    setEditing(t);
    setTitle(t.title);
    setContent(t.content);
    setCategory(t.category ?? 'other');
    setOpen(true);
  };

  const save = async () => {
    if (!user) return;
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    if (!trimmedTitle || !trimmedContent) {
      toast({ title: 'Title and content are required', variant: 'destructive' });
      return;
    }
    if (trimmedTitle.length > 120) {
      toast({ title: 'Title too long (max 120 chars)', variant: 'destructive' });
      return;
    }
    if (trimmedContent.length > 5000) {
      toast({ title: 'Content too long (max 5000 chars)', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = { title: trimmedTitle, content: trimmedContent, category };
    const { error } = editing
      ? await supabase.from('message_templates').update(payload).eq('id', editing.id)
      : await supabase.from('message_templates').insert({ ...payload, user_id: user.id });
    setSaving(false);
    if (error) {
      toast({ title: 'Failed to save', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: editing ? '✅ Template updated' : '✅ Template created' });
    setOpen(false);
    resetForm();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    const { error } = await supabase.from('message_templates').delete().eq('id', id);
    if (error) {
      toast({ title: '❌ Error deleting', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: '🗑️ Template deleted' });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const copy = async (t: Template) => {
    await navigator.clipboard.writeText(t.content);
    toast({ title: '📋 Copied to clipboard' });
  };

  const groupedTemplates = useMemo(() => {
    const sorted = [...templates].sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    const map = new Map<string, Template[]>();
    for (const t of sorted) {
      const key = t.category ?? 'other';
      const list = map.get(key) ?? [];
      list.push(t);
      map.set(key, list);
    }
    const result: { value: string; label: string; items: Template[] }[] = [];
    for (const cat of CATEGORIES) {
      const items = map.get(cat.value);
      if (items && items.length > 0) result.push({ value: cat.value, label: cat.label, items });
    }
    return result;
  }, [templates]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle="My Templates" />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="bg-gradient-card">
          <CardContent className="space-y-4 pt-6">
            <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
              <div className="flex justify-end">
                <DialogTrigger asChild>
                  <Button className="bg-gradient-primary" onClick={openNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Template
                  </Button>
                </DialogTrigger>
              </div>

              {loadingList ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-4">
                  <MessageSquareText className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground text-sm">
                    You don't have any templates yet
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {groupedTemplates.map((group) => (
                    <section key={group.value} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                          {group.label}
                        </h3>
                        <Badge variant="secondary">{group.items.length}</Badge>
                      </div>
                      <div className="space-y-3">
                        {group.items.map((t) => (
                          <div key={t.id} className="border rounded-lg p-4 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-medium truncate">{t.title}</p>
                                <p className="text-sm text-muted-foreground">
                                  Updated {new Date(t.updated_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-1 shrink-0">
                                <Button variant="ghost" size="icon" onClick={() => copy(t)} title="Copy">
                                  <Copy className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => openEdit(t)} title="Edit">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => remove(t.id)} title="Delete">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-sm whitespace-pre-wrap line-clamp-4 text-muted-foreground">
                              {t.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}

              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editing ? 'Edit Template' : 'New Template'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tpl-title">Title</Label>
                    <Input
                      id="tpl-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. LinkedIn intro to recruiter"
                      maxLength={120}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tpl-content">Content</Label>
                    <Textarea
                      id="tpl-content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Write your reusable message here..."
                      rows={10}
                      maxLength={5000}
                    />
                    <p className="text-xs text-muted-foreground">{content.length}/5000</p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={save} disabled={saving} className="bg-gradient-primary">
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
