import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AppHeader } from '@/components/AppHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StarRating } from '@/components/StarRating';
import { TargetCompanyReport } from '@/components/TargetCompanyReport';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, Loader2, RefreshCw, Trash2, FileText, Target, MoreHorizontal, Send, Download, Archive, ArchiveRestore, Search, CheckCircle2, RotateCcw, Pencil } from 'lucide-react';
import * as XLSX from 'xlsx';

type TargetCompany = {
  id: string;
  company: string;
  website: string | null;
  role_title: string | null;
  job_description: string | null;
  score_stage: number | null;
  score_history: number | null;
  score_compensation: number | null;
  score_culture: number | null;
  score_path: number | null;
  confidence: Record<string, string> | null;
  verdicts: Record<string, string> | null;
  final_decision: string | null;
  analysis: string | null;
  evaluation: Record<string, any> | null;
  evaluated_at: string | null;
  archived: boolean;
  review_status: 'to_review' | 'reviewed' | string;
  created_at: string;
};

const CRITERIA = [
  { key: 'stage', column: 'score_stage', label: 'Current stage' },
  { key: 'history', column: 'score_history', label: 'History' },
  { key: 'compensation', column: 'score_compensation', label: 'Compensation' },
  { key: 'culture', column: 'score_culture', label: 'Culture & team' },
  { key: 'path', column: 'score_path', label: 'My path to next role' },
] as const;

const db = supabase as any;


const totalOf = (c: TargetCompany) =>
  CRITERIA.reduce((sum, cr) => sum + (Number(c[cr.column] ?? 0) || 0), 0);

const hasScores = (c: TargetCompany) =>
  CRITERIA.some((cr) => c[cr.column] !== null && c[cr.column] !== undefined);

