import { getAdminSupabase } from "../src/lib/supabase-admin.ts";

async function checkAndFixRls() {
  console.log("Testing submit with getAdminSupabase()...");
  const supabase = getAdminSupabase();

  const testId = `test-rls-${Date.now()}`;
  const { data, error } = await supabase
    .from("consultations")
    .insert({
      id: testId,
      parent_name: "Audit Test Parent",
      child_name: "Audit Test Child",
      whatsapp_number: "081234567890",
      level: "tksd",
      status: "Menunggu Analisis"
    })
    .select("*")
    .single();

  if (error) {
    console.error("❌ Insert error:", error.message);
  } else {
    console.log("✅ Insert success! ID:", data.id);
    
    // Test insert answer
    const { error: aErr } = await supabase
      .from("consultation_answers")
      .insert({
        consultation_id: data.id,
        question_id: "tksd-q1",
        answer_text: "Tes jawaban RLS"
      });

    if (aErr) {
      console.error("❌ Answer insert error:", aErr.message);
    } else {
      console.log("✅ Answer insert success!");
    }

    // Clean up test record
    await supabase.from("consultation_answers").delete().eq("consultation_id", data.id);
    await supabase.from("consultations").delete().eq("id", data.id);
    console.log("✅ Cleaned up test record.");
  }
}

checkAndFixRls();
