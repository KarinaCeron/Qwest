
ALTER TABLE public.job_applications
ADD COLUMN IF NOT EXISTS status_changed_at timestamp with time zone NOT NULL DEFAULT now();

UPDATE public.job_applications SET status_changed_at = COALESCE(updated_at, created_at) WHERE status_changed_at IS NULL OR status_changed_at = now();

CREATE OR REPLACE FUNCTION public.update_status_changed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.status_changed_at = now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_applications_status_changed_at ON public.job_applications;
CREATE TRIGGER trg_job_applications_status_changed_at
BEFORE UPDATE ON public.job_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_status_changed_at();
