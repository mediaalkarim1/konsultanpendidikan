-- Migration: Disable RLS on questions & question_options and update TK & SD default questions

ALTER TABLE public.questions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.questions TO anon, authenticated, service_role, public;
GRANT ALL ON public.question_options TO anon, authenticated, service_role, public;

DROP POLICY IF EXISTS "Anyone can read active questions" ON public.questions;
DROP POLICY IF EXISTS "Anyone can do all on questions" ON public.questions;
CREATE POLICY "Anyone can do all on questions" ON public.questions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can do all on question_options" ON public.question_options;
CREATE POLICY "Anyone can do all on question_options" ON public.question_options FOR ALL USING (true) WITH CHECK (true);

-- Seed / Replace TK & SD questions
DELETE FROM public.questions WHERE level = 'tksd';

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
  ('10000000-0000-4000-a000-000000000012', 'tksd', 'Jika ada sesi konsultasi GRATIS mengenai pendidikan anak, apakah Anda bersedia dihubungi?', 'single_choice', 12, true, true);

-- Insert options Q1
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('10000000-0000-4000-a000-000000000001', 'Belum Sekolah', 1),
  ('10000000-0000-4000-a000-000000000001', 'TK A', 2),
  ('10000000-0000-4000-a000-000000000001', 'TK B', 3),
  ('10000000-0000-4000-a000-000000000001', 'SD Kelas 1–3', 4),
  ('10000000-0000-4000-a000-000000000001', 'SD Kelas 4–6', 5);

-- Insert options Q2
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('10000000-0000-4000-a000-000000000002', '3 Tahun', 1),
  ('10000000-0000-4000-a000-000000000002', '4 Tahun', 2),
  ('10000000-0000-4000-a000-000000000002', '5 Tahun', 3),
  ('10000000-0000-4000-a000-000000000002', '6 Tahun', 4),
  ('10000000-0000-4000-a000-000000000002', '7–9 Tahun', 5),
  ('10000000-0000-4000-a000-000000000002', '10–12 Tahun', 6);

-- Insert options Q3
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('10000000-0000-4000-a000-000000000003', 'Sulit diatur', 1),
  ('10000000-0000-4000-a000-000000000003', 'Mudah marah', 2),
  ('10000000-0000-4000-a000-000000000003', 'Sulit fokus', 3),
  ('10000000-0000-4000-a000-000000000003', 'Terlalu aktif', 4),
  ('10000000-0000-4000-a000-000000000003', 'Pemalu', 5),
  ('10000000-0000-4000-a000-000000000003', 'Kurang percaya diri', 6),
  ('10000000-0000-4000-a000-000000000003', 'Terlalu bergantung pada orang tua', 7),
  ('10000000-0000-4000-a000-000000000003', 'Sulit berteman', 8),
  ('10000000-0000-4000-a000-000000000003', 'Terlalu sering bermain gadget', 9),
  ('10000000-0000-4000-a000-000000000003', 'Tidak ada kendala berarti', 10);

-- Insert options Q4
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('10000000-0000-4000-a000-000000000004', 'Kurang dari 30 menit', 1),
  ('10000000-0000-4000-a000-000000000004', '30 menit – 1 jam', 2),
  ('10000000-0000-4000-a000-000000000004', '1–2 jam', 3),
  ('10000000-0000-4000-a000-000000000004', 'Lebih dari 2 jam', 4),
  ('10000000-0000-4000-a000-000000000004', 'Hampir setiap waktu luang', 5);

-- Insert options Q5
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('10000000-0000-4000-a000-000000000005', 'Biasa saja', 1),
  ('10000000-0000-4000-a000-000000000005', 'Sedikit kecewa', 2),
  ('10000000-0000-4000-a000-000000000005', 'Rewel', 3),
  ('10000000-0000-4000-a000-000000000005', 'Menangis atau marah', 4),
  ('10000000-0000-4000-a000-000000000005', 'Sulit dialihkan ke aktivitas lain', 5);

-- Insert options Q6
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('10000000-0000-4000-a000-000000000006', 'Bermain di luar rumah', 1),
  ('10000000-0000-4000-a000-000000000006', 'Membaca buku', 2),
  ('10000000-0000-4000-a000-000000000006', 'Menggambar', 3),
  ('10000000-0000-4000-a000-000000000006', 'Bermain bersama teman', 4),
  ('10000000-0000-4000-a000-000000000006', 'Bermain gadget', 5),
  ('10000000-0000-4000-a000-000000000006', 'Menonton TV', 6);

-- Insert options Q7
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('10000000-0000-4000-a000-000000000007', 'Sudah terbiasa melakukan banyak hal sendiri', 1),
  ('10000000-0000-4000-a000-000000000007', 'Kadang masih dibantu', 2),
  ('10000000-0000-4000-a000-000000000007', 'Hampir semua masih dibantu orang tua', 3);

-- Insert options Q8
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('10000000-0000-4000-a000-000000000008', 'Mencoba sendiri', 1),
  ('10000000-0000-4000-a000-000000000008', 'Bertanya kepada orang tua', 2),
  ('10000000-0000-4000-a000-000000000008', 'Mudah menyerah', 3),
  ('10000000-0000-4000-a000-000000000008', 'Menangis atau marah', 4);

-- Insert options Q9
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('10000000-0000-4000-a000-000000000009', 'Sangat mudah berteman', 1),
  ('10000000-0000-4000-a000-000000000009', 'Perlu waktu beradaptasi', 2),
  ('10000000-0000-4000-a000-000000000009', 'Cenderung pemalu', 3),
  ('10000000-0000-4000-a000-000000000009', 'Lebih suka bermain sendiri', 4);

-- Insert options Q10
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('10000000-0000-4000-a000-000000000010', 'Akhlak dan adab', 1),
  ('10000000-0000-4000-a000-000000000010', 'Mandiri', 2),
  ('10000000-0000-4000-a000-000000000010', 'Percaya diri', 3),
  ('10000000-0000-4000-a000-000000000010', 'Disiplin', 4),
  ('10000000-0000-4000-a000-000000000010', 'Tanggung jawab', 5),
  ('10000000-0000-4000-a000-000000000010', 'Bahasa Inggris', 6),
  ('10000000-0000-4000-a000-000000000010', 'Akademik', 7),
  ('10000000-0000-4000-a000-000000000010', 'Kepemimpinan', 8);

-- Insert options Q11
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('10000000-0000-4000-a000-000000000011', 'Membentuk karakter yang baik', 1),
  ('10000000-0000-4000-a000-000000000011', 'Membiasakan anak mandiri', 2),
  ('10000000-0000-4000-a000-000000000011', 'Anak bahagia belajar', 3),
  ('10000000-0000-4000-a000-000000000011', 'Mampu berbahasa Inggris', 4),
  ('10000000-0000-4000-a000-000000000011', 'Hafal Al-Qur''an', 5),
  ('10000000-0000-4000-a000-000000000011', 'Prestasi akademik', 6),
  ('10000000-0000-4000-a000-000000000011', 'Mengurangi ketergantungan gadget', 7);

-- Insert options Q12
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('10000000-0000-4000-a000-000000000012', 'Ya', 1),
  ('10000000-0000-4000-a000-000000000012', 'Mungkin', 2),
  ('10000000-0000-4000-a000-000000000012', 'Tidak', 3);
