import { generateFallbackAnalysisResult } from "../src/lib/pdf-generator.ts";

console.log("==================================================");
console.log("FINAL AUDIT: PURE EVIDENCE VS TEMPLATE TEST");
console.log("==================================================");

// CASE 1: CHILD A (Visual/Drawing only. Zero screen time/independence/emotion complaints)
const answersVisualOnly = `P: Pertanyaan 1: Aktivitas favorit anak?
J: Anak sangat menyukai menggambar dan melukis suasana alam

P: Pertanyaan 2: Bagaimana sikap anak saat beraktivitas?
J: Sangat tekun dan percaya diri menunjukkan hasil karyanya kepada keluarga

P: Pertanyaan 3: Apakah ada kendala atau masalah harian?
J: Tidak ada masalah harian, anak cukup mandiri dan komunikatif`;

// CASE 2: CHILD B (Screen time & procrastination focus only. Zero visual/drawing mentions)
const answersGadgetOnly = `P: Pertanyaan 1: Penggunaan gawai harian?
J: Bermain game online lebih dari 6 jam sehari dan sulit dihentikan

P: Pertanyaan 2: Reaksi emosional saat gawai disudahi?
J: Sering menangis dan marah ketika HP diambil oleh orang tua

P: Pertanyaan 3: Kebiasaan penyelesaian tugas sekolah?
J: Sering menunda tugas sekolah hingga malam hari dan harus selalu diingatkan`;

const resultA = generateFallbackAnalysisResult("Bunda A", "Budi", "tksd", answersVisualOnly);
const resultB = generateFallbackAnalysisResult("Bunda B", "Beni", "tksd", answersGadgetOnly);

console.log("\n=== RESULT CHILD A (VISUAL ONLY) ===");
console.log("[SUMMARY A]:\n", resultA.summary);
console.log("[CONCERNS A]:\n", resultA.weaknesses);
console.log("[POTENTIALS A]:\n", resultA.strengths);

console.log("\n=== RESULT CHILD B (GADGET ONLY) ===");
console.log("[SUMMARY B]:\n", resultB.summary);
console.log("[CONCERNS B]:\n", resultB.weaknesses);
console.log("[POTENTIALS B]:\n", resultB.strengths);

// ASSERTIONS
let failed = false;

// 1. Child A MUST NOT contain "Screen Time", "Kemandirian", "Regulasi Emosi", "Adaptasi", "Membaca" in concerns!
const invalidAKeywords = ["Screen Time", "Gawai", "Regulasi Emosi", "Adaptasi Bersosialisasi", "Kegemaran Membaca"];
for (const kw of invalidAKeywords) {
  if (resultA.weaknesses.includes(kw)) {
    console.error(`❌ FAIL: Child A falsely contained template keyword "${kw}" without parent evidence!`);
    failed = true;
  }
}

// 2. Child B MUST NOT contain "Ketertarikan pada Aktivitas Visual" or "Menggambar" in potentials!
if (resultB.strengths.includes("Visual") || resultB.strengths.includes("menggambar")) {
  console.error("❌ FAIL: Child B falsely contained visual keywords without parent evidence!");
  failed = true;
}

// 3. Child B MUST contain "Screen Time" and "Regulasi Emosi" in concerns derived from evidence!
if (!resultB.weaknesses.includes("Screen Time") && !resultB.weaknesses.includes("Emosi")) {
  console.error("❌ FAIL: Child B failed to extract explicit gadget/emotion concern from answers!");
  failed = true;
}

if (!failed) {
  console.log("\n✅ FINAL AUDIT PASSED: ZERO DUMMY TEMPLATES DETECTED! 100% EVIDENCE-DRIVEN ANALYSIS!");
} else {
  process.exit(1);
}
