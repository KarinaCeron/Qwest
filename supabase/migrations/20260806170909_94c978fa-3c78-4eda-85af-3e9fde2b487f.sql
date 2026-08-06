ALTER TABLE public.compensation_items ADD COLUMN IF NOT EXISTS required boolean NOT NULL DEFAULT false;
