ALTER TABLE public.cv_rag ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable RLS
ALTER TABLE public.cv_rag ENABLE ROW LEVEL SECURITY;

-- Users can view their own cv_rag entries
CREATE POLICY "Users can view their own cv_rag" ON public.cv_rag FOR SELECT USING (auth.uid() = user_id);

-- Users can delete their own cv_rag entries
CREATE POLICY "Users can delete their own cv_rag" ON public.cv_rag FOR DELETE USING (auth.uid() = user_id);

-- Allow service role inserts (n8n uses service role via webhook)
CREATE POLICY "Service role can insert cv_rag" ON public.cv_rag FOR INSERT WITH CHECK (true);

-- Allow service role updates
CREATE POLICY "Service role can update cv_rag" ON public.cv_rag FOR UPDATE USING (true);