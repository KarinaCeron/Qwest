-- Drop the insecure public policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Create a secure policy that only allows users to view their own profile
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- Optional: Create a policy to allow users to view only basic info of other profiles
-- This is commented out for maximum security, but you can uncomment if needed
-- CREATE POLICY "Users can view basic info of other profiles" 
-- ON public.profiles 
-- FOR SELECT 
-- USING (true)
-- WITH CHECK (
--   -- Only expose non-sensitive fields in a view instead
--   false
-- );