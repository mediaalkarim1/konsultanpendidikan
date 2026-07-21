-- Migration: Update questions and options for SMA level

-- Delete existing questions for SMA
DELETE FROM public.questions WHERE level = 'sma';

-- Insert new 12 questions for SMA
INSERT INTO public.questions (id, level, question_text, question_type, order_index, is_required, is_active) VALUES
  ('30000000-0000-4000-a000-000000000001', 'sma', 'Berapa usia anak Anda?', 'single_choice', 1, true, true),
  ('30000000-0000-4000-a000-000000000002', 'sma', 'Apa yang paling Anda khawatirkan terhadap perkembangan anak saat ini? (Pilih maksimal 3)', 'multi_choice', 2, true, true),
  ('30000000-0000-4000-a000-000000000003', 'sma', 'Setelah lulus SMA, menurut Anda anak lebih tertarik...', 'single_choice', 3, true, true),
  ('30000000-0000-4000-a000-000000000004', 'sma', 'Menurut Anda, apakah anak sudah mengetahui kelebihan atau potensinya?', 'single_choice', 4, true, true),
  ('30000000-0000-4000-a000-000000000005', 'sma', 'Seberapa sering anak mengikuti kegiatan di luar pembelajaran akademik?', 'single_choice', 5, true, true),
  ('30000000-0000-4000-a000-000000000006', 'sma', 'Aktivitas yang paling sering dilakukan anak di luar sekolah adalah...', 'single_choice', 6, true, true),
  ('30000000-0000-4000-a000-000000000007', 'sma', 'Apakah anak pernah memiliki pengalaman menghasilkan karya, produk, atau bisnis sederhana?', 'single_choice', 7, true, true),
  ('30000000-0000-4000-a000-000000000008', 'sma', 'Kemampuan apa yang menurut Anda paling perlu dikembangkan? (Pilih maksimal 3)', 'multi_choice', 8, true, true),
  ('30000000-0000-4000-a000-000000000009', 'sma', 'Ketika menghadapi tantangan, biasanya anak...', 'single_choice', 9, true, true),
  ('30000000-0000-4000-a000-000000000010', 'sma', 'Menurut Anda, pendidikan yang ideal seharusnya lebih banyak memberikan... (Pilih maksimal 3)', 'multi_choice', 10, true, true),
  ('30000000-0000-4000-a000-000000000011', 'sma', 'Seberapa penting menurut Anda pengalaman nyata seperti proyek, magang, bisnis, atau kompetisi dibandingkan nilai akademik?', 'single_choice', 11, true, true),
  ('30000000-0000-4000-a000-000000000012', 'sma', 'Jika tersedia sesi konsultasi GRATIS mengenai pemetaan potensi dan arah masa depan anak, apakah Anda bersedia dihubungi?', 'single_choice', 12, true, true);

-- Insert options Q1
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('30000000-0000-4000-a000-000000000001', '15 Tahun', 1),
  ('30000000-0000-4000-a000-000000000001', '16 Tahun', 2),
  ('30000000-0000-4000-a000-000000000001', '17 Tahun', 3),
  ('30000000-0000-4000-a000-000000000001', '18 Tahun', 4);

-- Insert options Q2
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('30000000-0000-4000-a000-000000000002', 'Belum memiliki tujuan hidup yang jelas', 1),
  ('30000000-0000-4000-a000-000000000002', 'Bingung menentukan jurusan kuliah', 2),
  ('30000000-0000-4000-a000-000000000002', 'Nilai akademik belum optimal', 3),
  ('30000000-0000-4000-a000-000000000002', 'Terlalu sering bermain gadget', 4),
  ('30000000-0000-4000-a000-000000000002', 'Kurang percaya diri', 5),
  ('30000000-0000-4000-a000-000000000002', 'Kurang disiplin', 6),
  ('30000000-0000-4000-a000-000000000002', 'Sulit mengembangkan potensi diri', 7),
  ('30000000-0000-4000-a000-000000000002', 'Belum memiliki pengalaman organisasi atau proyek', 8),
  ('30000000-0000-4000-a000-000000000002', 'Belum tertarik pada dunia usaha atau bisnis', 9),
  ('30000000-0000-4000-a000-000000000002', 'Mudah terpengaruh lingkungan', 10),
  ('30000000-0000-4000-a000-000000000002', 'Tidak ada kekhawatiran khusus', 11);

-- Insert options Q3
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('30000000-0000-4000-a000-000000000003', 'Melanjutkan kuliah', 1),
  ('30000000-0000-4000-a000-000000000003', 'Mencari beasiswa', 2),
  ('30000000-0000-4000-a000-000000000003', 'Langsung bekerja', 3),
  ('30000000-0000-4000-a000-000000000003', 'Membangun usaha sendiri', 4),
  ('30000000-0000-4000-a000-000000000003', 'Masih belum memiliki gambaran', 5);

