-- Migration: Refactor AI Providers, Multi-Prompts, Consultation Analysis, and Consultation Statuses

-- 1. Create ai_providers table
CREATE TABLE IF NOT EXISTS public.ai_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_name TEXT NOT NULL,
  provider_key TEXT NOT NULL UNIQUE,
  api_key TEXT DEFAULT '',
  base_url TEXT DEFAULT '',
  model TEXT DEFAULT '',
  temperature NUMERIC DEFAULT 0.7,
  max_tokens INTEGER DEFAULT 2048,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed 9 AI Providers
INSERT INTO public.ai_providers (provider_name, provider_key, api_key, base_url, model, temperature, max_tokens, is_default, is_active)
VALUES
  ('Lovable AI Gateway', 'lovable', '', 'https://ai-gateway.lovable.dev/v1', 'google/gemini-2.5-flash', 0.7, 2048, true, true),
  ('Google Gemini', 'gemini', '', 'https://generativelanguage.googleapis.com/v1beta/models', 'gemini-1.5-pro', 0.7, 2048, false, true),
  ('OpenAI GPT', 'openai', '', 'https://api.openai.com/v1', 'gpt-4o-mini', 0.7, 2048, false, true),
  ('Anthropic Claude', 'claude', '', 'https://api.anthropic.com/v1', 'claude-3-5-sonnet-20241022', 0.7, 2048, false, true),
  ('OpenRouter', 'openrouter', '', 'https://openrouter.ai/api/v1', 'auto', 0.7, 2048, false, true),
  ('DeepSeek', 'deepseek', '', 'https://api.deepseek.com/v1', 'deepseek-chat', 0.7, 2048, false, true),
  ('Groq', 'groq', '', 'https://api.groq.com/openai/v1', 'llama-3.3-70b-versatile', 0.7, 2048, false, true),
  ('Mistral AI', 'mistral', '', 'https://api.mistral.ai/v1', 'mistral-small-latest', 0.7, 2048, false, true),
  ('Ollama (Self Hosted)', 'ollama', '', 'http://localhost:11434', 'llama3', 0.7, 2048, false, true)
ON CONFLICT (provider_key) DO UPDATE SET
  provider_name = EXCLUDED.provider_name,
  base_url = EXCLUDED.base_url,
  model = EXCLUDED.model;

-- 2. Update ai_prompts table structure
CREATE TABLE IF NOT EXISTS public.ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_prompt TEXT NOT NULL,
  analysis_prompt TEXT NOT NULL,
  summary_prompt TEXT NOT NULL,
  recommendation_prompt TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed default multi-prompts if empty
INSERT INTO public.ai_prompts (system_prompt, analysis_prompt, summary_prompt, recommendation_prompt)
SELECT
  'Anda adalah Pakar Analis Potensi & Konsultan Pendidikan Anak Senior dari EduKonsul (Sekolah Alam Al-Karim). Tugas Anda adalah menganalisis secara mendalam seluruh jawaban tes kesiapan dan potensi yang diisi oleh orang tua murid, lalu menyusun laporan evaluasi dan rekomendasi pendidikan yang komprehensif, hangat, serta sangat konstruktif.',
  'Berdasarkan profil anak:\nNama Orang Tua: {{nama_orang_tua}}\nJenjang: {{jenjang}}\n\nJawaban Tes:\n{{jawaban_lengkap}}\n\nLakukan analisis mendalam terhadap kesiapan emosional, kecerdasan dominan, serta gaya belajar anak.',
  'Susun resume singkat (1-2 paragraf) mengenai gambaran umum kondisi anak.',
  'Berikan rekomendasi pendidikan meliputi metode belajar, pendekatan parenting, aktivitas stimulasi di rumah, serta lingkungan sekolah yang cocok untuk jenjang {{jenjang}}.'
WHERE NOT EXISTS (SELECT 1 FROM public.ai_prompts);

-- 3. Create consultation_analysis table
CREATE TABLE IF NOT EXISTS public.consultation_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE CASCADE UNIQUE NOT NULL,
  summary TEXT DEFAULT '',
  analysis TEXT DEFAULT '',
  strengths TEXT DEFAULT '',
  weaknesses TEXT DEFAULT '',
  potential TEXT DEFAULT '',
  risk TEXT DEFAULT '',
  education_recommendation TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Add error_message to consultations if not existing
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 5. Enable RLS and Grant Permissions for All New Tables
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access to ai_providers" ON public.ai_providers;
CREATE POLICY "Allow all access to ai_providers" ON public.ai_providers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to ai_prompts" ON public.ai_prompts;
CREATE POLICY "Allow all access to ai_prompts" ON public.ai_prompts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all access to consultation_analysis" ON public.consultation_analysis;
CREATE POLICY "Allow all access to consultation_analysis" ON public.consultation_analysis FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.ai_providers TO anon, authenticated, service_role;
GRANT ALL ON public.ai_prompts TO anon, authenticated, service_role;
GRANT ALL ON public.consultation_analysis TO anon, authenticated, service_role;
