-- MIGRATION: Complete System Audit & Fix Schema for Consultations, Answers, AI Logs, System Logs

-- 1. Ensure 'consultations' table exists and has all required columns
CREATE TABLE IF NOT EXISTS public.consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_name TEXT NOT NULL,
    parent_phone TEXT,
    whatsapp_number TEXT NOT NULL,
    child_name TEXT,
    level TEXT NOT NULL DEFAULT 'tksd',
    education_level TEXT DEFAULT 'tksd',
    status TEXT NOT NULL DEFAULT 'Menunggu Analisis AI',
    ai_status TEXT DEFAULT 'Menunggu Analisis AI',
    consultation_status TEXT DEFAULT 'Menunggu Analisis AI',
    ai_result TEXT,
    ai_prompt TEXT,
    ai_model TEXT,
    token_usage JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add missing columns to consultations safely if table already exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultations' AND column_name='parent_phone') THEN
        ALTER TABLE public.consultations ADD COLUMN parent_phone TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultations' AND column_name='child_name') THEN
        ALTER TABLE public.consultations ADD COLUMN child_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultations' AND column_name='education_level') THEN
        ALTER TABLE public.consultations ADD COLUMN education_level TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultations' AND column_name='ai_status') THEN
        ALTER TABLE public.consultations ADD COLUMN ai_status TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultations' AND column_name='consultation_status') THEN
        ALTER TABLE public.consultations ADD COLUMN consultation_status TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultations' AND column_name='ai_result') THEN
        ALTER TABLE public.consultations ADD COLUMN ai_result TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultations' AND column_name='ai_prompt') THEN
        ALTER TABLE public.consultations ADD COLUMN ai_prompt TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultations' AND column_name='ai_model') THEN
        ALTER TABLE public.consultations ADD COLUMN ai_model TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultations' AND column_name='token_usage') THEN
        ALTER TABLE public.consultations ADD COLUMN token_usage JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultations' AND column_name='error_message') THEN
        ALTER TABLE public.consultations ADD COLUMN error_message TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultations' AND column_name='summary') THEN
        ALTER TABLE public.consultations ADD COLUMN summary TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultations' AND column_name='recommendation') THEN
        ALTER TABLE public.consultations ADD COLUMN recommendation TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultations' AND column_name='analysis_status') THEN
        ALTER TABLE public.consultations ADD COLUMN analysis_status TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultations' AND column_name='analyzed_at') THEN
        ALTER TABLE public.consultations ADD COLUMN analyzed_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultations' AND column_name='updated_at') THEN
        ALTER TABLE public.consultations ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
END $$;

-- 2. Ensure 'consultation_answers' table exists and has all required columns
CREATE TABLE IF NOT EXISTS public.consultation_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
    question_id UUID REFERENCES public.questions(id) ON DELETE SET NULL,
    question TEXT,
    answer TEXT,
    answer_text TEXT,
    selected_option_ids JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultation_answers' AND column_name='question') THEN
        ALTER TABLE public.consultation_answers ADD COLUMN question TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='consultation_answers' AND column_name='answer') THEN
        ALTER TABLE public.consultation_answers ADD COLUMN answer TEXT;
    END IF;
END $$;

-- 3. Ensure 'ai_logs' table exists
CREATE TABLE IF NOT EXISTS public.ai_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE,
    prompt TEXT,
    response TEXT,
    model TEXT,
    token_usage JSONB,
    status TEXT NOT NULL DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Ensure 'system_logs' table exists
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT NOT NULL DEFAULT 'info',
    source TEXT NOT NULL DEFAULT 'system',
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Disable RLS or set public access policies for service role & admin access
ALTER TABLE public.consultations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs DISABLE ROW LEVEL SECURITY;

-- Reload Schema Cache in PostgREST
NOTIFY pgrst, 'reload schema';
