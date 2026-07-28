import { useEffect, useMemo, useState } from 'react';
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

type AutoTask = {
  kind: 'auto';
  id: string;
  applicationId: string;
  company: string;
  role: string;
  title: string;
  status: JobApplication['status'];
  createdAt: string;
};

type ManualTask = {
  kind: 'manual';
  id: string;
  title: string;
  dueDate?: string;
  createdAt: string;
  applicationId: string;
};

type Task = AutoTask | ManualTask;

const TASK_BY_STATUS: Partial<Record<JobApplication['status'], string>> = {
  submitted: 'Follow up on your application',
  'in-progress': 'Check in with the recruiter for an update',
  interview: 'Prepare for the HR interview',
  'technical-interview': 'Prepare for the technical interview',
  offer: 'Review and respond to the offer',
};

const STORAGE_KEY = 'qwest.completedTasks';
const MANUAL_KEY = 'qwest.manualTasks';
const DELETED_KEY = 'qwest.deletedAutoTasks';

const loadCompleted = (): Record<string, boolean> => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};

const loadManual = (): ManualTask[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(MANUAL_KEY) || '[]');
    // Drop legacy manual tasks that were not linked to a job application.
    return Array.isArray(raw)
      ? raw.filter((t: ManualTask) => t && typeof t.applicationId === 'string' && t.applicationId)
      : [];
  } catch {
    return [];
  }
};

const loadDeleted = (): Record<string, boolean> => {
  try {
    return JSON.parse(localStorage.getItem(DELETED_KEY) || '{}');
  } catch {
    return {};
  }
};

const Tasks = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [completed, setCompleted] = useState<Record<string, boolean>>(loadCompleted);
  const [showDone, setShowDone] = useState(false);
  const [manual, setManual] = useState<ManualTask[]>(loadManual);
  const [deleted, setDeleted] = useState<Record<string, boolean>>(loadDeleted);
  const [newTitle, setNewTitle] = useState('');
  const [newDue, setNewDue] = useState('');
  const [newAppId, setNewAppId] = useState('');

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setLoadingData(true);
      const apps = await jobApplicationStorage.getAll();
      setApplications(apps);
      setLoadingData(false);
    };
    load();
  }, [user]);

  const appById = useMemo(() => {
    const map: Record<string, JobApplication> = {};
    for (const a of applications) map[a.id] = a;
    return map;
  }, [applications]);

  const logAction = async (applicationId: string, content: string) => {
    if (!user) return;
    await supabase
      .from('application_actions')
      .insert({ application_id: applicationId, user_id: user.id, content });
  };

  const persistManual = (list: ManualTask[]) => {
    setManual(list);
    localStorage.setItem(MANUAL_KEY, JSON.stringify(list));
  };

  const addManual = () => {
    const title = newTitle.trim();
    if (!title || !newAppId) return;
    const task: ManualTask = {
      kind: 'manual',
      id: `manual:${crypto.randomUUID()}`,
      title,
      dueDate: newDue || undefined,
      createdAt: new Date().toISOString(),
      applicationId: newAppId,
    };
    persistManual([task, ...manual]);
    logAction(newAppId, `Task created: ${title}${newDue ? ` (due ${newDue})` : ''}`);
    setNewTitle('');
    setNewDue('');
    setNewAppId('');
  };

  const removeManual = (id: string) => {
    persistManual(manual.filter(t => t.id !== id));
  };

  const deleteTask = (task: Task) => {
    logAction(task.applicationId, `Task deleted: ${task.title}`);
    if (task.kind === 'manual') {
      removeManual(task.id);
      return;
    }
    setDeleted(prev => {
      const next = { ...prev, [task.id]: true };
      localStorage.setItem(DELETED_KEY, JSON.stringify(next));
      return next;
    });
  };

  const tasks = useMemo<Task[]>(() => {
    const auto: AutoTask[] = applications
      .filter(app => TASK_BY_STATUS[app.status])
      .map(
        app =>
          ({
            kind: 'auto' as const,
            id: `${app.id}:${app.status}`,
            applicationId: app.id,
            company: app.company,
            role: app.role,
            title: TASK_BY_STATUS[app.status]!,
            status: app.status,
            createdAt: app.createdAt,
          }) satisfies AutoTask,
      )
      .filter(task => !deleted[task.id]);
    // Only surface manual tasks whose linked application still exists.
    const linkedManual = manual.filter(t => appById[t.applicationId]);
    const dateOf = (t: Task) => (t.kind === 'manual' ? t.dueDate || t.createdAt : t.createdAt);
    return [...auto, ...linkedManual].sort(
      (a, b) => new Date(dateOf(b)).getTime() - new Date(dateOf(a)).getTime(),
    );
  }, [applications, manual, deleted, appById]);

  const visibleTasks = useMemo(
    () => tasks.filter(t => showDone || !completed[t.id]),
    [tasks, completed, showDone],
  );

  const toggle = (task: Task) => {
    const willBeDone = !completed[task.id];
    setCompleted(prev => {
      const next = { ...prev, [task.id]: willBeDone };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    if (willBeDone) {
      logAction(task.applicationId, `Task completed: ${task.title}`);
    }
  };

  const pendingCount = tasks.filter(t => !completed[t.id]).length;

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
          <Button variant="outline" onClick={() => setShowDone(v => !v)}>
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
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addManual()}
                className="flex-1"
              />
              <Input
                type="date"
                value={newDue}
                onChange={e => setNewDue(e.target.value)}
                className="sm:w-44"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={newAppId} onValueChange={setNewAppId}>
                <SelectTrigger className="flex-1">
                  <SelectValue
                    placeholder={
                      applications.length
                        ? 'Link to a job application'
                        : 'Create a job application first'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {applications.map(app => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.role} @ {app.company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            {visibleTasks.map(task => {
              const isDone = !!completed[task.id];
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
