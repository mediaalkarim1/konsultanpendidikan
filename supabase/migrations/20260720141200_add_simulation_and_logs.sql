-- 1. Create ai_prompts table
CREATE TABLE IF NOT EXISTS public.ai_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure only one prompt is active at a time using a partial unique index
CREATE UNIQUE INDEX IF NOT EXISTS ai_prompts_active_idx ON public.ai_prompts (is_active) WHERE is_active = true;

-- Insert default prompt
INSERT INTO public.ai_prompts (name, system_prompt, user_prompt_template, is_active)
VALUES (
  'Prompt Utama',
  'Anda adalah Konsultan Pendidikan ahli dari Sekolah Alam Al-Karim. Analisislah jawaban tes potensi berikut dan berikan rekomendasi jenjang, gaya belajar, dan saran pendidikan yang ramah dan profesional.',
  'Berikut adalah data anak:\nNama: {{nama}}\nJenjang: {{jenjang}}\n\nJawaban Tes:\n{{jawaban}}\n\nBerikan analisis yang mendalam.',
  true
);

-- 2. Create notification_logs table
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  consultation_id UUID REFERENCES public.consultations(id) ON DELETE SET NULL,
  type TEXT NOT NULL, -- 'admin_wa', 'participant_wa'
  target_number TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL, -- 'success', 'failed'
  response_payload JSONB,
  error_message TEXT
);

-- 3. Alter consultations table
ALTER TABLE public.consultations 
  ADD COLUMN IF NOT EXISTS ai_status TEXT DEFAULT 'pending', -- 'pending', 'success', 'failed'
  ADD COLUMN IF NOT EXISTS ai_created_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS ai_prompt_used JSONB,
  ADD COLUMN IF NOT EXISTS notification_admin_status TEXT DEFAULT 'pending', -- 'pending', 'success', 'failed'
  ADD COLUMN IF NOT EXISTS notification_parent_status TEXT DEFAULT 'pending'; -- 'pending', 'success', 'failed'

-- 4. Update existing settings for new fields
INSERT INTO public.settings (key, value, is_public) VALUES
  ('ai.gemini_params', '{"temperature": 0.7, "max_tokens": 2048}'::jsonb, false),
  ('wa.provider_config', '{"api_url": "", "api_key": "", "device_id": ""}'::jsonb, false)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- Enable RLS on new tables (bypassed by service_role on backend)
ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
