ALTER TABLE public.job_applications
ADD COLUMN IF NOT EXISTS hiring_manager_name TEXT,
ADD COLUMN IF NOT EXISTS hiring_manager_linkedin TEXT;

CREATE TABLE public.cv_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  description TEXT,
  size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cv_documents TO authenticated;
GRANT ALL ON public.cv_documents TO service_role;

ALTER TABLE public.cv_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cv documents" ON public.cv_documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own cv documents" ON public.cv_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own cv documents" ON public.cv_documents FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own cv documents" ON public.cv_documents FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_cv_documents_updated_at BEFORE UPDATE ON public.cv_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.compensation_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  kind TEXT NOT NULL DEFAULT 'salary',
  label TEXT NOT NULL,
  value TEXT,
  currency TEXT NOT NULL DEFAULT 'USD',
  period TEXT NOT NULL DEFAULT 'annual',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT compensation_items_kind_check CHECK (kind IN ('salary', 'benefit'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compensation_items TO authenticated;
GRANT ALL ON public.compensation_items TO service_role;

ALTER TABLE public.compensation_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own compensation items" ON public.compensation_items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own compensation items" ON public.compensation_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own compensation items" ON public.compensation_items FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own compensation items" ON public.compensation_items FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_compensation_items_updated_at BEFORE UPDATE ON public.compensation_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();