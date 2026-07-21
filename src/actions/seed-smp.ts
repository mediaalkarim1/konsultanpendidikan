import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing Supabase credentials");
  return createClient(supabaseUrl, supabaseServiceKey);
}

export function isNewSMPQuestions(qs: any[]): boolean {
  if (!qs || qs.length !== 12) return false;
  return qs.some(q => (q.question_text || "").includes("Berapa usia anak Anda?"));
}

export const DEFAULT_SMP_QUESTIONS = [
  {
    id: "20000000-0000-4000-a000-000000000001",
    question_text: "Berapa usia anak Anda?",
    question_type: "single_choice" as const,
    order_index: 1,
    is_required: true,
    options: [
      { id: "smp-opt-1-1", option_text: "11 Tahun", order_index: 1 },
      { id: "smp-opt-1-2", option_text: "12 Tahun", order_index: 2 },
      { id: "smp-opt-1-3", option_text: "13 Tahun", order_index: 3 },
      { id: "smp-opt-1-4", option_text: "14 Tahun", order_index: 4 },
      { id: "smp-opt-1-5", option_text: "15 Tahun", order_index: 5 },
      { id: "smp-opt-1-6", option_text: "16 Tahun", order_index: 6 },
    ],
  },
  {
    id: "20000000-0000-4000-a000-000000000002",
    question_text: "Apa yang paling Anda khawatirkan terhadap perkembangan anak saat ini? (Pilih maksimal 3)",
    question_type: "multi_choice" as const,
    order_index: 2,
    is_required: true,
    options: [
      { id: "smp-opt-2-1", option_text: "Nilai akademik kurang optimal", order_index: 1 },
      { id: "smp-opt-2-2", option_text: "Kurang disiplin belajar", order_index: 2 },
      { id: "smp-opt-2-3", option_text: "Terlalu sering bermain gadget", order_index: 3 },
      { id: "smp-opt-2-4", option_text: "Sulit mengatur waktu", order_index: 4 },
      { id: "smp-opt-2-5", option_text: "Kurang percaya diri", order_index: 5 },
      { id: "smp-opt-2-6", option_text: "Mudah terpengaruh lingkungan", order_index: 6 },
      { id: "smp-opt-2-7", option_text: "Belum menemukan minat dan bakat", order_index: 7 },
      { id: "smp-opt-2-8", option_text: "Kurang bertanggung jawab", order_index: 8 },
      { id: "smp-opt-2-9", option_text: "Sulit berkomunikasi", order_index: 9 },
      { id: "smp-opt-2-10", option_text: "Tidak ada kekhawatiran khusus", order_index: 10 },
    ],
  },
  {
    id: "20000000-0000-4000-a000-000000000003",
    question_text: "Berapa lama rata-rata anak menggunakan gadget setiap hari?",
    question_type: "single_choice" as const,
    order_index: 3,
    is_required: true,
    options: [
      { id: "smp-opt-3-1", option_text: "Kurang dari 1 jam", order_index: 1 },
      { id: "smp-opt-3-2", option_text: "1–2 jam", order_index: 2 },
      { id: "smp-opt-3-3", option_text: "2–4 jam", order_index: 3 },
      { id: "smp-opt-3-4", option_text: "4–6 jam", order_index: 4 },
      { id: "smp-opt-3-5", option_text: "Lebih dari 6 jam", order_index: 5 },
    ],
  },
  {
    id: "20000000-0000-4000-a000-000000000004",
    question_text: "Aktivitas yang paling sering dilakukan anak di luar sekolah adalah...",
    question_type: "single_choice" as const,
    order_index: 4,
    is_required: true,
    options: [
      { id: "smp-opt-4-1", option_text: "Belajar", order_index: 1 },
      { id: "smp-opt-4-2", option_text: "Membaca buku", order_index: 2 },
      { id: "smp-opt-4-3", option_text: "Bermain olahraga", order_index: 3 },
      { id: "smp-opt-4-4", option_text: "Mengikuti organisasi", order_index: 4 },
      { id: "smp-opt-4-5", option_text: "Membuat karya atau proyek", order_index: 5 },
      { id: "smp-opt-4-6", option_text: "Bermain gadget", order_index: 6 },
      { id: "smp-opt-4-7", option_text: "Bermain game online", order_index: 7 },
      { id: "smp-opt-4-8", option_text: "Scroll media sosial", order_index: 8 },
    ],
  },
  {
    id: "20000000-0000-4000-a000-000000000005",
    question_text: "Ketika menghadapi tantangan atau tugas yang sulit, biasanya anak...",
    question_type: "single_choice" as const,
    order_index: 5,
    is_required: true,
    options: [
      { id: "smp-opt-5-1", option_text: "Berusaha menyelesaikan sendiri", order_index: 1 },
      { id: "smp-opt-5-2", option_text: "Berdiskusi dengan guru atau orang tua", order_index: 2 },
      { id: "smp-opt-5-3", option_text: "Menunda pekerjaan", order_index: 3 },
      { id: "smp-opt-5-4", option_text: "Mudah menyerah", order_index: 4 },
      { id: "smp-opt-5-5", option_text: "Menunggu bantuan orang lain", order_index: 5 },
    ],
  },
  {
    id: "20000000-0000-4000-a000-000000000006",
    question_text: "Seberapa sering anak mengikuti kegiatan di luar pembelajaran biasa?",
    question_type: "single_choice" as const,
    order_index: 6,
    is_required: true,
    options: [
      { id: "smp-opt-6-1", option_text: "Sangat sering", order_index: 1 },
      { id: "smp-opt-6-2", option_text: "Cukup sering", order_index: 2 },
      { id: "smp-opt-6-3", option_text: "Sesekali", order_index: 3 },
      { id: "smp-opt-6-4", option_text: "Hampir tidak pernah", order_index: 4 },
    ],
  },
  {
    id: "20000000-0000-4000-a000-000000000007",
    question_text: "Kemampuan apa yang menurut Anda paling perlu dikembangkan saat ini? (Pilih maksimal 3)",
    question_type: "multi_choice" as const,
    order_index: 7,
    is_required: true,
    options: [
      { id: "smp-opt-7-1", option_text: "Akademik", order_index: 1 },
      { id: "smp-opt-7-2", option_text: "Berpikir kritis", order_index: 2 },
      { id: "smp-opt-7-3", option_text: "Kreativitas", order_index: 3 },
      { id: "smp-opt-7-4", option_text: "Leadership", order_index: 4 },
      { id: "smp-opt-7-5", option_text: "Public Speaking", order_index: 5 },
      { id: "smp-opt-7-6", option_text: "Kerja sama tim", order_index: 6 },
      { id: "smp-opt-7-7", option_text: "Bahasa Inggris", order_index: 7 },
      { id: "smp-opt-7-8", option_text: "Digital Skill", order_index: 8 },
      { id: "smp-opt-7-9", option_text: "Kemandirian", order_index: 9 },
      { id: "smp-opt-7-10", option_text: "Problem Solving", order_index: 10 },
    ],
  },
  {
    id: "20000000-0000-4000-a000-000000000008",
    question_text: "Bagaimana kemampuan anak dalam menyampaikan pendapat?",
    question_type: "single_choice" as const,
    order_index: 8,
    is_required: true,
    options: [
      { id: "smp-opt-8-1", option_text: "Sangat percaya diri", order_index: 1 },
      { id: "smp-opt-8-2", option_text: "Cukup percaya diri", order_index: 2 },
      { id: "smp-opt-8-3", option_text: "Masih malu-malu", order_index: 3 },
      { id: "smp-opt-8-4", option_text: "Sulit mengungkapkan pendapat", order_index: 4 },
    ],
  },
  {
    id: "20000000-0000-4000-a000-000000000009",
    question_text: "Apakah anak sudah memiliki gambaran cita-cita atau tujuan masa depan?",
    question_type: "single_choice" as const,
    order_index: 9,
    is_required: true,
    options: [
      { id: "smp-opt-9-1", option_text: "Sudah sangat jelas", order_index: 1 },
      { id: "smp-opt-9-2", option_text: "Mulai memiliki gambaran", order_index: 2 },
      { id: "smp-opt-9-3", option_text: "Masih berubah-ubah", order_index: 3 },
      { id: "smp-opt-9-4", option_text: "Belum memiliki gambaran", order_index: 4 },
    ],
  },
  {
    id: "20000000-0000-4000-a000-000000000010",
    question_text: "Apa yang paling Anda harapkan dari lingkungan pendidikan anak? (Pilih maksimal 3)",
    question_type: "multi_choice" as const,
    order_index: 10,
    is_required: true,
    options: [
      { id: "smp-opt-10-1", option_text: "Akademik yang kuat", order_index: 1 },
      { id: "smp-opt-10-2", option_text: "Pembentukan akhlak dan karakter", order_index: 2 },
      { id: "smp-opt-10-3", option_text: "Pembelajaran berbasis proyek", order_index: 3 },
      { id: "smp-opt-10-4", option_text: "Persiapan jenjang pendidikan berikutnya", order_index: 4 },
      { id: "smp-opt-10-5", option_text: "Bahasa Inggris aktif", order_index: 5 },
      { id: "smp-opt-10-6", option_text: "Kepemimpinan", order_index: 6 },
      { id: "smp-opt-10-7", option_text: "Kewirausahaan", order_index: 7 },
      { id: "smp-opt-10-8", option_text: "Prestasi lomba", order_index: 8 },
    ],
  },
  {
    id: "20000000-0000-4000-a000-000000000011",
    question_text: "Menurut Anda, pendidikan yang ideal seharusnya...",
    question_type: "single_choice" as const,
    order_index: 11,
    is_required: true,
    options: [
      { id: "smp-opt-11-1", option_text: "Fokus pada nilai akademik", order_index: 1 },
      { id: "smp-opt-11-2", option_text: "Seimbang antara akademik dan karakter", order_index: 2 },
      { id: "smp-opt-11-3", option_text: "Banyak praktik dan proyek nyata", order_index: 3 },
      { id: "smp-opt-11-4", option_text: "Mengembangkan potensi sesuai minat anak", order_index: 4 },
      { id: "smp-opt-11-5", option_text: "Membekali keterampilan masa depan", order_index: 5 },
    ],
  },
  {
    id: "20000000-0000-4000-a000-000000000012",
    question_text: "Apakah Anda bersedia mendapatkan hasil analisis lengkap beserta rekomendasi pendidikan yang sesuai untuk anak Anda?",
    question_type: "single_choice" as const,
    order_index: 12,
    is_required: true,
    options: [
      { id: "smp-opt-12-1", option_text: "Ya", order_index: 1 },
      { id: "smp-opt-12-2", option_text: "Mungkin nanti", order_index: 2 },
      { id: "smp-opt-12-3", option_text: "Tidak", order_index: 3 },
    ],
  },
];

