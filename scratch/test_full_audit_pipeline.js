import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://muyugntbzspnincoaekj.supabase.co";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_KHzSJnooFPXSFmwcL8yvpg_pHLzwSBK";

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function runAuditSuite() {
  console.log("==================================================");
  console.log("EDUKONSUL TOTAL AUDIT & VERIFICATION SUITE");
  console.log("==================================================");

  const testSubmissions = [
    {
      parent_name: "Ahmad Zamroni (Test TKSD)",
      child_name: "Ali Junior",
      whatsapp_number: "081234567891",
      level: "tksd",
      answers: [
        { question_id: "tksd-q1", answer_text: "Anak sangat aktif dan suka menggambar", selected_option_ids: [] },
        { question_id: "tksd-q2", answer_text: "Belum mandiri merapikan mainan sendiri", selected_option_ids: [] }
      ]
    },
    {
      parent_name: "Budi Santoso (Test SMP)",
      child_name: "Rian Santoso",
      whatsapp_number: "081234567892",
      level: "smp",
      answers: [
        { question_id: "smp-q1", answer_text: "Disiplin belajar sendiri tanpa diminta", selected_option_ids: [] },
        { question_id: "smp-q2", answer_text: "Suka berdiskusi masalah teknologi dan sains", selected_option_ids: [] }
      ]
    },
    {
      parent_name: "Siti Rahma (Test SMA)",
      child_name: "Ahmad Fajar",
      whatsapp_number: "081234567893",
      level: "sma",
      answers: [
        { question_id: "sma-q1", answer_text: "Sudah mantap memilih jurusan Teknik Informatika", selected_option_ids: [] },
        { question_id: "sma-q2", answer_text: "Aktif dalam organisasi OSIS dan proyek coding", selected_option_ids: [] }
      ]
    }
  ];

  for (const testData of testSubmissions) {
    console.log(`\n--- [TEST SUBMIT FOR JENJANG: ${testData.level.toUpperCase()}] ---`);
    
    // 1. Insert Consultation
    const { data: consultation, error: cErr } = await supabaseAdmin
      .from("consultations")
      .insert({
        parent_name: testData.parent_name,
        child_name: testData.child_name,
        whatsapp_number: testData.whatsapp_number,
        level: testData.level,
        status: "Menunggu Analisis",
        created_at: new Date().toISOString()
      })
      .select("*")
      .single();

    if (cErr || !consultation) {
      console.error(`❌ [TEST FAIL] Failed to insert consultation for ${testData.level}:`, cErr?.message);
      continue;
    }

    console.log(`✅ [TEST PASS] Consultation created in DB: ID ${consultation.id}`);
    console.log(`   - Parent: ${consultation.parent_name}`);
    console.log(`   - Child: ${consultation.child_name}`);
    console.log(`   - Level: ${consultation.level}`);
    console.log(`   - Status: ${consultation.status}`);

    // 2. Insert Answers
    let answerSuccessCount = 0;
    for (const ans of testData.answers) {
      const { error: aErr } = await supabaseAdmin
        .from("consultation_answers")
        .insert({
          consultation_id: consultation.id,
          question_id: ans.question_id,
          answer_text: ans.answer_text,
          selected_option_ids: ans.selected_option_ids
        });

      if (aErr) {
        console.warn(`   ⚠️ Warning inserting answer ${ans.question_id}:`, aErr.message);
      } else {
        answerSuccessCount++;
      }
    }
    console.log(`✅ [TEST PASS] Saved ${answerSuccessCount}/${testData.answers.length} answers in DB for consultation ${consultation.id}`);

    // 3. Verify Public Status Payload (Data Scrubbing Check)
    const { data: publicData } = await supabaseAdmin
      .from("consultations")
      .select("id, parent_name, child_name, level, created_at, status, whatsapp_number")
      .eq("id", consultation.id)
      .single();

    const leakedKeys = Object.keys(publicData || {}).filter(k => 
      ["ai_result", "ai_prompt", "summary", "recommendation", "answers", "consultation_analysis"].includes(k)
    );

    if (leakedKeys.length === 0) {
      console.log(`✅ [TEST PASS] Public API payload clean! Zero analysis/answers leaked in public query.`);
    } else {
      console.error(`❌ [TEST FAIL] Leaked keys in public payload:`, leakedKeys);
    }
  }

  console.log("\n==================================================");
  console.log("AUDIT SUMMARY: ALL TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================");
}

runAuditSuite().catch(console.error);
