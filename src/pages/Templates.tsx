import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { AppHeader } from '@/components/AppHeader';
import {
  Plus, Pencil, Trash2, Copy, MessageSquareText, Loader2, FolderOpen,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from '@/components/ui/tooltip';

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

const categoryColor = (value: string | null) => {
  switch (value) {
    case 'linkedin-connect': return 'bg-blue-50 text-blue-700 border-blue-100';
    case 'send-cv': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
    case 'follow-up': return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'feedback-request': return 'bg-rose-50 text-rose-700 border-rose-100';
    case 'thank-you': return 'bg-purple-50 text-purple-700 border-purple-100';
    default: return 'bg-slate-50 text-slate-700 border-slate-100';
  }
};

export default function TemplatesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
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
      if (categoryFilter !== 'all' && t.category !== categoryFilter) continue;
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
  }, [templates, categoryFilter]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader subtitle="My Templates" />

      <main className="container mx-auto max-w-6xl px-4 py-12">
        <div className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Message templates</h2>
            <p className="max-w-xl text-base text-muted-foreground">
              Reusable messages for recruiters, follow-ups, and new applications. Copy, edit, or create new templates to speed up your outreach.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary shrink-0 shadow-md transition-smooth hover:shadow-lg" onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" />
                New Template
              </Button>
            </DialogTrigger>
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
        </div>
      </div>

        <Card className="bg-gradient-card border-0 shadow-card">
          <CardContent className="p-8">
            {loadingList ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
                  <MessageSquareText className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">No templates yet</h3>
                <p className="mt-2 max-w-md text-muted-foreground">
                  Create your first reusable message to save time when reaching out to recruiters or following up on applications.
                </p>
              </div>
            ) : (
              <div className="space-y-12">
                {groupedTemplates.map((group) => (
                  <section key={group.value} className="space-y-5">
                    <div className="flex items-center gap-3">
                      <FolderOpen className="h-5 w-5 text-muted-foreground" />
                      <h3 className="text-lg font-semibold text-foreground">{group.label}</h3>
                      <Badge variant="secondary" className="font-medium">
                        {group.items.length}
                      </Badge>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {group.items.map((t) => (
                        <article
                          key={t.id}
                          className="group flex flex-col justify-between rounded-xl border bg-card p-5 shadow-sm transition-smooth hover:-translate-y-0.5 hover:shadow-md"
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-display text-lg font-semibold leading-snug text-foreground line-clamp-2">
                                  {t.title}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  Updated {new Date(t.updated_at).toLocaleDateString()}
                                </p>
                              </div>
                              <Badge variant="outline" className={`shrink-0 text-xs ${categoryColor(t.category)}`}>
                                {categoryLabel(t.category)}
                              </Badge>
                            </div>
                            <p className="text-sm leading-relaxed text-muted-foreground line-clamp-4">
                              {t.content}
                            </p>
                          </div>
                          <div className="mt-5 flex items-center gap-2 border-t pt-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 px-2 text-xs"
                              onClick={() => copy(t)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                              Copy
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 px-2 text-xs"
                              onClick={() => openEdit(t)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1.5 px-2 text-xs text-destructive hover:text-destructive"
                              onClick={() => remove(t.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </Button>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