-- Insert options Q4
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('30000000-0000-4000-a000-000000000004', 'Sudah sangat memahami', 1),
  ('30000000-0000-4000-a000-000000000004', 'Mulai mengetahui', 2),
  ('30000000-0000-4000-a000-000000000004', 'Masih mencari', 3),
  ('30000000-0000-4000-a000-000000000004', 'Belum mengetahui', 4);

-- Insert options Q5
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('30000000-0000-4000-a000-000000000005', 'Sangat sering', 1),
  ('30000000-0000-4000-a000-000000000005', 'Cukup sering', 2),
  ('30000000-0000-4000-a000-000000000005', 'Sesekali', 3),
  ('30000000-0000-4000-a000-000000000005', 'Hampir tidak pernah', 4);

-- Insert options Q6
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('30000000-0000-4000-a000-000000000006', 'Belajar', 1),
  ('30000000-0000-4000-a000-000000000006', 'Mengikuti organisasi', 2),
  ('30000000-0000-4000-a000-000000000006', 'Mengembangkan hobi', 3),
  ('30000000-0000-4000-a000-000000000006', 'Membuat karya atau proyek', 4),
  ('30000000-0000-4000-a000-000000000006', 'Berolahraga', 5),
  ('30000000-0000-4000-a000-000000000006', 'Bermain gadget', 6),
  ('30000000-0000-4000-a000-000000000006', 'Bermain game', 7),
  ('30000000-0000-4000-a000-000000000006', 'Media sosial', 8);

-- Insert options Q7
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('30000000-0000-4000-a000-000000000007', 'Sudah memiliki usaha sendiri', 1),
  ('30000000-0000-4000-a000-000000000007', 'Pernah menjual produk atau jasa', 2),
  ('30000000-0000-4000-a000-000000000007', 'Pernah mengikuti bazar atau proyek kewirausahaan', 3),
  ('30000000-0000-4000-a000-000000000007', 'Baru memiliki ketertarikan', 4),
  ('30000000-0000-4000-a000-000000000007', 'Belum pernah sama sekali', 5);

-- Insert options Q8
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('30000000-0000-4000-a000-000000000008', 'Akademik', 1),
  ('30000000-0000-4000-a000-000000000008', 'Public Speaking', 2),
  ('30000000-0000-4000-a000-000000000008', 'Leadership', 3),
  ('30000000-0000-4000-a000-000000000008', 'Problem Solving', 4),
  ('30000000-0000-4000-a000-000000000008', 'Kreativitas', 5),
  ('30000000-0000-4000-a000-000000000008', 'Bahasa Inggris', 6),
  ('30000000-0000-4000-a000-000000000008', 'Digital Skill', 7),
  ('30000000-0000-4000-a000-000000000008', 'Kewirausahaan', 8),
  ('30000000-0000-4000-a000-000000000008', 'Manajemen Keuangan', 9),
  ('30000000-0000-4000-a000-000000000008', 'Networking', 10);

-- Insert options Q9
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('30000000-0000-4000-a000-000000000009', 'Mencari solusi sendiri', 1),
  ('30000000-0000-4000-a000-000000000009', 'Berdiskusi dengan orang lain', 2),
  ('30000000-0000-4000-a000-000000000009', 'Menunggu arahan', 3),
  ('30000000-0000-4000-a000-000000000009', 'Mudah menyerah', 4);

-- Insert options Q10
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('30000000-0000-4000-a000-000000000010', 'Penguatan akademik', 1),
  ('30000000-0000-4000-a000-000000000010', 'Pembelajaran berbasis proyek', 2),
  ('30000000-0000-4000-a000-000000000010', 'Pengembangan minat dan bakat', 3),
  ('30000000-0000-4000-a000-000000000010', 'Persiapan kuliah', 4),
  ('30000000-0000-4000-a000-000000000010', 'Persiapan dunia kerja', 5),
  ('30000000-0000-4000-a000-000000000010', 'Pengalaman bisnis dan entrepreneurship', 6),
  ('30000000-0000-4000-a000-000000000010', 'Leadership', 7),
  ('30000000-0000-4000-a000-000000000010', 'Bahasa Inggris aktif', 8),
  ('30000000-0000-4000-a000-000000000010', 'Portofolio dan prestasi', 9);

-- Insert options Q11
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('30000000-0000-4000-a000-000000000011', 'Sangat penting', 1),
  ('30000000-0000-4000-a000-000000000011', 'Penting', 2),
  ('30000000-0000-4000-a000-000000000011', 'Cukup penting', 3),
  ('30000000-0000-4000-a000-000000000011', 'Kurang penting', 4);

-- Insert options Q12
INSERT INTO public.question_options (question_id, option_text, order_index) VALUES
  ('30000000-0000-4000-a000-000000000012', 'Ya', 1),
  ('30000000-0000-4000-a000-000000000012', 'Mungkin', 2),
  ('30000000-0000-4000-a000-000000000012', 'Tidak', 3);
