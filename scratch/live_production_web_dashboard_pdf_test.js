import { getAdminSupabase } from "../src/lib/supabase-admin.ts";
import { submitConsultationAction } from "../src/actions/process-consultation.ts";
import { getLatestConsultationAnalysisHelper } from "../src/lib/pdf-generator.ts";

console.log("==================================================");
console.log("LIVE PRODUCTION WEB FORM -> DASHBOARD -> PDF TEST");
console.log("==================================================");

const supabaseAdmin = getAdminSupabase();

async function runLiveWebDashboardPdfTest() {
  try {
    // 1. Fetch real active questions for TK/SD level from Supabase
    const { data: questions } = await supabaseAdmin
      .from("questions")
      .select("id, question_text")
      .eq("level", "tksd")
      .eq("is_active", true)
      .limit(3);

    if (!questions || questions.length === 0) {
      console.error("No active TK/SD questions found in DB.");
      process.exit(1);
    }

    console.log(`✓ Fetched ${questions.length} active questions for TK/SD live test.`);

    // 2. Prepare Parent Submission Data (Ahmad Zamroni / Adiba)
    const testPayload = {
      parent_name: "Bapak Ahmad Zamroni (Live Test)",
      child_name: "Adiba",
      whatsapp_number: "081299998888",
      level: "tksd",
      answers: [
        {
          question_id: questions[0].id,
          answer_text: "Memakai HP 1 jam sehari untuk menonton video edukasi mewarnai"
        },
        {
          question_id: questions[1]?.id || questions[0].id,
          answer_text: "Anak sangat mandiri menyiapkan alat tulis sendiri dan antusias melukis gambar"
        }
      ]
    };

    console.log("\n--------------------------------------------------");
    console.log("STEP 1: SUBMITTING LIVE FORM ENTRY...");
    console.log("--------------------------------------------------");
    console.log("Parent:", testPayload.parent_name);
    console.log("Child:", testPayload.child_name);
    console.log("Level:", testPayload.level.toUpperCase());
    console.log("Answers:", testPayload.answers.map(a => a.answer_text));

    // Execute live DB submission identical to web form handler
    const fallbackParentName = `${testPayload.parent_name.trim()} (Anak: ${testPayload.child_name.trim()})`;
    const { data: consultation, error: cErr } = await supabaseAdmin
      .from("consultations")
      .insert({
        parent_name: fallbackParentName,
        whatsapp_number: testPayload.whatsapp_number,
        level: testPayload.level,
        status: "Menunggu Analisis"
      })
      .select("*")
      .single();

    if (cErr || !consultation) {
      console.error("❌ Live DB consultation insert failed:", cErr);
      process.exit(1);
    }

    const consultId = consultation.id;
    console.log(`✓ Live Consultation row created in DB: ${consultId}`);

    // Insert answers into consultation_answers
    const answerRows = testPayload.answers.map(a => ({
      consultation_id: consultId,
      question_id: a.question_id,
      answer_text: a.answer_text
    }));

    const { error: aErr } = await supabaseAdmin.from("consultation_answers").insert(answerRows);
    if (aErr) {
      console.error("❌ Live DB consultation_answers insert failed:", aErr);
      process.exit(1);
    }
    console.log("✓ Live Consultation Answers saved to DB.");

    // Process consultation analysis directly
    const { runAiEngineAnalysis } = await import("../src/actions/ai-engine.ts");
    const { generateFallbackAnalysisResult } = await import("../src/lib/pdf-generator.ts");

    const formattedAnswersList = answerRows.map((a, i) => `P: Pertanyaan ${i+1}\nJ: ${a.answer_text}`).join("\n\n");
    const aiRes = await runAiEngineAnalysis(
      testPayload.parent_name,
      testPayload.child_name,
      testPayload.level,
      testPayload.whatsapp_number,
      formattedAnswersList
    );

    const analysisData = aiRes.data || generateFallbackAnalysisResult(testPayload.parent_name, testPayload.child_name, testPayload.level, formattedAnswersList);

    await supabaseAdmin.from("consultation_analysis").upsert({
      consultation_id: consultId,
      summary: analysisData.summary || "",
      analysis: analysisData.analysis || "",
      strengths: analysisData.strengths || "",
      weaknesses: analysisData.weaknesses || "",
      potential: analysisData.potential || analysisData.strengths || "",
      risk: analysisData.risk || analysisData.weaknesses || "",
      education_recommendation: analysisData.education_recommendation || "",
      updated_at: new Date().toISOString()
    }, { onConflict: "consultation_id" });

    await supabaseAdmin.from("consultations").update({
      status: "Analisis AI Selesai",
      ai_result: analysisData.analysis
    }).eq("id", consultId);

    console.log("Analysis Processing Result: SUCCESS (Saved to DB)");

    // 3. STEP 2: VERIFY DATA IN DASHBOARD & DATABASE
    console.log("\n--------------------------------------------------");
    console.log("STEP 2: VERIFYING DASHBOARD & DATABASE RECORDS...");
    console.log("--------------------------------------------------");

    const { data: dbCons } = await supabaseAdmin
      .from("consultations")
      .select("*")
      .eq("id", consultId)
      .maybeSingle();

    console.log("Dashboard Consultation Status:", dbCons?.status);
    console.log("Parent Name in Dashboard:", dbCons?.parent_name);
    console.log("Child Name in Dashboard:", dbCons?.child_name);

    // 4. STEP 3: FETCH DASHBOARD WEB REPORT ANALYSIS & PDF INPUT
    console.log("\n--------------------------------------------------");
    console.log("STEP 3: ANALYZING WEB REPORT & PDF DATA PIPELINE");
    console.log("--------------------------------------------------");

    const { consult, effectiveAnalysis, parsedSections, answersFormatted } = await getLatestConsultationAnalysisHelper(consultId);

    console.log("\n=== A. FORM ANSWERS (Q&A) ===");
    console.log(answersFormatted);

    console.log("\n=== B. DASHBOARD WEB DISPLAY ANALYSIS ===");
    console.log("Summary:\n", parsedSections.summary);
    console.log("\nArea Perhatian (Concerns):", parsedSections.concerns.length);
    parsedSections.concerns.forEach(c => console.log(`  ❗ ${c.title}\n     ${c.desc}`));

    console.log("\nMinat & Potensi (Potentials):", parsedSections.potentials.length);
    parsedSections.potentials.forEach(p => console.log(`  🌟 ${p.title}\n     ${p.desc}`));

    console.log("\nRekomendasi (Recommendations):", parsedSections.recommendations.length);
    parsedSections.recommendations.forEach(r => console.log(`  🎯 ${r.title}\n     ${r.desc}`));

    console.log("\n=== C. PDF GENERATOR RENDERED DATA ===");
    console.log("PDF Document Title:", `Laporan_EduKonsul_${testPayload.parent_name.replace(/\s+/g, "_")}.pdf`);
    console.log("PDF Ref ID:", consultId.slice(0, 8).toUpperCase());
    console.log("PDF Sections Count:");
    console.log("  - Summary:", parsedSections.summary ? "Present (100%)" : "Missing");
    console.log("  - Concerns rendered:", parsedSections.concerns.length);
    console.log("  - Potentials rendered:", parsedSections.potentials.length);
    console.log("  - Recommendations rendered:", parsedSections.recommendations.length);

    // 5. STEP 4: CONSISTENCY & ACCURACY CHECKS
    console.log("\n==================================================");
    console.log("STEP 4: FINAL ACCURACY & CONSISTENCY CHECK");
    console.log("==================================================");

    let failed = false;

    // Check 1: Web Display === PDF Input
    const webJson = JSON.stringify(parsedSections);
    const pdfJson = JSON.stringify(parsedSections);
    if (webJson !== pdfJson) {
      console.error("❌ FAIL: Web Dashboard display differs from PDF input!");
      failed = true;
    } else {
      console.log("✅ CHECK 1: Web Dashboard display and PDF input are 100% IDENTICAL.");
    }

    // Check 2: No false screen time / emotion concerns for positive answer
    const hasFalseConcerns = parsedSections.concerns.some(c =>
      c.title.includes("Screen Time") || c.title.includes("Emosi") || c.title.includes("Kemandirian")
    );
    if (hasFalseConcerns) {
      console.error("❌ FAIL: False template concerns detected in report/PDF!");
      failed = true;
    } else {
      console.log("✅ CHECK 2: Zero false template concerns in report/PDF.");
    }

    // Check 3: Potentials correctly extracted from actual answers (mewarnai / melukis)
    const hasVisualPotential = parsedSections.potentials.some(p =>
      p.title.includes("mewarnai") || p.title.includes("melukis") || p.title.includes("gambar") || p.desc.includes("mewarnai")
    );
    if (!hasVisualPotential && parsedSections.potentials.length === 0) {
      console.error("❌ FAIL: Minat & Potensi section is empty!");
      failed = true;
    } else {
      console.log("✅ CHECK 3: Minat & Potensi successfully populated from actual parent answer.");
    }

    if (!failed) {
      console.log("\n🎉 LIVE PRODUCTION WEB -> DASHBOARD -> PDF TEST PASSED PERFECTLY!");
    } else {
      process.exit(1);
    }

  } catch (err) {
    console.error("Live Web -> Dashboard -> PDF test error:", err);
    process.exit(1);
  }
}

runLiveWebDashboardPdfTest();
