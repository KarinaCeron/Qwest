-- Backfill profiles for existing auth users that don't yet have a profile
INSERT INTO public.profiles (
  user_id,
  display_name,
  first_name,
  last_name,
  phone,
  location,
  linkedin_url,
  portfolio_url,
  bio
)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data ->> 'display_name', u.email),
  u.raw_user_meta_data ->> 'first_name',
  u.raw_user_meta_data ->> 'last_name',
  u.raw_user_meta_data ->> 'phone',
  u.raw_user_meta_data ->> 'location',
  u.raw_user_meta_data ->> 'linkedin_url',
  u.raw_user_meta_data ->> 'portfolio_url',
  u.raw_user_meta_data ->> 'bio'
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;