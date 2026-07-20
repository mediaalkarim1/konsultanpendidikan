-- Add ai_result to consultations
ALTER TABLE public.consultations ADD COLUMN IF NOT EXISTS ai_result TEXT;

-- Add default AI and WA settings
INSERT INTO public.settings (key, value, is_public) VALUES
  ('ai.prompt', '{"system_prompt":"Anda adalah Konsultan Pendidikan ahli dari Sekolah Alam Al-Karim. Analisislah jawaban tes potensi berikut dan berikan rekomendasi jenjang, gaya belajar, dan saran pendidikan yang ramah dan profesional.","user_prompt_template":"Berikut adalah data anak:\nNama: {{nama}}\nJenjang: {{jenjang}}\n\nJawaban Tes:\n{{jawaban}}\n\nBerikan analisis yang mendalam."}'::jsonb, false),
  ('ai.gemini_key', '{"key":""}'::jsonb, false),
  ('ai.gemini_model', '{"model":"gemini-1.5-pro"}'::jsonb, false),
  ('wa.provider', '{"name":"mock","api_key":""}'::jsonb, false)
ON CONFLICT (key) DO NOTHING;
