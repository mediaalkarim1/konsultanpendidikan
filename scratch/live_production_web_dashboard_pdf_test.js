import { submitConsultationAction } from "../src/actions/process-consultation.ts";
import { getLatestConsultationAnalysisHelper } from "../src/lib/pdf-generator.ts";
import { getAdminSupabase } from "../src/lib/supabase-admin.ts";

async function runLiveProductionAuditTest() {
  console.log("==================================================");
  console.log("LIVE PRODUCTION & PIPELINE AUDIT TEST");
  console.log("==================================================");

  try {
    const supabaseAdmin = getAdminSupabase();

    // 1. Fetch real questions for TKSD
    const { data: questions } = await supabaseAdmin
      .from("questions")
      .select("id, question_text")
      .eq("level", "tksd")
      .order("order_index", { ascending: true });

    console.log(`Fetched ${questions?.length || 0} TK/SD questions from DB.`);

    const q1Id = questions?.[0]?.id || "tksd-q1";
    const q2Id = questions?.[1]?.id || "tksd-q2";

    // 2. Submit Live Test for Ahmad Zamroni (Anak: Adiba)
    console.log("\n--- Submitting Live Assessment for Ahmad Zamroni (Anak: Adiba) ---");
    const payload = {
      parentName: "Ahmad Zamroni (Live Test)",
      childName: "Adiba",
      whatsappNumber: "081234567890",
      level: "tksd",
      answers: [
        {
          question_id: q1Id,
          question_text: "Bagaimana durasi penggunaan gawai / HP anak di rumah?",
          answer_text: "Memakai HP 1 jam sehari untuk menonton video edukasi mewarnai"
        },
        {
          question_id: q2Id,
          question_text: "Bagaimana tingkat kemandirian anak dalam kegiatan harian?",
          answer_text: "Anak sangat mandiri menyiapkan alat tulis sendiri dan antusias melukis gambar"
        }
      ]
    };

    const submitRes = await submitConsultationAction({ data: payload });
    console.log("Submit Result:", submitRes);

    if (!submitRes.success || !submitRes.id) {
      console.error("❌ FAIL: Submission failed:", submitRes.error);
      process.exit(1);
    }

    const consultId = submitRes.id;
    console.log(`✅ Consultation created with ID: ${consultId}`);

    // 3. Audit getLatestConsultationAnalysisHelper (Same data source for Web & PDF)
    console.log("\n--- Auditing Web/PDF Data Helper ---");
    const { consult, effectiveAnalysis, parsedSections } = await getLatestConsultationAnalysisHelper(consultId);

    console.log("\n[Parsed Report Sections Output]:");
    console.log("Summary:\n", parsedSections.summary);
    console.log("Concerns Titles:", parsedSections.concerns.map(c => c.title));
    console.log("Potentials Titles:", parsedSections.potentials.map(p => p.title));
    console.log("Recommendations Titles:", parsedSections.recommendations.map(r => r.title));
    console.log("Main Priorities (Must be empty!):", parsedSections.mainPriorities);

    // 4. Assertions
    let failed = false;

    if (parsedSections.summary.includes("perkembangan sesuai tahap jenjang")) {
      console.error("❌ FAIL: Summary contains generic template phrase!");
      failed = true;
    }

    if (parsedSections.potentials.length === 0) {
      console.error("❌ FAIL: Potentials section is missing!");
      failed = true;
    }

    if (parsedSections.mainPriorities.length > 0) {
      console.error("❌ FAIL: Main priorities section (Fokus Pendampingan Utama) was not removed!");
      failed = true;
    }

    const allTitles = [
      ...parsedSections.concerns.map(c => c.title),
      ...parsedSections.potentials.map(p => p.title)
    ].join(" ").toLowerCase();

    if (allTitles.includes("potensi positif pada aspek") || allTitles.includes("perhatian spesifik pada aspek")) {
      console.error("❌ FAIL: Output contains copy-paste banned phrases!");
      failed = true;
    }

    if (!failed) {
      console.log("\n🎉 LIVE PRODUCTION PIPELINE AUDIT TEST PASSED 100%!");
    } else {
      process.exit(1);
    }

  } catch (err) {
    console.error("Audit test exception:", err);
    process.exit(1);
  }
}

runLiveProductionAuditTest();
