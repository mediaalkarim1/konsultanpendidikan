-- MIGRATION: Strict RLS Security - Restrict AI Analysis and Answers to Admin Only

-- 1. Enable Row Level Security (RLS) on sensitive tables
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

-- 2. Drop legacy loose/permissive policies if existing
DROP POLICY IF EXISTS "Allow public insert consultations" ON public.consultations;
DROP POLICY IF EXISTS "Allow public insert consultation_answers" ON public.consultation_answers;
DROP POLICY IF EXISTS "Allow admin full consultations" ON public.consultations;
DROP POLICY IF EXISTS "Allow admin full consultation_answers" ON public.consultation_answers;
DROP POLICY IF EXISTS "Allow admin full consultation_analysis" ON public.consultation_analysis;
DROP POLICY IF EXISTS "Allow admin full ai_logs" ON public.ai_logs;

-- 3. Create strict policies for 'consultations' table
-- Public / Anon can INSERT to allow submitting questionnaires
CREATE POLICY "Public insert consultations"
ON public.consultations
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only authenticated users (Admins) and service_role can SELECT, UPDATE, DELETE
CREATE POLICY "Admin full consultations"
ON public.consultations
FOR ALL
TO authenticated, service_role
USING (true)
WITH CHECK (true);

-- 4. Create strict policies for 'consultation_answers' table
-- Public / Anon can INSERT answers during submission
CREATE POLICY "Public insert consultation_answers"
ON public.consultation_answers
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only authenticated users (Admins) and service_role can SELECT, UPDATE, DELETE
CREATE POLICY "Admin full consultation_answers"
ON public.consultation_answers
FOR ALL
TO authenticated, service_role
USING (true)
WITH CHECK (true);

-- 5. Create strict policies for 'consultation_analysis' table
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='consultation_analysis') THEN
        EXECUTE 'CREATE POLICY "Admin full consultation_analysis" ON public.consultation_analysis FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true)';
    END IF;
END $$;

-- 6. Create strict policies for 'ai_logs' table
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='ai_logs') THEN
        EXECUTE 'CREATE POLICY "Admin full ai_logs" ON public.ai_logs FOR ALL TO authenticated, service_role USING (true) WITH CHECK (true)';
    END IF;
END $$;

-- Reload Schema Cache in PostgREST
NOTIFY pgrst, 'reload schema';
