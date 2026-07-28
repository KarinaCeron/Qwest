
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('manual','auto_override')),
  title TEXT,
  due_date DATE,
  auto_key TEXT,
  completed BOOLEAN NOT NULL DEFAULT false,
  deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT tasks_manual_title_chk CHECK (kind <> 'manual' OR (title IS NOT NULL AND length(title) > 0)),
  CONSTRAINT tasks_auto_key_chk CHECK (kind <> 'auto_override' OR auto_key IS NOT NULL)
);

CREATE UNIQUE INDEX tasks_user_auto_key_uniq
  ON public.tasks(user_id, auto_key)
  WHERE kind = 'auto_override';

CREATE INDEX tasks_user_id_idx ON public.tasks(user_id);
CREATE INDEX tasks_application_id_idx ON public.tasks(application_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tasks TO authenticated;
GRANT ALL ON public.tasks TO service_role;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
