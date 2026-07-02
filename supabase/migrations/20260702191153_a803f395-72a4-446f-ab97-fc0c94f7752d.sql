
-- Update CHECK constraint to allow new status values
ALTER TABLE public.job_applications DROP CONSTRAINT IF EXISTS job_applications_status_check;

ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_status_check
  CHECK (status IN ('submitted', 'applied', 'in-progress', 'interview', 'technical-interview', 'offer', 'rejected', 'no-response'));

-- Rename existing 'applied' -> 'submitted'
UPDATE public.job_applications SET status = 'submitted' WHERE status = 'applied';

-- Tighten constraint to remove legacy 'applied' now that data is migrated
ALTER TABLE public.job_applications DROP CONSTRAINT job_applications_status_check;
ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_status_check
  CHECK (status IN ('submitted', 'in-progress', 'interview', 'technical-interview', 'offer', 'rejected', 'no-response'));

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications"
  ON public.notifications FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx
  ON public.notifications(user_id, created_at DESC);

-- Auto-move function
CREATE OR REPLACE FUNCTION public.auto_move_stale_applications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT user_id,
           jsonb_agg(jsonb_build_object(
             'id', id,
             'company', company,
             'role', role,
             'status_changed_at', status_changed_at
           ) ORDER BY status_changed_at) AS apps,
           array_agg(id) AS ids
    FROM public.job_applications
    WHERE status NOT IN ('no-response', 'rejected', 'offer')
      AND status_changed_at < (now() - interval '1 month')
    GROUP BY user_id
  LOOP
    UPDATE public.job_applications
    SET status = 'no-response'
    WHERE id = ANY(rec.ids);

    INSERT INTO public.notifications (user_id, title, message, data)
    VALUES (
      rec.user_id,
      'Applications moved to No Response',
      format('%s job application(s) had no status change for over a month and were moved to No Response.', jsonb_array_length(rec.apps)),
      jsonb_build_object('applications', rec.apps)
    );
  END LOOP;
END;
$$;

-- Extensions + schedule (daily 03:00 UTC)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'auto-move-stale-applications') THEN
    PERFORM cron.unschedule('auto-move-stale-applications');
  END IF;
END $$;

SELECT cron.schedule(
  'auto-move-stale-applications',
  '0 3 * * *',
  $CRON$ SELECT public.auto_move_stale_applications(); $CRON$
);
