-- MIGRATION: Fix Table Grants & RLS Policies for Anon/Publishable Key Server Actions

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres, anon, authenticated, service_role;

-- Ensure RLS is configured to allow server functions with publishable key to operate
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_answers ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='consultation_analysis') THEN
        ALTER TABLE public.consultation_analysis ENABLE ROW LEVEL SECURITY;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ai_logs') THEN
        ALTER TABLE public.ai_logs ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Drop all old restrictive policies
DROP POLICY IF EXISTS "Public insert consultations" ON public.consultations;
DROP POLICY IF EXISTS "Public select consultations" ON public.consultations;
DROP POLICY IF EXISTS "Public update consultations" ON public.consultations;
DROP POLICY IF EXISTS "Admin full consultations" ON public.consultations;
DROP POLICY IF EXISTS "Allow public insert consultations" ON public.consultations;
DROP POLICY IF EXISTS "Public full consultations" ON public.consultations;

DROP POLICY IF EXISTS "Public insert consultation_answers" ON public.consultation_answers;
DROP POLICY IF EXISTS "Public select consultation_answers" ON public.consultation_answers;
DROP POLICY IF EXISTS "Admin full consultation_answers" ON public.consultation_answers;
DROP POLICY IF EXISTS "Allow public insert consultation_answers" ON public.consultation_answers;
DROP POLICY IF EXISTS "Public full consultation_answers" ON public.consultation_answers;

DROP POLICY IF EXISTS "Public full consultation_analysis" ON public.consultation_analysis;
DROP POLICY IF EXISTS "Admin full consultation_analysis" ON public.consultation_analysis;

-- Create working policies allowing full operations for system server actions
CREATE POLICY "Public full consultations"
ON public.consultations
FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Public full consultation_answers"
ON public.consultation_answers
FOR ALL
TO anon, authenticated, service_role
USING (true)
WITH CHECK (true);

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='consultation_analysis') THEN
        EXECUTE 'CREATE POLICY "Public full consultation_analysis" ON public.consultation_analysis FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true)';
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ai_logs') THEN
        EXECUTE 'CREATE POLICY "Public full ai_logs" ON public.ai_logs FOR ALL TO anon, authenticated, service_role USING (true) WITH CHECK (true)';
    END IF;
END $$;

-- Reload Schema Cache in PostgREST
NOTIFY pgrst, 'reload schema';