export default function TargetCompaniesPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [items, setItems] = useState<TargetCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ company: '', website: '', role: '', jobDescription: '' });
  const [saving, setSaving] = useState(false);
  const [evaluatingId, setEvaluatingId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TargetCompany | null>(null);
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const [search, setSearch] = useState('');
  const [reviewFilter, setReviewFilter] = useState<'all' | 'to_review' | 'reviewed'>('all');

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadItems = async () => {
    setIsLoading(true);
    const { data, error } = await db
      .from('target_companies')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setItems((data ?? []) as TargetCompany[]);
    }
    setIsLoading(false);
  };

  const evaluate = async (row: TargetCompany) => {
    setEvaluatingId(row.id);
    try {
      const { data, error } = await supabase.functions.invoke('evaluate-target-company', {
        body: {
          company: row.company,
          website: row.website ?? undefined,
          role: row.role_title ?? undefined,
          jobDescription: row.job_description ?? undefined,
        },
      });
      if (error) throw error;
      if (typeof data?.text !== 'string' || !data.text.trim()) {
        throw new Error('The evaluation webhook returned an empty response.');
      }
      const scores = data.scores ?? {};
      const update = {
        score_stage: scores.stage ?? null,
        score_history: scores.history ?? null,
        score_compensation: scores.compensation ?? null,
        score_culture: scores.culture ?? null,
        score_path: scores.path ?? null,
        confidence: data.confidence ?? {},
        verdicts: data.verdicts ?? {},
        final_decision: data.decision ?? null,
        analysis: data.text,
        evaluation: data.evaluation ?? null,
        evaluated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error: upErr } = await db.from('target_companies').update(update).eq('id', row.id);
      if (upErr) throw upErr;

      setItems((prev) => prev.map((i) => (i.id === row.id ? { ...i, ...update } as TargetCompany : i)));
      toast({ title: 'Evaluation ready', description: `${row.company} was scored.` });
    } catch (e) {
      toast({
        title: 'Error',
        description: e instanceof Error ? e.message : 'Could not evaluate this company.',
        variant: 'destructive',
      });
    } finally {
      setEvaluatingId(null);
    }
  };

  const openAddDialog = () => {
    setEditingId(null);
    setForm({ company: '', website: '', role: '', jobDescription: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (row: TargetCompany) => {
    setEditingId(row.id);
    setForm({
      company: row.company,
      website: row.website ?? '',
      role: row.role_title ?? '',
      jobDescription: row.job_description ?? '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const company = form.company.trim();
    if (!company) {
      toast({ title: 'Company required', description: 'Enter a company name.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        company,
        website: form.website.trim() || null,
        role_title: form.role.trim() || null,
        job_description: form.jobDescription.trim() || null,
      };

      if (editingId) {
        const { error } = await db
          .from('target_companies')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editingId);
        if (error) throw error;
        setItems((prev) => prev.map((i) => (i.id === editingId ? { ...i, ...payload } : i)));
        setDialogOpen(false);
        setEditingId(null);
        setForm({ company: '', website: '', role: '', jobDescription: '' });
        toast({ title: 'Saved', description: `${company} was updated.` });
        return;
      }

      const { data, error } = await db
        .from('target_companies')
        .insert({ user_id: user!.id, ...payload })
        .select()
        .single();
      if (error) throw error;
      const row = data as TargetCompany;
      setItems((prev) => [row, ...prev]);
      setForm({ company: '', website: '', role: '', jobDescription: '' });
      setDialogOpen(false);
      evaluate(row);
    } catch (e) {
      toast({
        title: 'Error',
        description:
          e instanceof Error ? e.message : editingId ? 'Could not save the changes.' : 'Could not add the company.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };


  const handleSetArchived = async (row: TargetCompany, archived: boolean) => {
    const { error } = await db.from('target_companies').update({ archived }).eq('id', row.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === row.id ? { ...i, archived } : i)));
    toast({
      title: archived ? 'Archived' : 'Restored',
      description: archived
        ? `${row.company} was moved to Archived.`
        : `${row.company} is active again.`,
    });
  };

  const handleDelete = async (row: TargetCompany) => {
    const { error } = await db.from('target_companies').delete().eq('id', row.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== row.id));
    toast({ title: 'Removed', description: `${row.company} is no longer a target company.` });
  };

  const handleSetReviewStatus = async (row: TargetCompany, review_status: 'to_review' | 'reviewed') => {
    const { error } = await db.from('target_companies').update({ review_status }).eq('id', row.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setItems((prev) => prev.map((i) => (i.id === row.id ? { ...i, review_status } : i)));
    toast({
      title: review_status === 'reviewed' ? 'Marked as reviewed' : 'Moved to To review',
      description: `${row.company} is now ${review_status === 'reviewed' ? 'reviewed' : 'pending review'}.`,
    });
  };

  const activeItems = items.filter((i) => !i.archived);
  const archivedItems = items.filter((i) => i.archived);
  const toReviewCount = activeItems.filter((i) => i.review_status !== 'reviewed').length;
  const reviewedCount = activeItems.filter((i) => i.review_status === 'reviewed').length;
  const tabItems = tab === 'active' ? activeItems : archivedItems;
  const visibleItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tabItems.filter((i) => {
      if (tab === 'active' && reviewFilter !== 'all') {
        const status = i.review_status === 'reviewed' ? 'reviewed' : 'to_review';
        if (status !== reviewFilter) return false;
      }
      if (!q) return true;
      return (
        i.company.toLowerCase().includes(q) ||
        (i.role_title ?? '').toLowerCase().includes(q)
      );
    });
  }, [tabItems, search, reviewFilter, tab]);

  const exportToExcel = () => {
    const rows = activeItems.map((c) => {
      const row: Record<string, string | number> = { Company: c.company };
      CRITERIA.forEach((cr) => {
        const v = c[cr.column];
        row[cr.label] = v === null || v === undefined ? '' : Number(v);
      });
      row.Total = totalOf(c);
      return row;
    });
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Target companies');
    XLSX.writeFile(book, `target-companies-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        subtitle="My Target Companies"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={exportToExcel} disabled={activeItems.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export to Excel
            </Button>
            <Button onClick={openAddDialog} className="bg-gradient-primary">
              <Plus className="mr-2 h-4 w-4" />
              Add company
            </Button>
          </div>
        }
      />


      <main className="container mx-auto px-4 py-8">
        <Tabs value={tab} onValueChange={(v) => setTab(v as 'active' | 'archived')}>
          <TabsList className="mb-4">
            <TabsTrigger value="active">Active ({activeItems.length})</TabsTrigger>
            <TabsTrigger value="archived">Archived ({archivedItems.length})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company or role…"
              className="pl-9"
              aria-label="Search target companies"
            />
          </div>
          {tab === 'active' && (
            <div className="flex items-center gap-1 rounded-md border bg-muted/40 p-1">
              {([
                { key: 'all', label: `All (${activeItems.length})` },
                { key: 'to_review', label: `To review (${toReviewCount})` },
                { key: 'reviewed', label: `Reviewed (${reviewedCount})` },
              ] as const).map((opt) => (
                <Button
                  key={opt.key}
                  size="sm"
                  variant={reviewFilter === opt.key ? 'default' : 'ghost'}
                  className="h-8"
                  onClick={() => setReviewFilter(opt.key)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          )}
        </div>
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 p-12 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading your target companies…
              </div>
            ) : visibleItems.length === 0 && (search.trim() || (tab === 'active' && reviewFilter !== 'all')) ? (
              <div className="flex flex-col items-center gap-3 p-12 text-center">
                <Search className="h-10 w-10 text-muted-foreground" />
                <p className="text-muted-foreground">No companies match your search.</p>
              </div>
            ) : visibleItems.length === 0 ? (
              <div className="flex flex-col items-center gap-3 p-12 text-center">
                {tab === 'active' ? (
                  <>
                    <Target className="h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No target companies yet. Add one and it will be scored automatically.
                    </p>
                    <Button onClick={openAddDialog} className="bg-gradient-primary">
                      <Plus className="mr-2 h-4 w-4" />
                      Add company
                    </Button>
                  </>
                ) : (
                  <>
                    <Archive className="h-10 w-10 text-muted-foreground" />
                    <p className="text-muted-foreground">No archived companies yet.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Company</TableHead>
                      {CRITERIA.map((c) => (
                        <TableHead key={c.key} className="text-center">{c.label}</TableHead>
                      ))}
                      <TableHead className="text-center">Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleItems.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-foreground">{row.company}</span>
                            {!row.archived && (
                              <Badge
                                variant="outline"
                                className={
                                  row.review_status === 'reviewed'
                                    ? 'border-green-500/40 text-green-600 dark:text-green-400'
                                    : 'border-amber-500/40 text-amber-600 dark:text-amber-400'
                                }
                              >
                                {row.review_status === 'reviewed' ? 'Reviewed' : 'To review'}
                              </Badge>
                            )}
                          </div>
                          {row.role_title && (
                            <div className="text-xs text-muted-foreground">{row.role_title}</div>
                          )}
                          {row.final_decision && (
                            <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                              {row.final_decision}
                            </div>
                          )}
                        </TableCell>
                        {CRITERIA.map((c) => {
                          const score = row[c.column] as number | null;
                          return (
                            <TableCell key={c.key} className="text-center">
                              <StarRating score={score} />
                              {row.confidence?.[c.key] && (
                                <div className="mt-1 text-[11px] text-muted-foreground">
                                  {row.confidence[c.key]}
                                </div>
                              )}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-center font-semibold">
                          {hasScores(row) ? `${totalOf(row)}/25` : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={evaluatingId === row.id}
                                aria-label={`Actions for ${row.company}`}
                              >
                                {evaluatingId === row.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MoreHorizontal className="h-4 w-4" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                disabled={!row.analysis}
                                onClick={() => setDetail(row)}
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                View insights
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEditDialog(row)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit details
                              </DropdownMenuItem>
                              {!row.archived && (
                                <>
                                  {row.review_status === 'reviewed' ? (
                                    <DropdownMenuItem onClick={() => handleSetReviewStatus(row, 'to_review')}>
                                      <RotateCcw className="mr-2 h-4 w-4" />
                                      Move back to To review
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem onClick={() => handleSetReviewStatus(row, 'reviewed')}>
                                      <CheckCircle2 className="mr-2 h-4 w-4" />
                                      Mark as reviewed
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem
                                    onClick={() => navigate(`/target-companies/${row.id}/outreach`)}
                                  >
                                    <Send className="mr-2 h-4 w-4" />
                                    Prepare outreach
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    disabled={evaluatingId === row.id}
                                    onClick={() => evaluate(row)}
                                  >
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Update evaluation
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleSetArchived(row, true)}>
                                    <Archive className="mr-2 h-4 w-4" />
                                    Archive
                                  </DropdownMenuItem>
                                </>
                              )}
                              {row.archived && (
                                <DropdownMenuItem onClick={() => handleSetArchived(row, false)}>
                                  <ArchiveRestore className="mr-2 h-4 w-4" />
                                  Restore
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => handleDelete(row)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingId(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit target company' : 'Add a target company'}</DialogTitle>
            <DialogDescription>
              {editingId
                ? 'Update the company details. Scores stay as they are until you run Update evaluation.'
                : 'The company is evaluated with the same research webhook and scored from 0 to 5 on the five criteria.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tc-company">Company *</Label>
              <Input
                id="tc-company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="Acme Corp"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tc-website">Website</Label>
              <Input
                id="tc-website"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://acme.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tc-role">Role you are targeting</Label>
              <Input
                id="tc-role"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                placeholder="Senior Product Manager"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tc-jd">Job description (optional)</Label>
              <Textarea
                id="tc-jd"
                rows={5}
                value={form.jobDescription}
                onChange={(e) => setForm({ ...form, jobDescription: e.target.value })}
                placeholder="Paste the job description to get a sharper score on compensation and career path."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              {editingId ? 'Save changes' : 'Add & evaluate'}
            </Button>

          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={detail !== null} onOpenChange={(open) => !open && setDetail(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>{detail?.company} — evaluation</SheetTitle>
            <SheetDescription>
              {detail?.evaluated_at
                ? `Evaluated on ${new Date(detail.evaluated_at).toLocaleString()}`
                : 'Not evaluated yet'}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {detail && (
              <TargetCompanyReport evaluation={detail.evaluation} analysis={detail.analysis} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
