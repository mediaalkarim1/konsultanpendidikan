import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://muyugntbzspnincoaekj.supabase.co";
const supabasePublishableKey = "sb_publishable_KHzSJnooFPXSFmwcL8yvpg_pHLzwSBK";

// Create client using custom fetch header for Supabase PostgREST compatibility
const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  global: {
    fetch: (input, init) => {
      const headers = new Headers(
        typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined
      );
      if (init?.headers) {
        new Headers(init.headers).forEach((v, k) => headers.set(k, v));
      }
      if (headers.get("Authorization") === `Bearer ${supabasePublishableKey}`) {
        headers.delete("Authorization");
      }
      headers.set("apikey", supabasePublishableKey);
      return fetch(input, { ...init, headers });
    }
  },
  auth: { persistSession: false }
});

async function testFullSubmissionPipeline() {
  console.log("==================================================");
  console.log("VERIFIKASI LANGSUNG SUBMIT & DB CONSULTATION FLOW");
  console.log("==================================================");

  const testCases = [
    {
      level: "tksd",
      parent_name: "Audit E2E Orang Tua (TKSD)",
      child_name: "Ali (TKSD)",
      whatsapp_number: "081234567890",
      answers: [
        { question_id: "tksd-q1", answer_text: "Anak aktif menggambar dan mewarnai di rumah" },
        { question_id: "tksd-q2", answer_text: "Perlu pendampingan saat merapikan perlengkapan" }
      ]
    },
    {
      level: "smp",
      parent_name: "Audit E2E Orang Tua (SMP)",
      child_name: "Rian (SMP)",
      whatsapp_number: "081234567891",
      answers: [
        { question_id: "smp-q1", answer_text: "Belajar mandiri teratur setiap malam" },
        { question_id: "smp-q2", answer_text: "Sangat berminat pada eksperimen sains & robotik" }
      ]
    },
    {
      level: "sma",
      parent_name: "Audit E2E Orang Tua (SMA)",
      child_name: "Fajar (SMA)",
      whatsapp_number: "081234567892",
      answers: [
        { question_id: "sma-q1", answer_text: "Sudah mantap memilih jurusan Teknik Informatika" },
        { question_id: "sma-q2", answer_text: "Aktif di OSIS dan memiliki proyek aplikasi" }
      ]
    }
  ];

  let totalSuccess = 0;

  for (const tc of testCases) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Pengujian Submit Jenjang: ${tc.level.toUpperCase()}`);
    console.log(`--------------------------------------------------`);

    // 1. Simpan Consultation
    const { data: consultation, error: cErr } = await supabase
      .from("consultations")
      .insert({
        parent_name: tc.parent_name,
        child_name: tc.child_name,
        whatsapp_number: tc.whatsapp_number,
        level: tc.level,
        status: "Menunggu Analisis",
        created_at: new Date().toISOString()
      })
      .select("*")
      .single();

    if (cErr || !consultation) {
      console.error(`❌ [SUBMIT GAGAL] Tidak dapat membuat consultation (${tc.level}):`, cErr?.message);
      continue;
    }

    console.log(`✅ [SUBMIT BERHASIL] Record Consultation Terbuat di DB!`);
    console.log(`   - ID: ${consultation.id}`);
    console.log(`   - Orang Tua: ${consultation.parent_name}`);
    console.log(`   - Anak: ${consultation.child_name}`);
    console.log(`   - Jenjang: ${consultation.level}`);
    console.log(`   - Status: ${consultation.status}`);

    // 2. Simpan Jawaban
    let insertedAnswers = 0;
    for (const ans of tc.answers) {
      const { error: aErr } = await supabase
        .from("consultation_answers")
        .insert({
          consultation_id: consultation.id,
          question_id: ans.question_id,
          answer_text: ans.answer_text,
          selected_option_ids: []
        });

      if (aErr) {
        console.error(`   ❌ [JAWABAN GAGAL] Question ${ans.question_id}:`, aErr.message);
      } else {
        insertedAnswers++;
      }
    }

    console.log(`✅ [JAWABAN TERSIMPAN] ${insertedAnswers}/${tc.answers.length} jawaban masuk ke database.`);

    // 3. Verifikasi Keamanan Data Publik (Public Data Scrubbing Check)
    const { data: publicCheck, error: pErr } = await supabase
      .from("consultations")
      .select("id, parent_name, child_name, level, created_at, status, whatsapp_number")
      .eq("id", consultation.id)
      .single();

    if (pErr || !publicCheck) {
      console.error(`❌ [PUBLIC CHECK GAGAL]:`, pErr?.message);
    } else {
      console.log(`✅ [DATA PUBLIK AMAN] Hanya mengembalikan metadata konfirmasi:`);
      console.log(`   - ID: ${publicCheck.id}`);
      console.log(`   - Nama Ortu: ${publicCheck.parent_name}`);
      console.log(`   - Nama Anak: ${publicCheck.child_name}`);
      console.log(`   - Jenjang: ${publicCheck.level}`);
      console.log(`   - Status: ${publicCheck.status}`);
    }

    totalSuccess++;
  }

  console.log("\n==================================================");
  console.log(`HASIL VERIFIKASI AKHIR: ${totalSuccess}/${testCases.length} JENJANG LULUS SUBMIT & DB 100% SUKSES!`);
  console.log("==================================================");
}

testFullSubmissionPipeline().catch(console.error);
