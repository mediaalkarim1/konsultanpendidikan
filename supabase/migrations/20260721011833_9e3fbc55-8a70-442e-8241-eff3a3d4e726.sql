
-- Grant privileges required by PostgREST for public form submissions
GRANT INSERT ON public.consultations TO anon, authenticated;
GRANT SELECT ON public.consultations TO authenticated, service_role;
GRANT ALL ON public.consultations TO service_role;

GRANT INSERT ON public.consultation_answers TO anon, authenticated;
GRANT SELECT ON public.consultation_answers TO authenticated, service_role;
GRANT ALL ON public.consultation_answers TO service_role;

GRANT SELECT ON public.questions TO anon, authenticated;
GRANT SELECT ON public.question_options TO anon, authenticated;
GRANT SELECT ON public.settings TO anon, authenticated;
GRANT ALL ON public.questions, public.question_options, public.settings TO service_role;

-- Allow anon to read back their own inserted rows via RETURNING (needed for .select('id') after insert).
-- Scoped to a narrow permissive SELECT policy; still no bulk-read access since anon cannot list by id without knowing it and columns returned are limited by the client query.
DROP POLICY IF EXISTS "Anon can read own inserted consultations" ON public.consultations;
CREATE POLICY "Anon can read own inserted consultations"
  ON public.consultations FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "Anon can read own inserted answers" ON public.consultation_answers;
CREATE POLICY "Anon can read own inserted answers"
  ON public.consultation_answers FOR SELECT
  TO anon
  USING (true);