export async function seedSMPQuestionsDirect() {
  const supabaseAdmin = getAdminSupabase();

  // 1. Delete existing questions for level 'smp'
  const { error: delErr } = await supabaseAdmin.from("questions").delete().eq("level", "smp");
  if (delErr) console.warn("Delete warning:", delErr.message);

  // 2. Insert new questions and options
  let successCount = 0;
  for (const q of DEFAULT_SMP_QUESTIONS) {
    const { data: newQ, error: qErr } = await supabaseAdmin.from("questions").insert({
      id: q.id,
      level: "smp",
      question_text: q.question_text,
      question_type: q.question_type,
      order_index: q.order_index,
      is_required: true,
      is_active: true
    }).select().single();

    if (qErr) {
      console.error(`Error inserting question "${q.question_text}":`, qErr.message);
      continue;
    }

    const optionsPayload = q.options.map((opt, idx) => ({
      question_id: newQ.id,
      option_text: opt.option_text,
      order_index: idx + 1
    }));

    const { error: optErr } = await supabaseAdmin.from("question_options").insert(optionsPayload);
    if (optErr) {
      console.error(`Error inserting options for "${q.question_text}":`, optErr.message);
    } else {
      successCount++;
    }
  }

  return { success: true, count: successCount };
}

export const seedSMPAction = createServerFn({ method: "POST" })
  .handler(async () => {
    return await seedSMPQuestionsDirect();
  });
