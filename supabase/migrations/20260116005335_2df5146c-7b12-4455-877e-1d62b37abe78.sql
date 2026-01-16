-- Drop existing UPDATE policy that may be causing recursion
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Recreate UPDATE policy without recursion
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);