-- Migration: Update questions and options for SMP level

-- Delete existing questions for SMP
DELETE FROM public.questions WHERE level = 'smp';

-- Insert new 12 questions for SMP
INSERT INTO public.questions (id, level, question_text, question_type, order_index, is_required, is_active) VALUES
  ('20000000-0000-4000-a000-000000000001', 'smp', 'Berapa usia anak Anda?', 'single_choice', 1, true, true),
  ('20000000-0000-4000-a000-000000000002', 'smp', 'Apa yang paling Anda khawatirkan terhadap perkembangan anak saat ini? (Pilih maksimal 3)', 'multi_choice', 2, true, true),
  ('20000000-0000-4000-a000-000000000003', 'smp', 'Berapa lama rata-rata anak menggunakan gadget setiap hari?', 'single_choice', 3, true, true),
  ('20000000-0000-4000-a000-000000000004', 'smp', 'Aktivitas yang paling sering dilakukan anak di luar sekolah adalah...', 'single_choice', 4, true, true),
  ('20000000-0000-4000-a000-000000000005', 'smp', 'Ketika menghadapi tantangan atau tugas yang sulit, biasanya anak...', 'single_choice', 5, true, true),
  ('20000000-0000-4000-a000-000000000006', 'smp', 'Seberapa sering anak mengikuti kegiatan di luar pembelajaran biasa?', 'single_choice', 6, true, true),
  ('20000000-0000-4000-a000-000000000007', 'smp', 'Kemampuan apa yang menurut Anda paling perlu dikembangkan saat ini? (Pilih maksimal 3)', 'multi_choice', 7, true, true),
  ('20000000-0000-4000-a000-000000000008', 'smp', 'Bagaimana kemampuan anak dalam menyampaikan pendapat?', 'single_choice', 8, true, true),
  ('20000000-0000-4000-a000-000000000009', 'smp', 'Apakah anak sudah memiliki gambaran cita-cita atau tujuan masa depan?', 'single_choice', 9, true, true),
  ('20000000-0000-4000-a000-000000000010', 'smp', 'Apa yang paling Anda harapkan dari lingkungan pendidikan anak? (Pilih maksimal 3)', 'multi_choice', 10, true, true),
  ('20000000-0000-4000-a000-000000000011', 'smp', 'Menurut Anda, pendidikan yang ideal seharusnya...', 'single_choice', 11, true, true),
  ('20000000-0000-4000-a000-000000000012', 'smp', 'Apakah Anda bersedia mendapatkan hasil analisis lengkap beserta rekomendasi pendidikan yang sesuai untuk anak Anda?', 'single_choice', 12, true, true);

-- Insert options Q1
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('20000000-0000-4000-a000-000000000001', '11 Tahun', 1),
  ('20000000-0000-4000-a000-000000000001', '12 Tahun', 2),
  ('20000000-0000-4000-a000-000000000001', '13 Tahun', 3),
  ('20000000-0000-4000-a000-000000000001', '14 Tahun', 4),
  ('20000000-0000-4000-a000-000000000001', '15 Tahun', 5),
  ('20000000-0000-4000-a000-000000000001', '16 Tahun', 6);

-- Insert options Q2
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('20000000-0000-4000-a000-000000000002', 'Nilai akademik kurang optimal', 1),
  ('20000000-0000-4000-a000-000000000002', 'Kurang disiplin belajar', 2),
  ('20000000-0000-4000-a000-000000000002', 'Terlalu sering bermain gadget', 3),
  ('20000000-0000-4000-a000-000000000002', 'Sulit mengatur waktu', 4),
  ('20000000-0000-4000-a000-000000000002', 'Kurang percaya diri', 5),
  ('20000000-0000-4000-a000-000000000002', 'Mudah terpengaruh lingkungan', 6),
  ('20000000-0000-4000-a000-000000000002', 'Belum menemukan minat dan bakat', 7),
  ('20000000-0000-4000-a000-000000000002', 'Kurang bertanggung jawab', 8),
  ('20000000-0000-4000-a000-000000000002', 'Sulit berkomunikasi', 9),
  ('20000000-0000-4000-a000-000000000002', 'Tidak ada kekhawatiran khusus', 10);

-- Insert options Q3
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('20000000-0000-4000-a000-000000000003', 'Kurang dari 1 jam', 1),
  ('20000000-0000-4000-a000-000000000003', '1–2 jam', 2),
  ('20000000-0000-4000-a000-000000000003', '2–4 jam', 3),
  ('20000000-0000-4000-a000-000000000003', '4–6 jam', 4),
  ('20000000-0000-4000-a000-000000000003', 'Lebih dari 6 jam', 5);

