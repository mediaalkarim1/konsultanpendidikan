import { getAdminSupabase } from "../src/lib/supabase-admin.ts";

async function testInsertFix() {
  const supabaseAdmin = getAdminSupabase();

  const { data: c } = await supabaseAdmin.from("consultations").insert({
    parent_name: "Test Parent Fix",
    whatsapp_number: "08123456789",
    level: "tksd",
    status: "Testing"
  }).select("*").single();

  console.log("Consultation inserted:", c?.id);
  if (!c) return;

  // Test inserting with valid columns only: consultation_id, question_id, answer_text
  const payload = {
    consultation_id: c.id,
    question_id: "10000000-0000-4000-a000-000000000001",
    answer_text: "Jawaban TK SD Berhasil"
  };

  const { data: a, error: aErr } = await supabaseAdmin.from("consultation_answers").insert(payload).select("*");
  console.log("Try Fix Result:", a, "Err:", aErr?.message || "NONE!");

  // Clean test
  await supabaseAdmin.from("consultations").delete().eq("id", c.id);
}

testInsertFix();
