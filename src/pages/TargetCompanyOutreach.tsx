import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft, ExternalLink, Linkedin, Loader2, Plus, Search, Trash2, Copy, Pencil,
} from 'lucide-react';

const db = supabase as any;

type TargetCompany = {
  id: string;
  company: string;
  website: string | null;
  role_title: string | null;
  final_decision: string | null;
  evaluation: Record<string, any> | null;
  score_stage: number | null;
  score_history: number | null;
  score_compensation: number | null;
  score_culture: number | null;
  score_path: number | null;
};

type Contact = {
  id: string;
  name: string;
  title: string | null;
  linkedin_url: string | null;
  email: string | null;
  notes: string | null;
  status: string;
  status_changed_at: string;
  draft_message: string | null;
};

const STATUSES = [
  { value: 'not_contacted', label: 'Not contacted' },
  { value: 'message_sent', label: 'Message sent' },
  { value: 'replied', label: 'Replied' },
  { value: 'meeting_booked', label: 'Meeting booked' },
  { value: 'no_response', label: 'No response' },
] as const;

const emptyForm = { name: '', title: '', linkedin_url: '', email: '', notes: '' };

const searchUrl = (keywords: string) =>
  `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(keywords)}`;

export default function TargetCompanyOutreachPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [company, setCompany] = useState<TargetCompany | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleInput, setRoleInput] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  

  const copySearch = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied', description: 'Paste it in a new browser tab.' });
    } catch {
      toast({ title: 'Could not copy', description: url, variant: 'destructive' });
    }
  };



  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user || !id) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  const load = async () => {
    setIsLoading(true);
    const [{ data: companyRow, error: companyError }, { data: contactRows, error: contactsError }] =
      await Promise.all([
        db.from('target_companies').select('*').eq('id', id).maybeSingle(),
        db
          .from('target_company_contacts')
          .select('*')
          .eq('target_company_id', id)
          .order('created_at', { ascending: true }),
      ]);

    if (companyError || !companyRow) {
      toast({
        title: 'Not found',
        description: companyError?.message ?? 'This target company no longer exists.',
        variant: 'destructive',
      });
      navigate('/target-companies');
      return;
    }
    if (contactsError) {
      toast({ title: 'Error', description: contactsError.message, variant: 'destructive' });
    }
    setCompany(companyRow as TargetCompany);
    setContacts((contactRows ?? []) as Contact[]);
    setIsLoading(false);
  };

  const total = useMemo(() => {
    if (!company) return null;
    const values = [
      company.score_stage, company.score_history, company.score_compensation,
      company.score_culture, company.score_path,
    ];
    if (values.every((v) => v === null || v === undefined)) return null;
    return values.reduce((sum, v) => sum + (Number(v ?? 0) || 0), 0);
  }, [company]);


  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (contact: Contact) => {
    setEditingId(contact.id);
    setForm({
      name: contact.name,
      title: contact.title ?? '',
      linkedin_url: contact.linkedin_url ?? '',
      email: contact.email ?? '',
      notes: contact.notes ?? '',
    });
    setDialogOpen(true);
  };

  const saveContact = async () => {
    const name = form.name.trim();
    if (!name) {
      toast({ title: 'Name required', description: 'Enter the person’s name.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name,
        title: form.title.trim() || null,
        linkedin_url: form.linkedin_url.trim() || null,
        email: form.email.trim() || null,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      };
      if (editingId) {
        const { error } = await db.from('target_company_contacts').update(payload).eq('id', editingId);
        if (error) throw error;
        setContacts((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...payload } as Contact : c)));
      } else {
        const { data, error } = await db
          .from('target_company_contacts')
          .insert({ ...payload, user_id: user!.id, target_company_id: id })
          .select()
          .single();
        if (error) throw error;
        setContacts((prev) => [...prev, data as Contact]);
      }
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Could not save this person.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const removeContact = async (contact: Contact) => {
    const { error } = await db.from('target_company_contacts').delete().eq('id', contact.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setContacts((prev) => prev.filter((c) => c.id !== contact.id));
  };

  const changeStatus = async (contact: Contact, status: string) => {
    const changedAt = new Date().toISOString();
    setContacts((prev) =>
      prev.map((c) => (c.id === contact.id ? { ...c, status, status_changed_at: changedAt } : c)),
    );
    const { error } = await db
      .from('target_company_contacts')
      .update({ status, status_changed_at: changedAt, updated_at: changedAt })
      .eq('id', contact.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
  };

  const saveDraft = async (contact: Contact, draft: string) => {
    setContacts((prev) => prev.map((c) => (c.id === contact.id ? { ...c, draft_message: draft } : c)));
    const { error } = await db
      .from('target_company_contacts')
      .update({ draft_message: draft, updated_at: new Date().toISOString() })
      .eq('id', contact.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
  };




  const copyDraft = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'The message is on your clipboard.' });
  };
  const createLinkedInSearch = () => {
    const role = roleInput.trim();
    if (!role) {
      toast({ title: 'Enter a role', description: 'Type a role to search for on LinkedIn.', variant: 'destructive' });
      return;
    }
    if (!company) return;
    setGeneratedLink(searchUrl(`${role} ${company.company}`));
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        subtitle="Prepare outreach"
        actions={
          <Button variant="outline" onClick={() => navigate('/target-companies')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Target companies
          </Button>
        }
      />

      <main className="container mx-auto space-y-6 px-4 py-8">
        {isLoading || !company ? (
          <div className="flex items-center justify-center gap-2 p-12 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-3">
                  <CardTitle className="text-2xl">{company.company}</CardTitle>
                  {total !== null && <Badge variant="secondary">{total}/25</Badge>}
                </div>
                <CardDescription>
                  {company.role_title ? `${company.role_title} · ` : ''}
                  {company.final_decision ?? 'Find the right people and reach out.'}
                </CardDescription>
              </CardHeader>
              {company.website && (
                <CardContent className="pt-0">
                  <a
                    href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2"
                  >
                    {company.website}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </CardContent>
              )}
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Search className="h-4 w-4" />
                  Find people on LinkedIn
                </CardTitle>
                <CardDescription>
                  Each link searches LinkedIn for that title at {company.company}. If the opened tab asks you
                  to sign in, use the copy icon and paste the link into your own browser tab instead.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {DEFAULT_TITLES.map((title) => (
                    <div key={title} className="flex items-center rounded-md border">
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={searchUrl(`${title} ${company.company}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Linkedin className="mr-2 h-4 w-4" />
                          {title}
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="px-2"
                        aria-label={`Copy LinkedIn search link for ${title}`}
                        onClick={() => copySearch(searchUrl(`${title} ${company.company}`))}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>

                {founders.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Founders named in the research
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {founders.map((founder) => (
                        <div key={founder} className="flex items-center rounded-md border bg-secondary">
                          <Button variant="ghost" size="sm" asChild>
                            <a
                              href={searchUrl(`${founder} ${company.company}`)}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Linkedin className="mr-2 h-4 w-4" />
                              {founder}
                            </a>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="px-2"
                            aria-label={`Copy LinkedIn search link for ${founder}`}
                            onClick={() => copySearch(searchUrl(`${founder} ${company.company}`))}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Any other title, e.g. Director of Engineering"
                  />
                  {customTitle.trim() ? (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" asChild>
                        <a
                          href={searchUrl(`${customTitle.trim()} ${company.company}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Search className="mr-2 h-4 w-4" />
                          Search
                        </a>
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Copy LinkedIn search link"
                        onClick={() => copySearch(searchUrl(`${customTitle.trim()} ${company.company}`))}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button variant="outline" disabled>
                      <Search className="mr-2 h-4 w-4" />
                      Search
                    </Button>
                  )}
                </div>
              </CardContent>

            </Card>

            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">People to contact</CardTitle>
                  <CardDescription>
                    {contacts.length === 0
                      ? 'Nobody added yet.'
                      : `${contacts.length} ${contacts.length === 1 ? 'person' : 'people'} on your list.`}
                  </CardDescription>
                </div>
                <Button onClick={openAdd} className="bg-gradient-primary">
                  <Plus className="mr-2 h-4 w-4" />
                  Add person
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {contacts.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Use the LinkedIn searches above, then add the people you want to reach.
                  </p>
                ) : (
                  contacts.map((contact) => (
                    <div key={contact.id} className="rounded-lg border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-foreground">{contact.name}</div>
                          {contact.title && (
                            <div className="text-sm text-muted-foreground">{contact.title}</div>
                          )}
                          <div className="mt-1 flex flex-wrap gap-3 text-xs">
                            {contact.linkedin_url && (
                              <a
                                href={contact.linkedin_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
                              >
                                <Linkedin className="h-3 w-3" /> LinkedIn
                              </a>
                            )}
                            {contact.email && (
                              <span className="text-muted-foreground">{contact.email}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Select
                            value={contact.status}
                            onValueChange={(value) => changeStatus(contact, value)}
                          >
                            <SelectTrigger className="w-[170px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(contact)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeContact(contact)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-muted-foreground">
                        Status changed {new Date(contact.status_changed_at).toLocaleDateString()}
                      </p>

                      {contact.notes && (
                        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                          {contact.notes}
                        </p>
                      )}

                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">My message</p>
                          {contact.draft_message && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyDraft(contact.draft_message!)}
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy
                            </Button>
                          )}
                        </div>
                        <Textarea
                          rows={6}
                          placeholder="Write the message you want to send to this person..."
                          value={contact.draft_message ?? ''}
                          onChange={(e) =>
                            setContacts((prev) =>
                              prev.map((c) =>
                                c.id === contact.id ? { ...c, draft_message: e.target.value } : c,
                              ),
                            )
                          }
                          onBlur={(e) => saveDraft(contact, e.target.value)}
                          className="text-sm"
                        />
                      </div>

                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit person' : 'Add a person'}</DialogTitle>
            <DialogDescription>
              Paste the LinkedIn profile address of the person you found in the search.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="oc-name">Name *</Label>
              <Input
                id="oc-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Jane Doe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oc-title">Title</Label>
              <Input
                id="oc-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Chief Product Officer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oc-linkedin">LinkedIn address</Label>
              <Input
                id="oc-linkedin"
                value={form.linkedin_url}
                onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                placeholder="https://www.linkedin.com/in/janedoe"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oc-email">Email</Label>
              <Input
                id="oc-email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="jane@company.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oc-notes">Notes</Label>
              <Textarea
                id="oc-notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="How you found them, shared connections, what to mention."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveContact} disabled={saving} className="bg-gradient-primary">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              {editingId ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
