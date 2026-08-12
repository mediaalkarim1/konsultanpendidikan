import { generateInterpretedAnalysis } from "../src/actions/ai-engine.ts";
import { parseReportSections } from "../src/lib/pdf-generator.ts";

async function runDirectPipelineAuditTest() {
  console.log("==================================================");
  console.log("DIRECT AI PIPELINE & REPORT PARSER AUDIT TEST");
  console.log("==================================================");

  try {
    const parentName = "Ahmad Zamroni";
    const childName = "Adiba";
    const level = "tksd";
    const formattedAnswers = `P: Bagaimana durasi penggunaan gawai / HP anak di rumah?
J: Memakai HP 1 jam sehari untuk menonton video edukasi mewarnai

P: Bagaimana tingkat kemandirian anak dalam kegiatan harian?
J: Anak sangat mandiri menyiapkan alat tulis sendiri dan antusias melukis gambar`;

    // Generate interpreted analysis
    const analysisResult = generateInterpretedAnalysis(parentName, childName, level, formattedAnswers);
    console.log("\n[Interpreted Analysis Raw Summary]:");
    console.log(analysisResult.summary);

    console.log("\n[Interpreted Analysis Strengths/Potentials]:");
    console.log(analysisResult.strengths);

    console.log("\n[Interpreted Analysis Recommendations]:");
    console.log(analysisResult.education_recommendation);

    // Parse sections
    const parsedSections = parseReportSections(analysisResult, analysisResult.analysis);

    console.log("\n--------------------------------------------------");
    console.log("PARSED REPORT SECTIONS AUDIT:");
    console.log("--------------------------------------------------");
    console.log("Summary Lines:");
    console.log(parsedSections.summary);

    console.log("\nPotentials Cards:");
    parsedSections.potentials.forEach((p, idx) => {
      console.log(`  🌟 ${idx+1}. Title: "${p.title}"`);
      console.log(`     Desc:  "${p.desc}"`);
    });

    console.log("\nRecommendations Cards:");
    parsedSections.recommendations.forEach((r, idx) => {
      console.log(`  🎯 ${idx+1}. Title: "${r.title}"`);
      console.log(`     Desc:  "${r.desc}"`);
    });

    console.log("\nConcerns Cards (Expected empty for positive QA):");
    console.log(parsedSections.concerns);

    console.log("\nMain Priorities (Must be 0/empty):", parsedSections.mainPriorities.length);

    // Assertions
    let failed = false;
    if (parsedSections.summary.includes("perkembangan sesuai tahap jenjang")) {
      console.error("❌ FAIL: Summary contains generic template phrase!");
      failed = true;
    }

    if (parsedSections.potentials.length === 0) {
      console.error("❌ FAIL: Potentials cards are missing!");
      failed = true;
    }

    if (parsedSections.potentials.some(p => p.desc.includes("menunjukkan kondisi positif pada aspek ini berdasarkan jawaban orang tua"))) {
      console.error("❌ FAIL: Potential description still contains robotic system sentence!");
      failed = true;
    }

    if (parsedSections.mainPriorities.length > 0) {
      console.error("❌ FAIL: Main priorities section was not removed!");
      failed = true;
    }

    if (!failed) {
      console.log("\n🎉 ALL DIRECT PIPELINE AUDIT CHECKS PASSED PERFECTLY!");
    } else {
      process.exit(1);
    }

  } catch (err) {
    console.error("Test exception:", err);
    process.exit(1);
  }
}

runDirectPipelineAuditTest();
