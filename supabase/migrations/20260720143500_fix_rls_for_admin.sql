-- Fix RLS Policies to allow authenticated users (Admins) to manage all tables

-- 1. settings
DROP POLICY IF EXISTS "Auth users can do all on settings" ON public.settings;
CREATE POLICY "Auth users can do all on settings" ON public.settings FOR ALL USING (auth.role() = 'authenticated');

-- 2. ai_prompts
DROP POLICY IF EXISTS "Auth users can do all on ai_prompts" ON public.ai_prompts;
CREATE POLICY "Auth users can do all on ai_prompts" ON public.ai_prompts FOR ALL USING (auth.role() = 'authenticated');

-- 3. consultations
DROP POLICY IF EXISTS "Auth users can do all on consultations" ON public.consultations;
CREATE POLICY "Auth users can do all on consultations" ON public.consultations FOR ALL USING (auth.role() = 'authenticated');

-- 4. consultation_answers
DROP POLICY IF EXISTS "Auth users can do all on consultation_answers" ON public.consultation_answers;
CREATE POLICY "Auth users can do all on consultation_answers" ON public.consultation_answers FOR ALL USING (auth.role() = 'authenticated');

-- 5. questions
DROP POLICY IF EXISTS "Auth users can do all on questions" ON public.questions;
CREATE POLICY "Auth users can do all on questions" ON public.questions FOR ALL USING (auth.role() = 'authenticated');

-- 6. question_options
DROP POLICY IF EXISTS "Auth users can do all on question_options" ON public.question_options;
CREATE POLICY "Auth users can do all on question_options" ON public.question_options FOR ALL USING (auth.role() = 'authenticated');

-- 7. notification_logs
DROP POLICY IF EXISTS "Auth users can do all on notification_logs" ON public.notification_logs;
CREATE POLICY "Auth users can do all on notification_logs" ON public.notification_logs FOR ALL USING (auth.role() = 'authenticated');

-- 8. activity_logs
-- Already done in previous migration but ensuring full access
DROP POLICY IF EXISTS "Auth users can do all on activity_logs" ON public.activity_logs;
CREATE POLICY "Auth users can do all on activity_logs" ON public.activity_logs FOR ALL USING (auth.role() = 'authenticated');

-- Make sure all tables have GRANT ALL for authenticated
GRANT ALL ON public.settings TO authenticated;
GRANT ALL ON public.ai_prompts TO authenticated;
GRANT ALL ON public.consultations TO authenticated;
GRANT ALL ON public.consultation_answers TO authenticated;
GRANT ALL ON public.questions TO authenticated;
GRANT ALL ON public.question_options TO authenticated;
GRANT ALL ON public.notification_logs TO authenticated;
GRANT ALL ON public.activity_logs TO authenticated;
