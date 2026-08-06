ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_roles text[] NOT NULL DEFAULT '{}'::text[];