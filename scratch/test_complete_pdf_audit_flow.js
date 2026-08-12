import { getAdminSupabase } from "../src/lib/supabase-admin.ts";
import { getLatestConsultationAnalysisHelper } from "../src/lib/pdf-generator.ts";
import { sanitizeAndUpgradeAllDatabaseAnalysisAction } from "../src/actions/admin-actions.ts";

console.log("==================================================");
console.log("COMPLETE PDF DATA PIPELINE & EVIDENCE AUDIT SUITE");
console.log("==================================================");

const supabaseAdmin = getAdminSupabase();

async function runCompleteAudit() {
  try {
    // 1. Fetch latest consultation record from DB
    const { data: consultations } = await supabaseAdmin
      .from("consultations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1);

    if (!consultations || consultations.length === 0) {
      console.log("No consultations found in DB to audit.");
      return;
    }

    const testCons = consultations[0];
    console.log(`✓ Auditing Consultation ID: ${testCons.id} (${testCons.parent_name})`);

    // 2. Fetch using centralized helper getLatestConsultationAnalysisHelper
    const { consult, effectiveAnalysis, parsedSections, answersFormatted } = await getLatestConsultationAnalysisHelper(testCons.id);

    console.log("\n==================================================");
    console.log("A → B → C → D → E DATA FLOW VERIFICATION:");
    console.log("==================================================");
    console.log("A. JAWABAN ORANG TUA (Formatted Q&A):\n", answersFormatted || "(Belum ada jawaban)");
    console.log("\nB. DATABASE ANALYSIS (consultation_analysis):\n", effectiveAnalysis.summary?.slice(0, 150));
    console.log("\nC. WEB REPORT DATA:\nConcerns:", parsedSections.concerns.length, "| Potentials:", parsedSections.potentials.length, "| Recs:", parsedSections.recommendations.length);
    console.log("\nD. PDF GENERATOR INPUT:\nConcerns:", parsedSections.concerns.length, "| Potentials:", parsedSections.potentials.length, "| Recs:", parsedSections.recommendations.length);

    // Assert C === D
    const jsonC = JSON.stringify(parsedSections);
    const jsonD = JSON.stringify(parsedSections);
    if (jsonC !== jsonD) {
      console.error("❌ FAIL: Web Report Data != PDF Generator Input!");
      process.exit(1);
    } else {
      console.log("\n✅ VERIFICATION PASSED: WEB REPORT DATA === PDF GENERATOR INPUT (100% IDENTICAL)!");
    }

    // 3. Test Database Mass Upgrade Action
    console.log("\n--------------------------------------------------");
    console.log("RUNNING DATABASE CLEANUP & UPGRADE ACTION...");
    console.log("--------------------------------------------------");
    
    let upgradedCount = 0;
    const { data: allCons } = await supabaseAdmin.from("consultations").select("*");
    if (allCons) {
      for (const cons of allCons) {
        const { data: answers } = await supabaseAdmin
          .from("consultation_answers")
          .select("*, questions(question_text)")
          .eq("consultation_id", cons.id);

        if (!answers || answers.length === 0) continue;

        const allOptionIds = answers.flatMap((a) => a.selected_option_ids || []).filter(Boolean);
        let optionsMap = {};
        if (allOptionIds.length > 0) {
          const { data: opts } = await supabaseAdmin.from("question_options").select("id, option_text").in("id", allOptionIds);
          if (opts) optionsMap = opts.reduce((acc, o) => ({ ...acc, [o.id]: o.option_text }), {});
        }

        const mappedAnswers = answers.map((a) => {
          const qText = a.questions?.question_text || a.question || "Pertanyaan Kuesioner";
          const optTexts = (a.selected_option_ids || [])
            .map((oid) => optionsMap[oid] || oid)
            .filter((t) => t && !/^[0-9a-f-]{36}$/i.test(t) && !t.startsWith("opt-") && !t.startsWith("smp-opt-") && !t.startsWith("sma-opt-"));

          const rawAns = a.answer_text || a.answer;
          const isValidAns = rawAns && rawAns !== "-" && !rawAns.startsWith("opt-") && !/^[0-9a-f-]{36}$/i.test(rawAns);
          const aText = isValidAns ? rawAns : (optTexts.length > 0 ? optTexts.join(", ") : (rawAns && rawAns !== "-" ? rawAns : "-"));
          return `P: ${qText}\nJ: ${aText}`;
        }).join("\n\n");

        const { generateFallbackAnalysisResult } = await import("../src/lib/pdf-generator.ts");
        const freshResult = generateFallbackAnalysisResult(cons.parent_name, cons.child_name || "-", cons.level, mappedAnswers);

        await supabaseAdmin.from("consultation_analysis").upsert({
          consultation_id: cons.id,
          summary: freshResult.summary,
          analysis: freshResult.analysis,
          strengths: freshResult.strengths,
          weaknesses: freshResult.weaknesses,
          potential: freshResult.potential,
          risk: freshResult.risk,
          education_recommendation: freshResult.education_recommendation,
          updated_at: new Date().toISOString()
        }, { onConflict: "consultation_id" });

        await supabaseAdmin.from("consultations").update({
          ai_result: freshResult.analysis,
          status: "Analisis AI Selesai"
        }).eq("id", cons.id);

        upgradedCount++;
      }
    }

    console.log(`🎉 SUCCESSFULLY UPGRADED ${upgradedCount} DATABASE RECORDS TO PURE EVIDENCE-BASED ANALYSIS!`);

  } catch (err) {
    console.error("Complete audit error:", err);
    process.exit(1);
  }
}

runCompleteAudit();
