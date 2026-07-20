
-- Enum for question types
CREATE TYPE public.question_type AS ENUM ('text', 'textarea', 'single_choice', 'multi_choice');
CREATE TYPE public.education_level AS ENUM ('tksd', 'smp', 'sma');

-- Questions
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level public.education_level NOT NULL,
  question_text TEXT NOT NULL,
  question_type public.question_type NOT NULL DEFAULT 'text',
  order_index INTEGER NOT NULL DEFAULT 0,
  is_required BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.questions TO anon, authenticated;
GRANT ALL ON public.questions TO service_role;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read active questions" ON public.questions FOR SELECT USING (is_active = true);

-- Question options
CREATE TABLE public.question_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.question_options(question_id);
GRANT SELECT ON public.question_options TO anon, authenticated;
GRANT ALL ON public.question_options TO service_role;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read question options" ON public.question_options FOR SELECT USING (true);

-- Consultations
CREATE TABLE public.consultations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_name TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  level public.education_level NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.consultations(level);
CREATE INDEX ON public.consultations(created_at DESC);
GRANT INSERT ON public.consultations TO anon, authenticated;
GRANT ALL ON public.consultations TO service_role;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit a consultation" ON public.consultations FOR INSERT WITH CHECK (true);

-- Consultation answers
CREATE TABLE public.consultation_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES public.consultations(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answer_text TEXT,
  selected_option_ids UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.consultation_answers(consultation_id);
GRANT INSERT ON public.consultation_answers TO anon, authenticated;
GRANT ALL ON public.consultation_answers TO service_role;
ALTER TABLE public.consultation_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit answers" ON public.consultation_answers FOR INSERT WITH CHECK (true);

-- Settings
CREATE TABLE public.settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.settings TO anon, authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read public settings" ON public.settings FOR SELECT USING (is_public = true);

-- Seed default questions
INSERT INTO public.questions (level, question_text, question_type, order_index) VALUES
  ('tksd', 'Nama lengkap anak', 'text', 1),
  ('tksd', 'Usia anak saat ini (tahun)', 'text', 2),
  ('tksd', 'Apa aktivitas favorit anak di rumah?', 'textarea', 3),
  ('tksd', 'Bagaimana kemampuan sosial anak?', 'single_choice', 4),
  ('tksd', 'Aspek yang paling penting bagi orang tua dalam memilih sekolah', 'multi_choice', 5),
  ('smp', 'Nama lengkap anak', 'text', 1),
  ('smp', 'Kelas SD terakhir', 'text', 2),
  ('smp', 'Mata pelajaran yang paling disukai', 'textarea', 3),
  ('smp', 'Gaya belajar anak yang paling menonjol', 'single_choice', 4),
  ('smp', 'Kegiatan ekstrakurikuler yang diminati', 'multi_choice', 5),
  ('sma', 'Nama lengkap anak', 'text', 1),
  ('sma', 'Nilai rata-rata rapor terakhir', 'text', 2),
  ('sma', 'Cita-cita atau bidang karier yang diminati', 'textarea', 3),
  ('sma', 'Jurusan yang paling diminati', 'single_choice', 4),
  ('sma', 'Faktor terpenting dalam memilih SMA', 'multi_choice', 5);

-- Seed options
INSERT INTO public.question_options (question_id, option_text, order_index)
SELECT q.id, o.option_text, o.order_index FROM public.questions q
JOIN (VALUES
  ('tksd', 'Bagaimana kemampuan sosial anak?', 'Sangat mudah berinteraksi', 1),
  ('tksd', 'Bagaimana kemampuan sosial anak?', 'Cukup ramah', 2),
  ('tksd', 'Bagaimana kemampuan sosial anak?', 'Masih perlu adaptasi', 3),
  ('tksd', 'Bagaimana kemampuan sosial anak?', 'Cenderung pemalu', 4),
  ('tksd', 'Aspek yang paling penting bagi orang tua dalam memilih sekolah', 'Kurikulum agama & karakter', 1),
  ('tksd', 'Aspek yang paling penting bagi orang tua dalam memilih sekolah', 'Fasilitas dan lingkungan', 2),
  ('tksd', 'Aspek yang paling penting bagi orang tua dalam memilih sekolah', 'Metode belajar aktif', 3),
  ('tksd', 'Aspek yang paling penting bagi orang tua dalam memilih sekolah', 'Biaya terjangkau', 4),
  ('tksd', 'Aspek yang paling penting bagi orang tua dalam memilih sekolah', 'Jarak dekat dari rumah', 5),
  ('smp', 'Gaya belajar anak yang paling menonjol', 'Visual (gambar/video)', 1),
  ('smp', 'Gaya belajar anak yang paling menonjol', 'Auditori (mendengar)', 2),
  ('smp', 'Gaya belajar anak yang paling menonjol', 'Kinestetik (praktik)', 3),
  ('smp', 'Gaya belajar anak yang paling menonjol', 'Membaca & menulis', 4),
  ('smp', 'Kegiatan ekstrakurikuler yang diminati', 'Sains/Robotik', 1),
  ('smp', 'Kegiatan ekstrakurikuler yang diminati', 'Olahraga', 2),
  ('smp', 'Kegiatan ekstrakurikuler yang diminati', 'Seni & musik', 3),
  ('smp', 'Kegiatan ekstrakurikuler yang diminati', 'Keagamaan', 4),
  ('smp', 'Kegiatan ekstrakurikuler yang diminati', 'Kepemimpinan/OSIS', 5),
  ('sma', 'Jurusan yang paling diminati', 'IPA', 1),
  ('sma', 'Jurusan yang paling diminati', 'IPS', 2),
  ('sma', 'Jurusan yang paling diminati', 'Bahasa', 3),
  ('sma', 'Jurusan yang paling diminati', 'Belum menentukan', 4),
  ('sma', 'Faktor terpenting dalam memilih SMA', 'Peluang masuk PTN', 1),
  ('sma', 'Faktor terpenting dalam memilih SMA', 'Kualitas guru', 2),
  ('sma', 'Faktor terpenting dalam memilih SMA', 'Program keagamaan', 3),
  ('sma', 'Faktor terpenting dalam memilih SMA', 'Ekstrakurikuler', 4),
  ('sma', 'Faktor terpenting dalam memilih SMA', 'Lingkungan pergaulan', 5)
) AS o(level_key, q_text, option_text, order_index)
ON q.level::text = o.level_key AND q.question_text = o.q_text;

-- Seed public site settings
INSERT INTO public.settings (key, value, is_public) VALUES
  ('site.brand', '{"name":"EduKonsul","tagline":"Konsultasi & Rekomendasi Pendidikan Untuk Anak"}'::jsonb, true),
  ('site.hero', '{"title":"Konsultasi & Rekomendasi Pendidikan Untuk Anak","description":"Temukan rekomendasi pendidikan terbaik sesuai jenjang pendidikan anak."}'::jsonb, true);
