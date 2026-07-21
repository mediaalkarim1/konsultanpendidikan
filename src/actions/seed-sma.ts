import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing Supabase credentials");
  return createClient(supabaseUrl, supabaseServiceKey);
}

export function isNewSMAQuestions(qs: any[]): boolean {
  if (!qs || qs.length !== 12) return false;
  return qs.some(q => (q.question_text || "").includes("pemetaan arah masa depan"));
}

export const DEFAULT_SMA_QUESTIONS = [
  {
    id: "30000000-0000-4000-a000-000000000001",
    question_text: "Untuk mengawali pemetaan arah masa depan, berapa usia anak Anda saat ini?",
    question_type: "single_choice" as const,
    order_index: 1,
    is_required: true,
    options: [
      { id: "sma-opt-1-1", option_text: "15 Tahun", order_index: 1 },
      { id: "sma-opt-1-2", option_text: "16 Tahun", order_index: 2 },
      { id: "sma-opt-1-3", option_text: "17 Tahun", order_index: 3 },
      { id: "sma-opt-1-4", option_text: "18 Tahun", order_index: 4 },
    ],
  },
  {
    id: "30000000-0000-4000-a000-000000000002",
    question_text: "Menjelang kelulusan sekolah dan persiapan karier, apa yang paling Anda khawatirkan terhadap perkembangan anak saat ini? (Pilih maksimal 3)",
    question_type: "multi_choice" as const,
    order_index: 2,
    is_required: true,
    options: [
      { id: "sma-opt-2-1", option_text: "Belum memiliki tujuan hidup yang jelas", order_index: 1 },
      { id: "sma-opt-2-2", option_text: "Bingung menentukan jurusan kuliah", order_index: 2 },
      { id: "sma-opt-2-3", option_text: "Nilai akademik belum optimal", order_index: 3 },
      { id: "sma-opt-2-4", option_text: "Terlalu sering bermain gadget", order_index: 4 },
      { id: "sma-opt-2-5", option_text: "Kurang percaya diri", order_index: 5 },
      { id: "sma-opt-2-6", option_text: "Kurang disiplin", order_index: 6 },
      { id: "sma-opt-2-7", option_text: "Sulit mengembangkan potensi diri", order_index: 7 },
      { id: "sma-opt-2-8", option_text: "Belum memiliki pengalaman organisasi atau proyek", order_index: 8 },
      { id: "sma-opt-2-9", option_text: "Belum tertarik pada dunia usaha atau bisnis", order_index: 9 },
      { id: "sma-opt-2-10", option_text: "Mudah terpengaruh lingkungan", order_index: 10 },
      { id: "sma-opt-2-11", option_text: "Tidak ada kekhawatiran khusus", order_index: 11 },
    ],
  },
  {
    id: "30000000-0000-4000-a000-000000000003",
    question_text: "Terkait rencana jangka panjang, setelah lulus SMA menurut Anda anak lebih tertarik...",
    question_type: "single_choice" as const,
    order_index: 3,
    is_required: true,
    options: [
      { id: "sma-opt-3-1", option_text: "Melanjutkan kuliah", order_index: 1 },
      { id: "sma-opt-3-2", option_text: "Mencari beasiswa", order_index: 2 },
      { id: "sma-opt-3-3", option_text: "Langsung bekerja", order_index: 3 },
      { id: "sma-opt-3-4", option_text: "Membangun usaha sendiri", order_index: 4 },
      { id: "sma-opt-3-5", option_text: "Masih belum memiliki gambaran", order_index: 5 },
    ],
  },
  {
    id: "30000000-0000-4000-a000-000000000004",
    question_text: "Mengenai pemetaan potensi diri, apakah menurut Anda anak sudah mengetahui kelebihan dan potensinya?",
    question_type: "single_choice" as const,
    order_index: 4,
    is_required: true,
    options: [
      { id: "sma-opt-4-1", option_text: "Sudah sangat memahami", order_index: 1 },
      { id: "sma-opt-4-2", option_text: "Mulai mengetahui", order_index: 2 },
      { id: "sma-opt-4-3", option_text: "Masih mencari", order_index: 3 },
      { id: "sma-opt-4-4", option_text: "Belum mengetahui", order_index: 4 },
    ],
  },
  {
    id: "30000000-0000-4000-a000-000000000005",
    question_text: "Dalam membangun pengalaman mandiri, seberapa sering anak mengikuti kegiatan di luar pembelajaran akademik?",
    question_type: "single_choice" as const,
    order_index: 5,
    is_required: true,
    options: [
      { id: "sma-opt-5-1", option_text: "Sangat sering", order_index: 1 },
      { id: "sma-opt-5-2", option_text: "Cukup sering", order_index: 2 },
      { id: "sma-opt-5-3", option_text: "Sesekali", order_index: 3 },
      { id: "sma-opt-5-4", option_text: "Hampir tidak pernah", order_index: 4 },
    ],
  },
  {
    id: "30000000-0000-4000-a000-000000000006",
    question_text: "Untuk memahami minat utamanya, aktivitas yang paling sering dilakukan anak di luar sekolah adalah...",
    question_type: "single_choice" as const,
    order_index: 6,
    is_required: true,
    options: [
      { id: "sma-opt-6-1", option_text: "Belajar", order_index: 1 },
      { id: "sma-opt-6-2", option_text: "Mengikuti organisasi", order_index: 2 },
      { id: "sma-opt-6-3", option_text: "Mengembangkan hobi", order_index: 3 },
      { id: "sma-opt-6-4", option_text: "Membuat karya atau proyek", order_index: 4 },
      { id: "sma-opt-6-5", option_text: "Berolahraga", order_index: 5 },
      { id: "sma-opt-6-6", option_text: "Bermain gadget", order_index: 6 },
      { id: "sma-opt-6-7", option_text: "Bermain game", order_index: 7 },
      { id: "sma-opt-6-8", option_text: "Media sosial", order_index: 8 },
    ],
  },
  {
    id: "30000000-0000-4000-a000-000000000007",
    question_text: "Terkait karya atau kewirausahaan, apakah anak pernah memiliki pengalaman menghasilkan karya, produk, atau bisnis sederhana?",
    question_type: "single_choice" as const,
    order_index: 7,
    is_required: true,
    options: [
      { id: "sma-opt-7-1", option_text: "Sudah memiliki usaha sendiri", order_index: 1 },
      { id: "sma-opt-7-2", option_text: "Pernah menjual produk atau jasa", order_index: 2 },
      { id: "sma-opt-7-3", option_text: "Pernah mengikuti bazar atau proyek kewirausahaan", order_index: 3 },
      { id: "sma-opt-7-4", option_text: "Baru memiliki ketertarikan", order_index: 4 },
      { id: "sma-opt-7-5", option_text: "Belum pernah sama sekali", order_index: 5 },
    ],
  },
  {
    id: "30000000-0000-4000-a000-000000000008",
    question_text: "Menghadapi dunia perkuliahan dan kerja, kemampuan apa yang menurut Anda paling perlu dikembangkan? (Pilih maksimal 3)",
    question_type: "multi_choice" as const,
    order_index: 8,
    is_required: true,
    options: [
      { id: "sma-opt-8-1", option_text: "Akademik", order_index: 1 },
      { id: "sma-opt-8-2", option_text: "Public Speaking", order_index: 2 },
      { id: "sma-opt-8-3", option_text: "Leadership", order_index: 3 },
      { id: "sma-opt-8-4", option_text: "Problem Solving", order_index: 4 },
      { id: "sma-opt-8-5", option_text: "Kreativitas", order_index: 5 },
      { id: "sma-opt-8-6", option_text: "Bahasa Inggris", order_index: 6 },
      { id: "sma-opt-8-7", option_text: "Digital Skill", order_index: 7 },
      { id: "sma-opt-8-8", option_text: "Kewirausahaan", order_index: 8 },
      { id: "sma-opt-8-9", option_text: "Manajemen Keuangan", order_index: 9 },
      { id: "sma-opt-8-10", option_text: "Networking", order_index: 10 },
    ],
  },
  {
    id: "30000000-0000-4000-a000-000000000009",
    question_text: "Saat dihadapkan pada hambatan atau tantangan baru, biasanya anak...",
    question_type: "single_choice" as const,
    order_index: 9,
    is_required: true,
    options: [
      { id: "sma-opt-9-1", option_text: "Mencari solusi sendiri", order_index: 1 },
      { id: "sma-opt-9-2", option_text: "Berdiskusi dengan orang lain", order_index: 2 },
      { id: "sma-opt-9-3", option_text: "Menunggu arahan", order_index: 3 },
      { id: "sma-opt-9-4", option_text: "Mudah menyerah", order_index: 4 },
    ],
  },
  {
    id: "30000000-0000-4000-a000-000000000010",
    question_text: "Untuk bekal masa depan yang relevan, menurut Anda pendidikan yang ideal seharusnya lebih banyak memberikan... (Pilih maksimal 3)",
    question_type: "multi_choice" as const,
    order_index: 10,
    is_required: true,
    options: [
      { id: "sma-opt-10-1", option_text: "Penguatan akademik", order_index: 1 },
      { id: "sma-opt-10-2", option_text: "Pembelajaran berbasis proyek", order_index: 2 },
      { id: "sma-opt-10-3", option_text: "Pengembangan minat dan bakat", order_index: 3 },
      { id: "sma-opt-10-4", option_text: "Persiapan kuliah", order_index: 4 },
      { id: "sma-opt-10-5", option_text: "Persiapan dunia kerja", order_index: 5 },
      { id: "sma-opt-10-6", option_text: "Pengalaman bisnis dan entrepreneurship", order_index: 6 },
      { id: "sma-opt-10-7", option_text: "Leadership", order_index: 7 },
      { id: "sma-opt-10-8", option_text: "Bahasa Inggris aktif", order_index: 8 },
      { id: "sma-opt-10-9", option_text: "Portofolio dan prestasi", order_index: 9 },
    ],
  },
  {
    id: "30000000-0000-4000-a000-000000000011",
    question_text: "Dalam mengukur kesiapan anak, seberapa penting menurut Anda pengalaman nyata (seperti proyek, magang, bisnis, atau kompetisi) dibandingkan nilai akademik?",
    question_type: "single_choice" as const,
    order_index: 11,
    is_required: true,
    options: [
      { id: "sma-opt-11-1", option_text: "Sangat penting", order_index: 1 },
      { id: "sma-opt-11-2", option_text: "Penting", order_index: 2 },
      { id: "sma-opt-11-3", option_text: "Cukup penting", order_index: 3 },
      { id: "sma-opt-11-4", option_text: "Kurang penting", order_index: 4 },
    ],
  },
  {
    id: "30000000-0000-4000-a000-000000000012",
    question_text: "Untuk pendampingan pemetaan jurusan dan potensi karier, jika tersedia sesi konsultasi GRATIS, apakah Anda bersedia dihubungi?",
    question_type: "single_choice" as const,
    order_index: 12,
    is_required: true,
    options: [
      { id: "sma-opt-12-1", option_text: "Ya", order_index: 1 },
      { id: "sma-opt-12-2", option_text: "Mungkin", order_index: 2 },
      { id: "sma-opt-12-3", option_text: "Tidak", order_index: 3 },
    ],
  },
];

export async function seedSMAQuestionsDirect() {
  const supabaseAdmin = getAdminSupabase();

  // 1. Delete existing questions for level 'sma'
  const { error: delErr } = await supabaseAdmin.from("questions").delete().eq("level", "sma");
  if (delErr) console.warn("Delete warning:", delErr.message);

  // 2. Insert new questions and options
  let successCount = 0;
  for (const q of DEFAULT_SMA_QUESTIONS) {
    const { data: newQ, error: qErr } = await supabaseAdmin.from("questions").insert({
      id: q.id,
      level: "sma",
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

export const seedSMAAction = createServerFn({ method: "POST" })
  .handler(async () => {
    return await seedSMAQuestionsDirect();
  });
