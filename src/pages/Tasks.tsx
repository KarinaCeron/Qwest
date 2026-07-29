import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { jobApplicationStorage } from '@/lib/storage';
import { JobApplication } from '@/types/jobApplication';
import { AppHeader } from '@/components/AppHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { ExternalLink, ListChecks, Plus, Trash2, ChevronsUpDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getStatusConfig } from '@/utils/statusHelpers';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type ManualTaskRow = {
  id: string;
  kind: 'manual';
  application_id: string | null;
  title: string;
  due_date: string | null;
  completed: boolean;
  created_at: string;
};

type AutoOverrideRow = {
  id: string;
  kind: 'auto_override';
  application_id: string;
  auto_key: string;
  completed: boolean;
  deleted: boolean;
};

type AutoTask = {
  kind: 'auto';
  id: string; // auto_key
  applicationId: string;
  company: string;
  role: string;
  title: string;
  status: JobApplication['status'];
  createdAt: string;
  completed: boolean;
};

type ManualTask = {
  kind: 'manual';
  id: string;
  applicationId: string | null;
  title: string;
  dueDate?: string;
  createdAt: string;
  completed: boolean;
};

type Task = AutoTask | ManualTask;

const TASK_BY_STATUS: Partial<Record<JobApplication['status'], string>> = {
  submitted: 'Follow up on your application',
  'in-progress': 'Check in with the recruiter for an update',
  interview: 'Prepare for the HR interview',
  'technical-interview': 'Prepare for the technical interview',
  offer: 'Review and respond to the offer',
};

