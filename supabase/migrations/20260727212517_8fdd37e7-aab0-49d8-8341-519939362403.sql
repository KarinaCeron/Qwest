
CREATE TABLE public.application_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.application_actions TO authenticated;
GRANT ALL ON public.application_actions TO service_role;

ALTER TABLE public.application_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own application actions"
  ON public.application_actions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own application actions"
  ON public.application_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own application actions"
  ON public.application_actions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own application actions"
  ON public.application_actions FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX idx_application_actions_application_id ON public.application_actions(application_id, created_at DESC);
