-- MIGRATION: Restore Table Grants & Fix System RLS for EduKonsul Flow (Standard Lovable UUID Format)

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultations TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultation_answers TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultation_analysis TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questions TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.question_options TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Admins manage consultations" ON public.consultations;
DROP POLICY IF EXISTS "Admins manage consultation answers" ON public.consultation_answers;
DROP POLICY IF EXISTS "Admins manage consultation analysis" ON public.consultation_analysis;
DROP POLICY IF EXISTS "Admin full consultations" ON public.consultations;
DROP POLICY IF EXISTS "Admin full consultation_answers" ON public.consultation_answers;
DROP POLICY IF EXISTS "Admin full consultation_analysis" ON public.consultation_analysis;
DROP POLICY IF EXISTS "Public insert consultations" ON public.consultations;
DROP POLICY IF EXISTS "Public select consultations" ON public.consultations;
DROP POLICY IF EXISTS "Public full consultations" ON public.consultations;
DROP POLICY IF EXISTS "Public full consultation_answers" ON public.consultation_answers;
DROP POLICY IF EXISTS "Public full consultation_analysis" ON public.consultation_analysis;

ALTER TABLE public.consultations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='consultation_analysis') THEN
        ALTER TABLE public.consultation_analysis DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

ALTER TABLE public.questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options DISABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
