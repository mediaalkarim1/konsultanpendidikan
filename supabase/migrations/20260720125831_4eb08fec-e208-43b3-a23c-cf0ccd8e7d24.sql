
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
INSERT INTO public.questions (id, level, question_text, question_type, order_index, is_required, is_active) VALUES
  ('10000000-0000-4000-a000-000000000001', 'tksd', 'Anak Anda berada pada jenjang', 'single_choice', 1, true, true),
  ('10000000-0000-4000-a000-000000000002', 'tksd', 'Usia anak', 'single_choice', 2, true, true),
  ('10000000-0000-4000-a000-000000000003', 'tksd', 'Apa yang paling sering menjadi tantangan di rumah? (Pilih maksimal 3)', 'multi_choice', 3, true, true),
  ('10000000-0000-4000-a000-000000000004', 'tksd', 'Dalam sehari, rata-rata screen time anak adalah...', 'single_choice', 4, true, true),
  ('10000000-0000-4000-a000-000000000005', 'tksd', 'Saat gadget diambil, biasanya anak...', 'single_choice', 5, true, true),
  ('10000000-0000-4000-a000-000000000006', 'tksd', 'Aktivitas apa yang paling sering dilakukan anak ketika di rumah?', 'single_choice', 6, true, true),
  ('10000000-0000-4000-a000-000000000007', 'tksd', 'Seberapa mandiri anak Anda?', 'single_choice', 7, true, true),
  ('10000000-0000-4000-a000-000000000008', 'tksd', 'Ketika menghadapi kesulitan, anak biasanya...', 'single_choice', 8, true, true),
  ('10000000-0000-4000-a000-000000000009', 'tksd', 'Bagaimana kemampuan anak dalam bersosialisasi?', 'single_choice', 9, true, true),
  ('10000000-0000-4000-a000-000000000010', 'tksd', 'Menurut Anda, nilai apa yang paling penting dimiliki anak? (Pilih maksimal 3)', 'multi_choice', 10, true, true),
  ('10000000-0000-4000-a000-000000000011', 'tksd', 'Apa harapan terbesar Anda terhadap sekolah anak?', 'multi_choice', 11, true, true),
  ('10000000-0000-4000-a000-000000000012', 'tksd', 'Jika ada sesi konsultasi GRATIS mengenai pendidikan anak, apakah Anda bersedia dihubungi?', 'single_choice', 12, true, true),
  (gen_random_uuid(), 'smp', 'Nama lengkap anak', 'text', 1, true, true),
  (gen_random_uuid(), 'smp', 'Kelas SD terakhir', 'text', 2, true, true),
  (gen_random_uuid(), 'smp', 'Mata pelajaran yang paling disukai', 'textarea', 3, true, true),
  (gen_random_uuid(), 'smp', 'Gaya belajar anak yang paling menonjol', 'single_choice', 4, true, true),
  (gen_random_uuid(), 'smp', 'Kegiatan ekstrakurikuler yang diminati', 'multi_choice', 5, true, true),
  (gen_random_uuid(), 'sma', 'Nama lengkap anak', 'text', 1, true, true),
  (gen_random_uuid(), 'sma', 'Nilai rata-rata rapor terakhir', 'text', 2, true, true),
  (gen_random_uuid(), 'sma', 'Cita-cita atau bidang karier yang diminati', 'textarea', 3, true, true),
  (gen_random_uuid(), 'sma', 'Jurusan yang paling diminati', 'single_choice', 4, true, true),
  (gen_random_uuid(), 'sma', 'Faktor terpenting dalam memilih SMA', 'multi_choice', 5, true, true);

