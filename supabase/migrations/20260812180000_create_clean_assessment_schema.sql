-- Clean Assessment System Tables Migration

CREATE TABLE IF NOT EXISTS public.assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_name TEXT NOT NULL,
    parent_phone TEXT NOT NULL,
    child_name TEXT NOT NULL,
    education_level TEXT NOT NULL CHECK (education_level IN ('tksd', 'smp', 'sma')),
    status TEXT NOT NULL DEFAULT 'Menunggu Analisis',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assessment_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    education_level TEXT NOT NULL CHECK (education_level IN ('tksd', 'smp', 'sma')),
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL DEFAULT 'single_choice',
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assessment_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.assessment_questions(id) ON DELETE CASCADE,
    option_text TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assessment_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
    question_id UUID NOT NULL,
    answer_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.assessment_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL UNIQUE REFERENCES public.assessments(id) ON DELETE CASCADE,
    analysis_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS Disable / Grants for unrestricted API usage
ALTER TABLE public.assessments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_options DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_answers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_analysis DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.assessments TO anon, authenticated, service_role;
GRANT ALL ON public.assessment_questions TO anon, authenticated, service_role;
GRANT ALL ON public.assessment_options TO anon, authenticated, service_role;
GRANT ALL ON public.assessment_answers TO anon, authenticated, service_role;
GRANT ALL ON public.assessment_analysis TO anon, authenticated, service_role;
