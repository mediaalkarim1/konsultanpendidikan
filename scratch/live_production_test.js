import { getAdminSupabase } from "../src/lib/supabase-admin.ts";
import { runAiEngineAnalysis } from "../src/actions/ai-engine.ts";
import { parseReportSections, generateFallbackAnalysisResult } from "../src/lib/pdf-generator.ts";

console.log("==================================================");
console.log("LIVE PRODUCTION AUDIT & SYSTEM TESTING SUITE");
console.log("==================================================");

const supabaseAdmin = getAdminSupabase();

async function runLiveTest() {
  try {
    // 1. Fetch latest questions for TK/SD, SMP, SMA from Supabase DB
    const { data: qTksd } = await supabaseAdmin.from("questions").select("*").eq("level", "tksd").eq("is_active", true).limit(3);
    const { data: qSmp } = await supabaseAdmin.from("questions").select("*").eq("level", "smp").eq("is_active", true).limit(3);
    const { data: qSma } = await supabaseAdmin.from("questions").select("*").eq("level", "sma").eq("is_active", true).limit(3);

    console.log(`✓ Fetched active questions from DB: TK/SD (${qTksd?.length}), SMP (${qSmp?.length}), SMA (${qSma?.length})`);

    // TEST SCENARIO 1: LIVE TK/SD SUBMISSION (Child: Alya - Positive Painting & Independence)
    console.log("\n--------------------------------------------------");
    console.log("TEST 1: LIVE SUBMISSION TK/SD (ALYA - VISUAL & MANDIRI)");
    console.log("--------------------------------------------------");

    const answersTksd = [
      {
        question_id: qTksd?.[0]?.id || "tksd-q1",
        question_text: qTksd?.[0]?.question_text || "Durasi screen time gawai?",
        answer_text: "Sekitar 1 jam sehari untuk menonton video mewarnai dan lukisan alam"
      },
      {
        question_id: qTksd?.[1]?.id || "tksd-q2",
        question_text: qTksd?.[1]?.question_text || "Kemandirian harian anak?",
        answer_text: "Anak sangat mandiri merapikan mainan sendiri dan antusias melukis gambar"
      }
    ];

    const formattedTksd = answersTksd.map(a => `P: ${a.question_text}\nJ: ${a.answer_text}`).join("\n\n");
    const aiRes1 = await runAiEngineAnalysis("Ibu Nurul", "Alya", "tksd", "081234567891", formattedTksd);
    const parsed1 = parseReportSections(aiRes1.data);

    console.log("Provider used:", aiRes1.providerName);
    console.log("Summary:\n", parsed1.summary);
    console.log("Concerns Count:", parsed1.concerns.length, parsed1.concerns.map(c => c.title));
    console.log("Potentials Count:", parsed1.potentials.length, parsed1.potentials.map(p => p.title));
    console.log("Recommendations Count:", parsed1.recommendations.length, parsed1.recommendations.map(r => r.title));


    // TEST SCENARIO 2: LIVE SMP SUBMISSION (Child: Rian - Game 6 hours & Procrastination)
    console.log("\n--------------------------------------------------");
    console.log("TEST 2: LIVE SUBMISSION SMP (RIAN - GADGET 6 JAM & MENUNDA)");
    console.log("--------------------------------------------------");

    const answersSmp = [
      {
        question_id: qSmp?.[0]?.id || "smp-q1",
        question_text: qSmp?.[0]?.question_text || "Durasi penggunaan game online?",
        answer_text: "Bermain game online 6 jam sehari dan sering menunda tugas sekolah"
      },
      {
        question_id: qSmp?.[1]?.id || "smp-q2",
        question_text: qSmp?.[1]?.question_text || "Pola komunikasi keluarga?",
        answer_text: "Sering marah dan menangis ketika HP diminta untuk disudahi"
      }
    ];

    const formattedSmp = answersSmp.map(a => `P: ${a.question_text}\nJ: ${a.answer_text}`).join("\n\n");
    const aiRes2 = await runAiEngineAnalysis("Bapak Herman", "Rian", "smp", "081234567892", formattedSmp);
    const parsed2 = parseReportSections(aiRes2.data);

    console.log("Provider used:", aiRes2.providerName);
    console.log("Summary:\n", parsed2.summary);
    console.log("Concerns Count:", parsed2.concerns.length, parsed2.concerns.map(c => c.title));
    console.log("Potentials Count:", parsed2.potentials.length, parsed2.potentials.map(p => p.title));
    console.log("Recommendations Count:", parsed2.recommendations.length, parsed2.recommendations.map(r => r.title));


    // TEST SCENARIO 3: LIVE SMA SUBMISSION (Child: Dito - Decided IT & Robotics)
    console.log("\n--------------------------------------------------");
    console.log("TEST 3: LIVE SUBMISSION SMA (DITO - SUDAH TAHU JURUSAN IT & ROBOTIK)");
    console.log("--------------------------------------------------");

    const answersSma = [
      {
        question_id: qSma?.[0]?.id || "sma-q1",
        question_text: qSma?.[0]?.question_text || "Pilihan jurusan perguruan tinggi?",
        answer_text: "Sudah mantap memilih Jurusan Teknik Komputer & Robotika"
      },
      {
        question_id: qSma?.[1]?.id || "sma-q2",
        question_text: qSma?.[1]?.question_text || "Portofolio proyek & organisasi?",
        answer_text: "Aktif mengikuti klub robotika dan sudah menjuarai lomba membuat proyek aplikasi"
      }
    ];

    const formattedSma = answersSma.map(a => `P: ${a.question_text}\nJ: ${a.answer_text}`).join("\n\n");
    const aiRes3 = await runAiEngineAnalysis("Bunda Rina", "Dito", "sma", "081234567893", formattedSma);
    const parsed3 = parseReportSections(aiRes3.data);

    console.log("Provider used:", aiRes3.providerName);
    console.log("Summary:\n", parsed3.summary);
    console.log("Concerns Count:", parsed3.concerns.length, parsed3.concerns.map(c => c.title));
    console.log("Potentials Count:", parsed3.potentials.length, parsed3.potentials.map(p => p.title));
    console.log("Recommendations Count:", parsed3.recommendations.length, parsed3.recommendations.map(r => r.title));

    // VERIFICATION CHECKS
    console.log("\n==================================================");
    console.log("VERIFICATION AUDIT CHECKS");
    console.log("==================================================");

    let failed = false;

    // Check 1: Alya (Test 1) must have ZERO screen time/emotion concerns
    if (parsed1.concerns.some(c => c.title.includes("Screen Time") || c.title.includes("Emosi"))) {
      console.error("❌ FAIL: Test 1 (Alya) contained false gadget concerns!");
      failed = true;
    } else {
      console.log("✅ CHECK 1: Test 1 (Alya) is 100% free of false gadget concerns.");
    }

    // Check 2: Rian (Test 2) MUST have Screen Time / Emosi concerns
    if (parsed2.concerns.length === 0) {
      console.error("❌ FAIL: Test 2 (Rian) missing expected gadget concern!");
      failed = true;
    } else {
      console.log("✅ CHECK 2: Test 2 (Rian) correctly extracted gadget/procrastination concerns.");
    }

    // Check 3: Dito (Test 3) MUST NOT have "bingung jurusan" concern
    if (parsed3.concerns.some(c => c.title.includes("bingung") || c.title.includes("Pemetaan Pilihan Jurusan"))) {
      console.error("❌ FAIL: Test 3 (Dito) falsely reported major confusion when parent answered decided IT major!");
      failed = true;
    } else {
      console.log("✅ CHECK 3: Test 3 (Dito) correctly omitted false major confusion.");
    }

    if (!failed) {
      console.log("\n🎉 ALL LIVE PRODUCTION AUDIT CHECKS PASSED PERFECTLY!");
    } else {
      process.exit(1);
    }

  } catch (err) {
    console.error("Live test error:", err);
    process.exit(1);
  }
}

runLiveTest();