const Tasks = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [manualRows, setManualRows] = useState<ManualTaskRow[]>([]);
  const [autoOverrides, setAutoOverrides] = useState<AutoOverrideRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showDone, setShowDone] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDue, setNewDue] = useState('');
  const [newAppId, setNewAppId] = useState('');
  const [appOpen, setAppOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  const loadTasks = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('tasks')
      .select('id, kind, application_id, title, due_date, auto_key, completed, deleted, created_at')
      .eq('user_id', user.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    const manual: ManualTaskRow[] = [];
    const overrides: AutoOverrideRow[] = [];
    for (const row of data || []) {
      if (row.kind === 'manual') {
        manual.push({
          id: row.id,
          kind: 'manual',
          application_id: row.application_id,
          title: row.title || '',
          due_date: row.due_date,
          completed: row.completed,
          created_at: row.created_at,
        });
      } else if (row.kind === 'auto_override') {
        overrides.push({
          id: row.id,
          kind: 'auto_override',
          application_id: row.application_id,
          auto_key: row.auto_key!,
          completed: row.completed,
          deleted: row.deleted,
        });
      }
    }
    setManualRows(manual);
    setAutoOverrides(overrides);
  }, [user, toast]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoadingData(true);
      const apps = await jobApplicationStorage.getAll();
      setApplications(apps);
      await loadTasks();
      setLoadingData(false);
    };
    load();
  }, [user, loadTasks]);

  const appById = useMemo(() => {
    const map: Record<string, JobApplication> = {};
    for (const a of applications) map[a.id] = a;
    return map;
  }, [applications]);

  const logAction = async (applicationId: string | null, content: string) => {
    if (!user || !applicationId) return;
    await supabase
      .from('application_actions')
      .insert({ application_id: applicationId, user_id: user.id, content });
  };

  const addManual = async () => {
    if (!user) return;
    const title = newTitle.trim();
    if (!title) return;
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: user.id,
        application_id: newAppId || null,
        kind: 'manual',
        title,
        due_date: newDue || null,
      })
      .select('id, kind, application_id, title, due_date, completed, created_at')
      .single();
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setManualRows((prev) => [
      {
        id: data.id,
        kind: 'manual',
        application_id: data.application_id,
        title: data.title || '',
        due_date: data.due_date,
        completed: data.completed,
        created_at: data.created_at,
      },
      ...prev,
    ]);
    if (newAppId) {
      logAction(newAppId, `Task created: ${title}${newDue ? ` (due ${newDue})` : ''}`);
    }
    setNewTitle('');
    setNewDue('');
    setNewAppId('');
  };

  const overrideByKey = useMemo(() => {
    const map: Record<string, AutoOverrideRow> = {};
    for (const o of autoOverrides) map[o.auto_key] = o;
    return map;
  }, [autoOverrides]);

  const upsertAutoOverride = async (
    autoKey: string,
    applicationId: string,
    patch: { completed?: boolean; deleted?: boolean },
  ) => {
    if (!user) return;
    const existing = overrideByKey[autoKey];
    if (existing) {
      const next = { ...existing, ...patch };
      const prev = autoOverrides;
      setAutoOverrides((a) => a.map((o) => (o.id === existing.id ? next : o)));
      const { error } = await supabase
        .from('tasks')
        .update(patch)
        .eq('id', existing.id);
      if (error) {
        setAutoOverrides(prev);
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } else {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          application_id: applicationId,
          kind: 'auto_override',
          auto_key: autoKey,
          completed: patch.completed ?? false,
          deleted: patch.deleted ?? false,
        })
        .select('id, kind, application_id, auto_key, completed, deleted')
        .single();
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }
      setAutoOverrides((a) => [
        ...a,
        {
          id: data.id,
          kind: 'auto_override',
          application_id: data.application_id,
          auto_key: data.auto_key!,
          completed: data.completed,
          deleted: data.deleted,
        },
      ]);
    }
  };

  const deleteTask = async (task: Task) => {
    logAction(task.applicationId, `Task deleted: ${task.title}`);
    if (task.kind === 'manual') {
      const prev = manualRows;
      setManualRows((r) => r.filter((x) => x.id !== task.id));
      const { error } = await supabase.from('tasks').delete().eq('id', task.id);
      if (error) {
        setManualRows(prev);
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
      return;
    }
    await upsertAutoOverride(task.id, task.applicationId, { deleted: true });
  };

  const toggle = async (task: Task) => {
    const willBeDone = !task.completed;
    if (task.kind === 'manual') {
      const prev = manualRows;
      setManualRows((r) => r.map((x) => (x.id === task.id ? { ...x, completed: willBeDone } : x)));
      const { error } = await supabase
        .from('tasks')
        .update({ completed: willBeDone })
        .eq('id', task.id);
      if (error) {
        setManualRows(prev);
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }
    } else {
      await upsertAutoOverride(task.id, task.applicationId, { completed: willBeDone });
    }
    if (willBeDone) {
      logAction(task.applicationId, `Task completed: ${task.title}`);
    }
  };

  const tasks = useMemo<Task[]>(() => {
    const auto: AutoTask[] = applications
      .filter((app) => TASK_BY_STATUS[app.status])
      .map((app) => {
        const key = `${app.id}:${app.status}`;
        return {
          kind: 'auto' as const,
          id: key,
          applicationId: app.id,
          company: app.company,
          role: app.role,
          title: TASK_BY_STATUS[app.status]!,
          status: app.status,
          createdAt: app.createdAt,
          completed: !!overrideByKey[key]?.completed,
        };
      })
      .filter((task) => !overrideByKey[task.id]?.deleted);

    const manualTasks: ManualTask[] = manualRows
      .filter((t) => appById[t.application_id])
      .map((t) => ({
        kind: 'manual',
        id: t.id,
        applicationId: t.application_id,
        title: t.title,
        dueDate: t.due_date || undefined,
        createdAt: t.created_at,
        completed: t.completed,
      }));

    const dateOf = (t: Task) =>
      t.kind === 'manual' ? t.dueDate || t.createdAt : t.createdAt;

    return [...auto, ...manualTasks].sort(
      (a, b) => new Date(dateOf(b)).getTime() - new Date(dateOf(a)).getTime(),
    );
  }, [applications, manualRows, overrideByKey, appById]);

  const visibleTasks = useMemo(
    () => tasks.filter((t) => showDone || !t.completed),
    [tasks, showDone],
  );

  const pendingCount = tasks.filter((t) => !t.completed).length;

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        subtitle={`${pendingCount} pending task${pendingCount === 1 ? '' : 's'}`}
        actions={
          <Button variant="outline" onClick={() => setShowDone((v) => !v)}>
            {showDone ? 'Hide completed' : 'Show completed'}
          </Button>
        }
      />

      <main className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
        <Card className="bg-gradient-card">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm font-semibold">Add a task</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="What do you need to do?"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addManual()}
                className="flex-1"
              />
              <Input
                type="date"
                value={newDue}
                onChange={(e) => setNewDue(e.target.value)}
                className="sm:w-44"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Popover open={appOpen} onOpenChange={setAppOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={appOpen}
                    disabled={!applications.length}
                    className="flex-1 justify-between font-normal"
                  >
                    <span className={cn('truncate', !newAppId && 'text-muted-foreground')}>
                      {newAppId && appById[newAppId]
                        ? `${appById[newAppId].role} @ ${appById[newAppId].company}`
                        : applications.length
                          ? 'Link to a job application'
                          : 'Create a job application first'}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command
                    filter={(value, search) =>
                      value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
                    }
                  >
                    <CommandInput placeholder="Search job application..." />
                    <CommandList>
                      <CommandEmpty>No application found.</CommandEmpty>
                      <CommandGroup>
                        {applications.map((app) => (
                          <CommandItem
                            key={app.id}
                            value={`${app.role} @ ${app.company}`}
                            onSelect={() => {
                              setNewAppId(app.id);
                              setAppOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                'mr-2 h-4 w-4',
                                newAppId === app.id ? 'opacity-100' : 'opacity-0',
                              )}
                            />
                            {app.role} @ {app.company}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button
                onClick={addManual}
                disabled={!newTitle.trim() || !newAppId}
                className="sm:w-32"
              >
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Every task must be linked to a job application.
            </p>
          </CardContent>
        </Card>

        {loadingData ? (
          <p className="text-center text-muted-foreground py-12">Loading tasks...</p>
        ) : visibleTasks.length === 0 ? (
          <Card className="bg-gradient-card">
            <CardContent className="p-12 text-center">
              <ListChecks className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
              <p className="text-muted-foreground">
                Add a manual task above, or tasks will be generated automatically from your active job applications.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {visibleTasks.map((task) => {
              const isDone = task.completed;
              const linkedApp =
                task.kind === 'auto'
                  ? { company: task.company, role: task.role, id: task.applicationId }
                  : appById[task.applicationId];
              return (
                <Card key={task.id} className="bg-gradient-card">
                  <CardContent className="p-4 flex items-start gap-4">
                    <Checkbox
                      checked={isDone}
                      onCheckedChange={() => toggle(task)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-semibold ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </p>
                        {task.kind === 'auto' ? (
                          <Badge variant="secondary">{getStatusConfig(task.status).label}</Badge>
                        ) : (
                          <Badge variant="outline">Manual</Badge>
                        )}
                      </div>
                      {linkedApp && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {linkedApp.role} @ {linkedApp.company}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {task.kind === 'manual' && task.dueDate
                          ? `Due ${new Date(`${task.dueDate}T00:00:00`).toLocaleDateString()}`
                          : `Created ${new Date(task.createdAt).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {linkedApp && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/?open=${linkedApp.id}`)}
                          title="Open application"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteTask(task)}
                        title="Delete task"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Tasks;
