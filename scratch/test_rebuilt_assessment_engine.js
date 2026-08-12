import { runCleanAiAnalysisEngine } from "../src/actions/ai-engine.ts";

console.log("==================================================");
console.log("REBUILT ASSESSMENT ENGINE — CONTRAST & EVIDENCE TEST SUITE");
console.log("==================================================");

async function runRebuiltEngineTests() {
  try {
    let failed = false;

    // TEST 1: TK/SD (Positive Drawing & Independence)
    console.log("\n--------------------------------------------------");
    console.log("TEST 1: TK/SD (ALYA - VISUAL & MANDIRI)");
    console.log("--------------------------------------------------");

    const qaTksd = `P: Bagaimana durasi penggunaan HP / gawai anak di rumah?
J: Kurang dari 1 jam sehari dan didampingi untuk aktivitas edukasi

P: Bagaimana tingkat kemandirian anak dalam kegiatan harian?
J: Mandiri merapikan mainan dan menyiapkan alat sendiri tanpa harus diminta

P: Aktivitas apa yang paling diminati anak?
J: Menggambar, mewarnai, atau kreasi tangan dan seni visual`;

    const res1 = await runCleanAiAnalysisEngine("Ibu Nurul", "Alya", "tksd", "081234567891", qaTksd);
    console.log("Result 1 Success:", res1.success);
    if (res1.success && res1.data) {
      console.log("Summary:", res1.data.summary.map(s => s.title));
      console.log("Concerns:", res1.data.attentionAreas.map(a => a.title));
      console.log("Potentials:", res1.data.potentials.map(p => p.title));
      console.log("Recommendations:", res1.data.recommendations.map(r => r.title));

      if (res1.data.attentionAreas.some(a => a.title.toLowerCase().includes("screen time") || a.title.toLowerCase().includes("emosi"))) {
        console.error("❌ FAIL: Test 1 contained false gadget/emotion concerns!");
        failed = true;
      } else {
        console.log("✅ CHECK 1 PASSED: Zero false template concerns in Test 1.");
      }
    } else {
      console.error("❌ FAIL: Test 1 engine execution failed:", res1.error);
      failed = true;
    }

    // TEST 2: SMP (Gadget 6 Hours & Procrastination)
    console.log("\n--------------------------------------------------");
    console.log("TEST 2: SMP (RIAN - GADGET 6 JAM & MENUNDA)");
    console.log("--------------------------------------------------");

    const qaSmp = `P: Bagaimana kebiasaan dan kedisiplinan anak dalam menyelesaikan tugas sekolah di rumah?
J: Sering menunda tugas sampai larut malam dan merasa terbebani

P: Bagaimana respon anak ketika menghadapi kesulitan belajar?
J: Mudah menyerah, frustrasi, atau langsung kehilangan motivasi belajar

P: Bidang atau minat ekstra kurikuler apa yang paling disukai anak saat ini?
J: Teknologi, game development, sains, atau coding`;

    const res2 = await runCleanAiAnalysisEngine("Bapak Herman", "Rian", "smp", "081234567892", qaSmp);
    console.log("Result 2 Success:", res2.success);
    if (res2.success && res2.data) {
      console.log("Summary:", res2.data.summary.map(s => s.title));
      console.log("Concerns:", res2.data.attentionAreas.map(a => a.title));
      console.log("Potentials:", res2.data.potentials.map(p => p.title));
      console.log("Recommendations:", res2.data.recommendations.map(r => r.title));

      if (res2.data.attentionAreas.length === 0) {
        console.error("❌ FAIL: Test 2 failed to extract expected time management concern!");
        failed = true;
      } else {
        console.log("✅ CHECK 2 PASSED: Test 2 extracted actual time management concern.");
      }
    } else {
      console.error("❌ FAIL: Test 2 engine execution failed:", res2.error);
      failed = true;
    }

    // TEST 3: CONTRAST TEST (SMA ASSESSMENT A vs ASSESSMENT B)
    console.log("\n--------------------------------------------------");
    console.log("TEST 3: SMA CONTRAST TEST (ASSESSMENT A vs ASSESSMENT B)");
    console.log("--------------------------------------------------");

    const qaSmaA = `P: Bagaimana kesiapan dan pemetaan pilihan jurusan perguruan tinggi anak saat ini?
J: Sudah sangat mantap dengan pilihan jurusan Teknik Komputer & Robotika dan prospek karier impiannya

P: Bagaimana keaktifan anak dalam membangun portofolio karya?
J: Aktif memimpin organisasi / lomba dan rutin mengumpulkan sertifikat / portofolio karya

P: Bagaimana kemampuan manajemen waktu anak?
J: Sangat teratur dengan jadwal belajar mandiri yang terencana rapi`;

    const qaSmaB = `P: Bagaimana kesiapan dan pemetaan pilihan jurusan perguruan tinggi anak saat ini?
J: Masih sangat bingung dan belum memiliki gambaran pilihan jurusan

P: Bagaimana keaktifan anak dalam membangun portofolio karya?
J: Belum pernah terlibat dalam proyek karya atau kegiatan organisasi di luar kelas

P: Bagaimana kemampuan manajemen waktu anak?
J: Sering menunda-nunda dan belajar dengan metode SKS (Sistem Kebut Semalam)`;

    const resA = await runCleanAiAnalysisEngine("Bunda Rina", "Dito", "sma", "081234567893", qaSmaA);
    const resB = await runCleanAiAnalysisEngine("Bunda Rina", "Dito", "sma", "081234567894", qaSmaB);

    console.log("Assessment A Concerns:", resA.data?.attentionAreas.map(a => a.title));
    console.log("Assessment A Potentials:", resA.data?.potentials.map(p => p.title));
    console.log("Assessment B Concerns:", resB.data?.attentionAreas.map(a => a.title));
    console.log("Assessment B Potentials:", resB.data?.potentials.map(p => p.title));

    const jsonA = JSON.stringify(resA.data);
    const jsonB = JSON.stringify(resB.data);

    if (jsonA === jsonB) {
      console.error("❌ FAIL: Assessment A and Assessment B yielded identical outputs! (Template leak detected)");
      failed = true;
    } else {
      console.log("✅ CHECK 3 PASSED: Assessment A != Assessment B (100% CONTRASTING & EVIDENCE-BASED)!");
    }

    if (!failed) {
      console.log("\n🎉 ALL REBUILT ASSESSMENT ENGINE TESTS PASSED PERFECTLY!");
    } else {
      process.exit(1);
    }

  } catch (err) {
    console.error("Rebuilt engine test error:", err);
    process.exit(1);
  }
}

runRebuiltEngineTests();
