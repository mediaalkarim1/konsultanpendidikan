-- MIGRATION: Grant full public (anon, authenticated, service_role) access on all EduKonsul tables
-- Disables RLS and grants SELECT, INSERT, UPDATE, DELETE on consultations, consultation_answers, consultation_analysis, questions, question_options, settings.

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;

ALTER TABLE public.consultations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='consultation_analysis') THEN
        ALTER TABLE public.consultation_analysis DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

GRANT ALL ON public.consultations TO anon, authenticated, service_role;
GRANT ALL ON public.consultation_answers TO anon, authenticated, service_role;
GRANT ALL ON public.consultation_analysis TO anon, authenticated, service_role;
GRANT ALL ON public.questions TO anon, authenticated, service_role;
GRANT ALL ON public.question_options TO anon, authenticated, service_role;
GRANT ALL ON public.settings TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Admin & Service Role full access on consultation_analysis" ON public.consultation_analysis;
DROP POLICY IF EXISTS "Admins manage consultation analysis" ON public.consultation_analysis;

NOTIFY pgrst, 'reload schema';