-- Seed options
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('10000000-0000-4000-a000-000000000001', 'Belum Sekolah', 1),
  ('10000000-0000-4000-a000-000000000001', 'TK A', 2),
  ('10000000-0000-4000-a000-000000000001', 'TK B', 3),
  ('10000000-0000-4000-a000-000000000001', 'SD Kelas 1–3', 4),
  ('10000000-0000-4000-a000-000000000001', 'SD Kelas 4–6', 5),
  ('10000000-0000-4000-a000-000000000002', '3 Tahun', 1),
  ('10000000-0000-4000-a000-000000000002', '4 Tahun', 2),
  ('10000000-0000-4000-a000-000000000002', '5 Tahun', 3),
  ('10000000-0000-4000-a000-000000000002', '6 Tahun', 4),
  ('10000000-0000-4000-a000-000000000002', '7–9 Tahun', 5),
  ('10000000-0000-4000-a000-000000000002', '10–12 Tahun', 6),
  ('10000000-0000-4000-a000-000000000003', 'Sulit diatur', 1),
  ('10000000-0000-4000-a000-000000000003', 'Mudah marah', 2),
  ('10000000-0000-4000-a000-000000000003', 'Sulit fokus', 3),
  ('10000000-0000-4000-a000-000000000003', 'Terlalu aktif', 4),
  ('10000000-0000-4000-a000-000000000003', 'Pemalu', 5),
  ('10000000-0000-4000-a000-000000000003', 'Kurang percaya diri', 6),
  ('10000000-0000-4000-a000-000000000003', 'Terlalu bergantung pada orang tua', 7),
  ('10000000-0000-4000-a000-000000000003', 'Sulit berteman', 8),
  ('10000000-0000-4000-a000-000000000003', 'Terlalu sering bermain gadget', 9),
  ('10000000-0000-4000-a000-000000000003', 'Tidak ada kendala berarti', 10),
  ('10000000-0000-4000-a000-000000000004', 'Kurang dari 30 menit', 1),
  ('10000000-0000-4000-a000-000000000004', '30 menit – 1 jam', 2),
  ('10000000-0000-4000-a000-000000000004', '1–2 jam', 3),
  ('10000000-0000-4000-a000-000000000004', 'Lebih dari 2 jam', 4),
  ('10000000-0000-4000-a000-000000000004', 'Hampir setiap waktu luang', 5),
  ('10000000-0000-4000-a000-000000000005', 'Biasa saja', 1),
  ('10000000-0000-4000-a000-000000000005', 'Sedikit kecewa', 2),
  ('10000000-0000-4000-a000-000000000005', 'Rewel', 3),
  ('10000000-0000-4000-a000-000000000005', 'Menangis atau marah', 4),
  ('10000000-0000-4000-a000-000000000005', 'Sulit dialihkan ke aktivitas lain', 5),
  ('10000000-0000-4000-a000-000000000006', 'Bermain di luar rumah', 1),
  ('10000000-0000-4000-a000-000000000006', 'Membaca buku', 2),
  ('10000000-0000-4000-a000-000000000006', 'Menggambar', 3),
  ('10000000-0000-4000-a000-000000000006', 'Bermain bersama teman', 4),
  ('10000000-0000-4000-a000-000000000006', 'Bermain gadget', 5),
  ('10000000-0000-4000-a000-000000000006', 'Menonton TV', 6),
  ('10000000-0000-4000-a000-000000000007', 'Sudah terbiasa melakukan banyak hal sendiri', 1),
  ('10000000-0000-4000-a000-000000000007', 'Kadang masih dibantu', 2),
  ('10000000-0000-4000-a000-000000000007', 'Hampir semua masih dibantu orang tua', 3),
  ('10000000-0000-4000-a000-000000000008', 'Mencoba sendiri', 1),
  ('10000000-0000-4000-a000-000000000008', 'Bertanya kepada orang tua', 2),
  ('10000000-0000-4000-a000-000000000008', 'Mudah menyerah', 3),
  ('10000000-0000-4000-a000-000000000008', 'Menangis atau marah', 4),
  ('10000000-0000-4000-a000-000000000009', 'Sangat mudah berteman', 1),
  ('10000000-0000-4000-a000-000000000009', 'Perlu waktu beradaptasi', 2),
  ('10000000-0000-4000-a000-000000000009', 'Cenderung pemalu', 3),
  ('10000000-0000-4000-a000-000000000009', 'Lebih suka bermain sendiri', 4),
  ('10000000-0000-4000-a000-000000000010', 'Akhlak dan adab', 1),
  ('10000000-0000-4000-a000-000000000010', 'Mandiri', 2),
  ('10000000-0000-4000-a000-000000000010', 'Percaya diri', 3),
  ('10000000-0000-4000-a000-000000000010', 'Disiplin', 4),
  ('10000000-0000-4000-a000-000000000010', 'Tanggung jawab', 5),
  ('10000000-0000-4000-a000-000000000010', 'Bahasa Inggris', 6),
  ('10000000-0000-4000-a000-000000000010', 'Akademik', 7),
  ('10000000-0000-4000-a000-000000000010', 'Kepemimpinan', 8),
  ('10000000-0000-4000-a000-000000000011', 'Membentuk karakter yang baik', 1),
  ('10000000-0000-4000-a000-000000000011', 'Membiasakan anak mandiri', 2),
  ('10000000-0000-4000-a000-000000000011', 'Anak bahagia belajar', 3),
  ('10000000-0000-4000-a000-000000000011', 'Mampu berbahasa Inggris', 4),
  ('10000000-0000-4000-a000-000000000011', 'Hafal Al-Qur''an', 5),
  ('10000000-0000-4000-a000-000000000011', 'Prestasi akademik', 6),
  ('10000000-0000-4000-a000-000000000011', 'Mengurangi ketergantungan gadget', 7),
  ('10000000-0000-4000-a000-000000000012', 'Ya', 1),
  ('10000000-0000-4000-a000-000000000012', 'Mungkin', 2),
  ('10000000-0000-4000-a000-000000000012', 'Tidak', 3);

-- Seed options for SMP & SMA
INSERT INTO public.question_options (question_id, option_text, order_index)
SELECT q.id, o.option_text, o.order_index FROM public.questions q
JOIN (VALUES
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
