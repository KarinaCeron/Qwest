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
import { ExternalLink, ListChecks } from 'lucide-react';
import { getStatusConfig } from '@/utils/statusHelpers';

type Task = {
  id: string;
  applicationId: string;
  company: string;
  role: string;
  title: string;
  status: JobApplication['status'];
  createdAt: string;
};

const TASK_BY_STATUS: Partial<Record<JobApplication['status'], string>> = {
  submitted: 'Follow up on your application',
  'in-progress': 'Check in with the recruiter for an update',
  interview: 'Prepare for the HR interview',
  'technical-interview': 'Prepare for the technical interview',
  offer: 'Review and respond to the offer',
};

const STORAGE_KEY = 'qwest.completedTasks';

const loadCompleted = (): Record<string, boolean> => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
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

  const tasks = useMemo<Task[]>(() => {
    return applications
      .filter(app => TASK_BY_STATUS[app.status])
      .map(app => ({
        id: `${app.id}:${app.status}`,
        applicationId: app.id,
        company: app.company,
        role: app.role,
        title: TASK_BY_STATUS[app.status]!,
        status: app.status,
        createdAt: app.createdAt,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [applications]);

  const visibleTasks = useMemo(
    () => tasks.filter(t => showDone || !completed[t.id]),
    [tasks, completed, showDone],
  );

  const toggle = (id: string) => {
    setCompleted(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
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

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {loadingData ? (
          <p className="text-center text-muted-foreground py-12">Loading tasks...</p>
        ) : visibleTasks.length === 0 ? (
          <Card className="bg-gradient-card">
            <CardContent className="p-12 text-center">
              <ListChecks className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
              <p className="text-muted-foreground">
                Pending tasks are generated automatically from your active job applications.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {visibleTasks.map(task => {
              const isDone = !!completed[task.id];
              return (
                <Card key={task.id} className="bg-gradient-card">
                  <CardContent className="p-4 flex items-start gap-4">
                    <Checkbox
                      checked={isDone}
                      onCheckedChange={() => toggle(task.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`font-semibold ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </p>
                        <Badge variant="secondary">{getStatusConfig(task.status).label}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {task.role} @ {task.company}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Created {new Date(task.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/?open=${task.applicationId}`)}
                      title="Open application"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
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
