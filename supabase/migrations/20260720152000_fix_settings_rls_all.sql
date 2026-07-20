-- Comprehensive Fix for Row-Level Security (RLS) on settings and related tables
-- Allows seamless upsert (insert/update) for both authenticated and fallback admin sessions

-- 1. settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read public settings" ON public.settings;
DROP POLICY IF EXISTS "Auth users can do all on settings" ON public.settings;
DROP POLICY IF EXISTS "Allow all read settings" ON public.settings;
DROP POLICY IF EXISTS "Allow all write settings" ON public.settings;
DROP POLICY IF EXISTS "Allow all update settings" ON public.settings;
DROP POLICY IF EXISTS "Allow all delete settings" ON public.settings;

CREATE POLICY "Allow all read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Allow all write settings" ON public.settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update settings" ON public.settings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete settings" ON public.settings FOR DELETE USING (true);

GRANT ALL ON public.settings TO anon, authenticated, service_role;

-- 2. ai_prompts
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth users can do all on ai_prompts" ON public.ai_prompts;
DROP POLICY IF EXISTS "Allow all read ai_prompts" ON public.ai_prompts;
DROP POLICY IF EXISTS "Allow all write ai_prompts" ON public.ai_prompts;
DROP POLICY IF EXISTS "Allow all update ai_prompts" ON public.ai_prompts;
DROP POLICY IF EXISTS "Allow all delete ai_prompts" ON public.ai_prompts;

CREATE POLICY "Allow all read ai_prompts" ON public.ai_prompts FOR SELECT USING (true);
CREATE POLICY "Allow all write ai_prompts" ON public.ai_prompts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update ai_prompts" ON public.ai_prompts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow all delete ai_prompts" ON public.ai_prompts FOR DELETE USING (true);

GRANT ALL ON public.ai_prompts TO anon, authenticated, service_role;

-- 3. activity_logs
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Auth users can do all on activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow all read activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow all write activity_logs" ON public.activity_logs;

CREATE POLICY "Allow all read activity_logs" ON public.activity_logs FOR SELECT USING (true);
CREATE POLICY "Allow all write activity_logs" ON public.activity_logs FOR INSERT WITH CHECK (true);

GRANT ALL ON public.activity_logs TO anon, authenticated, service_role;
