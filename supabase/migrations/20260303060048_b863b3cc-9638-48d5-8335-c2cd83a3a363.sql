
-- Drop the old signature
DROP FUNCTION IF EXISTS public.match_documents(integer, vector, jsonb);

-- Recreate with the correct signature including p_user_id
CREATE OR REPLACE FUNCTION public.match_documents(
  query_embedding vector,
  match_count integer,
  filter jsonb DEFAULT '{}'::jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS TABLE(id uuid, content text, similarity double precision)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    docs.id,
    docs.content,
    1 - (docs.embedding <=> query_embedding) AS similarity
  FROM cv_rag docs
  WHERE docs.metadata @> filter
    AND (p_user_id IS NULL OR docs.user_id = p_user_id)
  ORDER BY docs.embedding <=> query_embedding
  LIMIT match_count;
$$;
