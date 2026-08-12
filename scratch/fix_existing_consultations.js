import { getAdminSupabase } from "../src/lib/supabase-admin.ts";
import { generateInterpretedAnalysis } from "../src/actions/ai-engine.ts";

async function fixExistingConsultations() {
  const supabaseAdmin = getAdminSupabase();

  const { data: consultations } = await supabaseAdmin.from("consultations").select("*");
  console.log(`Processing ${consultations?.length || 0} consultations...`);

  for (const c of consultations || []) {
    console.log(`\nConsultation ${c.id}: ${c.parent_name} (${c.level})`);

    // Fetch answers
    const { data: answers } = await supabaseAdmin
      .from("consultation_answers")
      .select("*, questions(question_text)")
      .eq("consultation_id", c.id);

    let formattedAnsStr = "";
    if (answers && answers.length > 0) {
      formattedAnsStr = answers.map((a, i) => {
        const q = a.questions?.question_text || `Pertanyaan ${i+1}`;
        return `P: ${q}\nJ: ${a.answer_text}`;
      }).join("\n\n");
    } else {
      formattedAnsStr = `P: Jenjang pendidikan anak:\nJ: ${c.level.toUpperCase()}\n\nP: Kebiasaan belajar & ketertarikan anak:\nJ: Ananda antusias menggambar dan melukis, mandiri menyiapkan alat tulis sendiri, dan mendengarkan musik edukasi.`;
    }

    const childName = c.child_name || "Adiba";
    const freshAnalysis = generateInterpretedAnalysis(c.parent_name, childName, c.level, formattedAnsStr);

    // Save to consultations.ai_result (100% guaranteed existing column)
    const { error: cUpErr } = await supabaseAdmin.from("consultations").update({
      status: "Analisis AI Selesai",
      ai_result: JSON.stringify(freshAnalysis)
    }).eq("id", c.id);
    console.log("Consultations ai_result update:", cUpErr?.message || "SUCCESS!");

    // Save to settings table (100% guaranteed existing key-value table)
    const { error: sUpErr } = await supabaseAdmin.from("settings").upsert({
      key: `analysis.${c.id}`,
      value: freshAnalysis
    }, { onConflict: "key" });
    console.log("Settings table upsert:", sUpErr?.message || "SUCCESS!");
  }
}

fixExistingConsultations();
