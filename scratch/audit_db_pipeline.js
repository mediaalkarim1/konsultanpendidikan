import { getAdminSupabase } from "../src/lib/supabase-admin.ts";

async function auditDatabasePipeline() {
  try {
    const supabaseAdmin = getAdminSupabase();
    console.log("==================================================");
    console.log("DATABASE PIPELINE AUDIT LOG");
    console.log("==================================================");

    // 1. Fetch consultations
    const { data: consultations, error: consErr } = await supabaseAdmin
      .from("consultations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    console.log(`[Consultations] Count: ${consultations?.length || 0}, Error: ${consErr?.message || "none"}`);
    if (consultations && consultations.length > 0) {
      for (const c of consultations) {
        console.log(`\n--- Consultation ID: ${c.id} (${c.parent_name} / ${c.child_name || "-"} / ${c.level}) ---`);
        console.log(`Status: ${c.status}`);

        // Fetch answers
        const { data: answers } = await supabaseAdmin
          .from("consultation_answers")
          .select("*, questions(question_text)")
          .eq("consultation_id", c.id);
        
        console.log(`Answers count: ${answers?.length || 0}`);
        (answers || []).forEach((a, i) => {
          const qText = a.questions?.question_text || a.question_id;
          console.log(`  Q${i+1}: ${qText}`);
          console.log(`  Ans: ${a.answer_text || a.answer || a.selected_option_ids}`);
        });

        // Fetch analysis
        const { data: analysisRows } = await supabaseAdmin
          .from("consultation_analysis")
          .select("*")
          .eq("consultation_id", c.id)
          .order("updated_at", { ascending: false, nullsFirst: false });

        console.log(`Analysis rows count: ${analysisRows?.length || 0}`);
        if (analysisRows && analysisRows.length > 0) {
          const a = analysisRows[0];
          console.log("Analysis Summary:", a.summary?.slice(0, 120));
          console.log("Analysis Weaknesses (Concerns):", a.weaknesses?.slice(0, 120));
          console.log("Analysis Strengths (Potentials):", a.strengths?.slice(0, 120));
          console.log("Analysis Recs:", a.education_recommendation?.slice(0, 120));
          if (a.analysis_json) {
            console.log("Analysis JSON:", JSON.stringify(a.analysis_json).slice(0, 150));
          }
        }
      }
    }

    // 2. Fetch clean assessments table if exists
    try {
      const { data: cleanAss } = await supabaseAdmin.from("assessments").select("*").limit(5);
      console.log(`\n[Clean Assessments Table] Count: ${cleanAss?.length || 0}`);
    } catch (e) {
      console.log("\n[Clean Assessments Table] Error:", e.message);
    }

  } catch (err) {
    console.error("Audit error:", err);
  }
}

auditDatabasePipeline();
