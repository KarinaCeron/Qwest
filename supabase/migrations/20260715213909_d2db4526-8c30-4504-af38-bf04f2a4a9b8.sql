ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS salary_currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS salary_period TEXT NOT NULL DEFAULT 'annual';