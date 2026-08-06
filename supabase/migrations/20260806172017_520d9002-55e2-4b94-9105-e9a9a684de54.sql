ALTER TABLE public.compensation_items ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

UPDATE public.compensation_items c
SET sort_order = sub.row_num
FROM (
  SELECT id, (ROW_NUMBER() OVER (PARTITION BY user_id, kind ORDER BY created_at ASC))::int AS row_num
  FROM public.compensation_items
) sub
WHERE c.id = sub.id;