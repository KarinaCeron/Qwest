
-- Revoke EXECUTE from anon/authenticated on SECURITY DEFINER functions.
-- Trigger functions run as table owner regardless of EXECUTE grants; the cron
-- job runs as postgres. No app code calls these via RPC.
REVOKE EXECUTE ON FUNCTION public.auto_move_stale_applications() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_status_changed_at() FROM PUBLIC, anon, authenticated;

-- Disable pg_graphql: the app uses PostgREST (supabase-js) only, so removing
-- the GraphQL surface eliminates schema exposure to anon and authenticated
-- roles without affecting any application query path.
DROP EXTENSION IF EXISTS pg_graphql CASCADE;

-- Remove always-true RLS policies on cv_rag. service_role bypasses RLS
-- entirely, so these permissive policies were no-ops that only widened the
-- attack surface to the public role.
DROP POLICY IF EXISTS "Service role can insert cv_rag" ON public.cv_rag;
DROP POLICY IF EXISTS "Service role can update cv_rag" ON public.cv_rag;
