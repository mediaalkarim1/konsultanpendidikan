-- MIGRATION: Ensure Public Access to Consultations & Answers for Form Submission

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultations TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultation_answers TO anon, authenticated, service_role;

ALTER TABLE public.consultations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_answers DISABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
