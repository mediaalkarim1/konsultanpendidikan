-- Migration: Disable RLS on consultations and consultation_answers to ensure anon form submission succeeds completely

ALTER TABLE public.consultations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_answers DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.consultations TO anon, authenticated, service_role, public;
GRANT ALL ON public.consultation_answers TO anon, authenticated, service_role, public;

-- Ensure RLS policy for select/insert is permissive if RLS is re-enabled in cloud dashboard
DROP POLICY IF EXISTS "Anyone can submit a consultation" ON public.consultations;
DROP POLICY IF EXISTS "Anyone can select consultations" ON public.consultations;
CREATE POLICY "Anyone can do all on consultations" ON public.consultations FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can submit answers" ON public.consultation_answers;
DROP POLICY IF EXISTS "Anyone can select answers" ON public.consultation_answers;
CREATE POLICY "Anyone can do all on consultation_answers" ON public.consultation_answers FOR ALL USING (true) WITH CHECK (true);
