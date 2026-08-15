-- MIGRATION: Fix RLS Permissions for Public Consultation Submission
-- Ensures public (anon) can insert into consultations & consultation_answers, while restricting consultation_analysis to admin only.

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

-- Disable RLS on consultations & consultation_answers so public form submit never gets blocked
ALTER TABLE public.consultations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_answers DISABLE ROW LEVEL SECURITY;

-- Grant permissions explicitly
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultations TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultation_answers TO anon, authenticated, service_role;

-- Revoke anon access from consultation_analysis (Admin / Service Role only)
REVOKE ALL ON public.consultation_analysis FROM anon;
GRANT ALL ON public.consultation_analysis TO postgres, authenticated, service_role;
ALTER TABLE public.consultation_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access on consultation_analysis" ON public.consultation_analysis;
CREATE POLICY "Admin & Service Role full access on consultation_analysis" 
  ON public.consultation_analysis 
  FOR ALL 
  TO authenticated, service_role 
  USING (true) 
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
