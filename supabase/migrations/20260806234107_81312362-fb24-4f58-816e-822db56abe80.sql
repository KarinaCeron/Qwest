CREATE TABLE public.company_research (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  company text NOT NULL,
  company_key text NOT NULL,
  website text,
  research_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_research TO authenticated;
GRANT ALL ON public.company_research TO service_role;

ALTER TABLE public.company_research ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own company research" ON public.company_research FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own company research" ON public.company_research FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own company research" ON public.company_research FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own company research" ON public.company_research FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_company_research_updated_at BEFORE UPDATE ON public.company_research FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();