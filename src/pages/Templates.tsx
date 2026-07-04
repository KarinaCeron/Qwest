import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { UserMenu } from '@/components/UserMenu';
import { Plus, Pencil, Trash2, Copy, ArrowLeft } from 'lucide-react';

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
    const { data, error } = await supabase
      .from('message_templates')
      .select('id,title,content,category,updated_at')
      .order('updated_at', { ascending: false });
    if (error) {
      toast({ title: 'Failed to load templates', description: error.message, variant: 'destructive' });
      return;
    }
    setTemplates(data ?? []);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const resetForm = () => {
    setEditing(null);
    setTitle('');
    setContent('');
    setCategory('linkedin-connect');
  };

  const openNew = () => {
    resetForm();
    setOpen(true);
  };

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
    toast({ title: editing ? 'Template updated' : 'Template created' });
    setOpen(false);
    resetForm();
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    const { error } = await supabase.from('message_templates').delete().eq('id', id);
    if (error) {
      toast({ title: 'Failed to delete', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Template deleted' });
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  const copy = async (t: Template) => {
    await navigator.clipboard.writeText(t.content);
    toast({ title: '📋 Copied to clipboard' });
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur">
        <div className="container mx-auto flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">My Templates</h1>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            Reusable messages for LinkedIn outreach, follow-ups, feedback requests and more.
          </p>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" /> New Template
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
                <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No templates yet. Create your first one to save time on recruiter outreach.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {templates.map((t) => (
              <Card key={t.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{t.title}</CardTitle>
                      <CardDescription>{categoryLabel(t.category)}</CardDescription>
                    </div>
                    <div className="flex gap-1">
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
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap line-clamp-6 text-muted-foreground">
                    {t.content}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
