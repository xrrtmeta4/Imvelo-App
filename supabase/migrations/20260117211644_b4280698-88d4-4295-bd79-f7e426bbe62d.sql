-- Fix infinite recursion between profiles <-> pest_reports policies
-- The pest_reports extension-officer policy previously queried profiles directly,
-- while profiles had a policy that queried pest_reports, creating a recursion loop.

DROP POLICY IF EXISTS "Extension officers can view all reports" ON public.pest_reports;

CREATE POLICY "Extension officers can view all reports"
ON public.pest_reports
FOR SELECT
TO public
USING (public.is_extension_officer(auth.uid()));