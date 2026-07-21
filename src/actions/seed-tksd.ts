import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) throw new Error("Missing Supabase credentials");
  return createClient(supabaseUrl, supabaseServiceKey);
}

export function isNewTKSDQuestions(qs: any[]): boolean {
  if (!qs || qs.length !== 12) return false;
  return qs.some(q => (q.question_text || "").includes("Anak Anda berada pada jenjang"));
}

export const DEFAULT_TKSD_QUESTIONS = [
  {
    id: "10000000-0000-4000-a000-000000000001",
    question_text: "Anak Anda berada pada jenjang",
    question_type: "single_choice" as const,
    order_index: 1,
    is_required: true,
    options: [
      { id: "opt-1-1", option_text: "Belum Sekolah", order_index: 1 },
      { id: "opt-1-2", option_text: "TK A", order_index: 2 },
      { id: "opt-1-3", option_text: "TK B", order_index: 3 },
      { id: "opt-1-4", option_text: "SD Kelas 1–3", order_index: 4 },
      { id: "opt-1-5", option_text: "SD Kelas 4–6", order_index: 5 },
    ],
  },
  {
    id: "10000000-0000-4000-a000-000000000002",
    question_text: "Usia anak",
    question_type: "single_choice" as const,
    order_index: 2,
    is_required: true,
    options: [
      { id: "opt-2-1", option_text: "3 Tahun", order_index: 1 },
      { id: "opt-2-2", option_text: "4 Tahun", order_index: 2 },
      { id: "opt-2-3", option_text: "5 Tahun", order_index: 3 },
      { id: "opt-2-4", option_text: "6 Tahun", order_index: 4 },
      { id: "opt-2-5", option_text: "7–9 Tahun", order_index: 5 },
      { id: "opt-2-6", option_text: "10–12 Tahun", order_index: 6 },
    ],
  },
  {
    id: "10000000-0000-4000-a000-000000000003",
    question_text: "Apa yang paling sering menjadi tantangan di rumah? (Pilih maksimal 3)",
    question_type: "multi_choice" as const,
    order_index: 3,
    is_required: true,
    options: [
      { id: "opt-3-1", option_text: "Sulit diatur", order_index: 1 },
      { id: "opt-3-2", option_text: "Mudah marah", order_index: 2 },
      { id: "opt-3-3", option_text: "Sulit fokus", order_index: 3 },
      { id: "opt-3-4", option_text: "Terlalu aktif", order_index: 4 },
      { id: "opt-3-5", option_text: "Pemalu", order_index: 5 },
      { id: "opt-3-6", option_text: "Kurang percaya diri", order_index: 6 },
      { id: "opt-3-7", option_text: "Terlalu bergantung pada orang tua", order_index: 7 },
      { id: "opt-3-8", option_text: "Sulit berteman", order_index: 8 },
      { id: "opt-3-9", option_text: "Terlalu sering bermain gadget", order_index: 9 },
      { id: "opt-3-10", option_text: "Tidak ada kendala berarti", order_index: 10 },
    ],
  },
  {
    id: "10000000-0000-4000-a000-000000000004",
    question_text: "Dalam sehari, rata-rata screen time anak adalah...",
    question_type: "single_choice" as const,
    order_index: 4,
    is_required: true,
    options: [
      { id: "opt-4-1", option_text: "Kurang dari 30 menit", order_index: 1 },
      { id: "opt-4-2", option_text: "30 menit – 1 jam", order_index: 2 },
      { id: "opt-4-3", option_text: "1–2 jam", order_index: 3 },
      { id: "opt-4-4", option_text: "Lebih dari 2 jam", order_index: 4 },
      { id: "opt-4-5", option_text: "Hampir setiap waktu luang", order_index: 5 },
    ],
  },
  {
    id: "10000000-0000-4000-a000-000000000005",
    question_text: "Saat gadget diambil, biasanya anak...",
    question_type: "single_choice" as const,
    order_index: 5,
    is_required: true,
    options: [
      { id: "opt-5-1", option_text: "Biasa saja", order_index: 1 },
      { id: "opt-5-2", option_text: "Sedikit kecewa", order_index: 2 },
      { id: "opt-5-3", option_text: "Rewel", order_index: 3 },
      { id: "opt-5-4", option_text: "Menangis atau marah", order_index: 4 },
      { id: "opt-5-5", option_text: "Sulit dialihkan ke aktivitas lain", order_index: 5 },
    ],
  },
  {
    id: "10000000-0000-4000-a000-000000000006",
    question_text: "Aktivitas apa yang paling sering dilakukan anak ketika di rumah?",
    question_type: "single_choice" as const,
    order_index: 6,
    is_required: true,
    options: [
      { id: "opt-6-1", option_text: "Bermain di luar rumah", order_index: 1 },
      { id: "opt-6-2", option_text: "Membaca buku", order_index: 2 },
      { id: "opt-6-3", option_text: "Menggambar", order_index: 3 },
      { id: "opt-6-4", option_text: "Bermain bersama teman", order_index: 4 },
      { id: "opt-6-5", option_text: "Bermain gadget", order_index: 5 },
      { id: "opt-6-6", option_text: "Menonton TV", order_index: 6 },
    ],
  },
  {
    id: "10000000-0000-4000-a000-000000000007",
    question_text: "Seberapa mandiri anak Anda?",
    question_type: "single_choice" as const,
    order_index: 7,
    is_required: true,
    options: [
      { id: "opt-7-1", option_text: "Sudah terbiasa melakukan banyak hal sendiri", order_index: 1 },
      { id: "opt-7-2", option_text: "Kadang masih dibantu", order_index: 2 },
      { id: "opt-7-3", option_text: "Hampir semua masih dibantu orang tua", order_index: 3 },
    ],
  },
  {
    id: "10000000-0000-4000-a000-000000000008",
    question_text: "Ketika menghadapi kesulitan, anak biasanya...",
    question_type: "single_choice" as const,
    order_index: 8,
    is_required: true,
    options: [
      { id: "opt-8-1", option_text: "Mencoba sendiri", order_index: 1 },
      { id: "opt-8-2", option_text: "Bertanya kepada orang tua", order_index: 2 },
      { id: "opt-8-3", option_text: "Mudah menyerah", order_index: 3 },
      { id: "opt-8-4", option_text: "Menangis atau marah", order_index: 4 },
    ],
  },
  {
    id: "10000000-0000-4000-a000-000000000009",
    question_text: "Bagaimana kemampuan anak dalam bersosialisasi?",
    question_type: "single_choice" as const,
    order_index: 9,
    is_required: true,
    options: [
      { id: "opt-9-1", option_text: "Sangat mudah berteman", order_index: 1 },
      { id: "opt-9-2", option_text: "Perlu waktu beradaptasi", order_index: 2 },
      { id: "opt-9-3", option_text: "Cenderung pemalu", order_index: 3 },
      { id: "opt-9-4", option_text: "Lebih suka bermain sendiri", order_index: 4 },
    ],
  },
  {
    id: "10000000-0000-4000-a000-000000000010",
    question_text: "Menurut Anda, nilai apa yang paling penting dimiliki anak? (Pilih maksimal 3)",
    question_type: "multi_choice" as const,
    order_index: 10,
    is_required: true,
    options: [
      { id: "opt-10-1", option_text: "Akhlak dan adab", order_index: 1 },
      { id: "opt-10-2", option_text: "Mandiri", order_index: 2 },
      { id: "opt-10-3", option_text: "Percaya diri", order_index: 3 },
      { id: "opt-10-4", option_text: "Disiplin", order_index: 4 },
      { id: "opt-10-5", option_text: "Tanggung jawab", order_index: 5 },
      { id: "opt-10-6", option_text: "Bahasa Inggris", order_index: 6 },
      { id: "opt-10-7", option_text: "Akademik", order_index: 7 },
      { id: "opt-10-8", option_text: "Kepemimpinan", order_index: 8 },
    ],
  },
  {
    id: "10000000-0000-4000-a000-000000000011",
    question_text: "Apa harapan terbesar Anda terhadap sekolah anak?",
    question_type: "multi_choice" as const,
    order_index: 11,
    is_required: true,
    options: [
      { id: "opt-11-1", option_text: "Membentuk karakter yang baik", order_index: 1 },
      { id: "opt-11-2", option_text: "Membiasakan anak mandiri", order_index: 2 },
      { id: "opt-11-3", option_text: "Anak bahagia belajar", order_index: 3 },
      { id: "opt-11-4", option_text: "Mampu berbahasa Inggris", order_index: 4 },
      { id: "opt-11-5", option_text: "Hafal Al-Qur'an", order_index: 5 },
      { id: "opt-11-6", option_text: "Prestasi akademik", order_index: 6 },
      { id: "opt-11-7", option_text: "Mengurangi ketergantungan gadget", order_index: 7 },
    ],
  },
  {
    id: "10000000-0000-4000-a000-000000000012",
    question_text: "Jika ada sesi konsultasi GRATIS mengenai pendidikan anak, apakah Anda bersedia dihubungi?",
    question_type: "single_choice" as const,
    order_index: 12,
    is_required: true,
    options: [
      { id: "opt-12-1", option_text: "Ya", order_index: 1 },
      { id: "opt-12-2", option_text: "Mungkin", order_index: 2 },
      { id: "opt-12-3", option_text: "Tidak", order_index: 3 },
    ],
  },
];

export async function seedTKSDQuestionsDirect() {
  const supabaseAdmin = getAdminSupabase();

  // 1. Delete existing questions for level 'tksd'
  const { error: delErr } = await supabaseAdmin.from("questions").delete().eq("level", "tksd");
  if (delErr) console.warn("Delete warning:", delErr.message);

  // 2. Insert new questions and options
  let successCount = 0;
  for (const q of DEFAULT_TKSD_QUESTIONS) {
    const { data: newQ, error: qErr } = await supabaseAdmin.from("questions").insert({
      id: q.id,
      level: "tksd",
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

export const seedTKSDAction = createServerFn({ method: "POST" })
  .handler(async () => {
    return await seedTKSDQuestionsDirect();
  });