-- Insert options Q4
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('20000000-0000-4000-a000-000000000004', 'Belajar', 1),
  ('20000000-0000-4000-a000-000000000004', 'Membaca buku', 2),
  ('20000000-0000-4000-a000-000000000004', 'Bermain olahraga', 3),
  ('20000000-0000-4000-a000-000000000004', 'Mengikuti organisasi', 4),
  ('20000000-0000-4000-a000-000000000004', 'Membuat karya atau proyek', 5),
  ('20000000-0000-4000-a000-000000000004', 'Bermain gadget', 6),
  ('20000000-0000-4000-a000-000000000004', 'Bermain game online', 7),
  ('20000000-0000-4000-a000-000000000004', 'Scroll media sosial', 8);

-- Insert options Q5
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('20000000-0000-4000-a000-000000000005', 'Berusaha menyelesaikan sendiri', 1),
  ('20000000-0000-4000-a000-000000000005', 'Berdiskusi dengan guru atau orang tua', 2),
  ('20000000-0000-4000-a000-000000000005', 'Menunda pekerjaan', 3),
  ('20000000-0000-4000-a000-000000000005', 'Mudah menyerah', 4),
  ('20000000-0000-4000-a000-000000000005', 'Menunggu bantuan orang lain', 5);

-- Insert options Q6
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('20000000-0000-4000-a000-000000000006', 'Sangat sering', 1),
  ('20000000-0000-4000-a000-000000000006', 'Cukup sering', 2),
  ('20000000-0000-4000-a000-000000000006', 'Sesekali', 3),
  ('20000000-0000-4000-a000-000000000006', 'Hampir tidak pernah', 4);

-- Insert options Q7
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('20000000-0000-4000-a000-000000000007', 'Akademik', 1),
  ('20000000-0000-4000-a000-000000000007', 'Berpikir kritis', 2),
  ('20000000-0000-4000-a000-000000000007', 'Kreativitas', 3),
  ('20000000-0000-4000-a000-000000000007', 'Leadership', 4),
  ('20000000-0000-4000-a000-000000000007', 'Public Speaking', 5),
  ('20000000-0000-4000-a000-000000000007', 'Kerja sama tim', 6),
  ('20000000-0000-4000-a000-000000000007', 'Bahasa Inggris', 7),
  ('20000000-0000-4000-a000-000000000007', 'Digital Skill', 8),
  ('20000000-0000-4000-a000-000000000007', 'Kemandirian', 9),
  ('20000000-0000-4000-a000-000000000007', 'Problem Solving', 10);

-- Insert options Q8
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('20000000-0000-4000-a000-000000000008', 'Sangat percaya diri', 1),
  ('20000000-0000-4000-a000-000000000008', 'Cukup percaya diri', 2),
  ('20000000-0000-4000-a000-000000000008', 'Masih malu-malu', 3),
  ('20000000-0000-4000-a000-000000000008', 'Sulit mengungkapkan pendapat', 4);

-- Insert options Q9
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('20000000-0000-4000-a000-000000000009', 'Sudah sangat jelas', 1),
  ('20000000-0000-4000-a000-000000000009', 'Mulai memiliki gambaran', 2),
  ('20000000-0000-4000-a000-000000000009', 'Masih berubah-ubah', 3),
  ('20000000-0000-4000-a000-000000000009', 'Belum memiliki gambaran', 4);

-- Insert options Q10
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('20000000-0000-4000-a000-000000000010', 'Akademik yang kuat', 1),
  ('20000000-0000-4000-a000-000000000010', 'Pembentukan akhlak dan karakter', 2),
  ('20000000-0000-4000-a000-000000000010', 'Pembelajaran berbasis proyek', 3),
  ('20000000-0000-4000-a000-000000000010', 'Persiapan jenjang pendidikan berikutnya', 4),
  ('20000000-0000-4000-a000-000000000010', 'Bahasa Inggris aktif', 5),
  ('20000000-0000-4000-a000-000000000010', 'Kepemimpinan', 6),
  ('20000000-0000-4000-a000-000000000010', 'Kewirausahaan', 7),
  ('20000000-0000-4000-a000-000000000010', 'Prestasi lomba', 8);

-- Insert options Q11
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('20000000-0000-4000-a000-000000000011', 'Fokus pada nilai akademik', 1),
  ('20000000-0000-4000-a000-000000000011', 'Seimbang antara akademik dan karakter', 2),
  ('20000000-0000-4000-a000-000000000011', 'Banyak praktik dan proyek nyata', 3),
  ('20000000-0000-4000-a000-000000000011', 'Mengembangkan potensi sesuai minat anak', 4),
  ('20000000-0000-4000-a000-000000000011', 'Membekali keterampilan masa depan', 5);

-- Insert options Q12
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('20000000-0000-4000-a000-000000000012', 'Ya', 1),
  ('20000000-0000-4000-a000-000000000012', 'Mungkin nanti', 2),
  ('20000000-0000-4000-a000-000000000012', 'Tidak', 3);
