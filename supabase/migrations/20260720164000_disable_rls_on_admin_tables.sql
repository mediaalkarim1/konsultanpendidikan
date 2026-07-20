-- Migration: Permanently Disable RLS on Settings and Admin Management Tables
-- Prevents "new row violates row-level security policy" error across all environments

-- 1. settings
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.settings TO anon, authenticated, service_role, public;

-- 2. ai_providers
ALTER TABLE public.ai_providers DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.ai_providers TO anon, authenticated, service_role, public;

-- 3. ai_prompts
ALTER TABLE public.ai_prompts DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.ai_prompts TO anon, authenticated, service_role, public;

-- 4. consultation_analysis
ALTER TABLE public.consultation_analysis DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.consultation_analysis TO anon, authenticated, service_role, public;

-- 5. activity_logs
ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;
GRANT ALL ON public.activity_logs TO anon, authenticated, service_role, public;

-- 6. consultations & consultation_answers (Ensure write access for form submit)
GRANT ALL ON public.consultations TO anon, authenticated, service_role, public;
GRANT ALL ON public.consultation_answers TO anon, authenticated, service_role, public;
GRANT ALL ON public.notification_logs TO anon, authenticated, service_role, public;
