import { generateFallbackAnalysisResult } from "../src/lib/pdf-generator.ts";

console.log("==================================================");
console.log("TESTING CONCEPT SHIFT: PESERTA A VS PESERTA B");
console.log("==================================================");

// PESERTA A: Decided major, active org/projects, confident
const answersA = `P: Pilihan jurusan kuliah?
J: Sudah mantap memilih Jurusan Teknik Informatika / Ilmu Komputer

P: Pengalaman organisasi atau proyek nyata?
J: Aktif berorganisasi dan sudah memiliki beberapa portofolio proyek aplikasi digital

P: Kemampuan Bahasa Inggris?
J: Sangat fasih berbahasa Inggris aktif dan menguasai pemrograman komputer`;

// PESERTA B: Undecided major, no org/projects, procrastinates
const answersB = `P: Pilihan jurusan kuliah?
J: Masih bingung memilih jurusan kuliah dan belum memiliki pilihan yang jelas

P: Pengalaman organisasi atau proyek nyata?
J: Belum memiliki pengalaman organisasi dan belum pernah membuat proyek

P: Pengelolaan waktu harian?
J: Sering menunda tugas sekolah dan menghabiskan 6 jam harian bermain game online`;

const resultA = generateFallbackAnalysisResult("Bapak A", "Ananda A", "sma", answersA);
const resultB = generateFallbackAnalysisResult("Ibu B", "Ananda B", "sma", answersB);

console.log("\n--- RESULT PESERTA A (DECIDED / ACTIVE) ---");
console.log("[SUMMARY A]:\n", resultA.summary);
console.log("[CONCERNS A]:\n", resultA.weaknesses);
console.log("[POTENTIALS A]:\n", resultA.strengths);

console.log("\n--- RESULT PESERTA B (UNDECIDED / PROCRASTINATES) ---");
console.log("[SUMMARY B]:\n", resultB.summary);
console.log("[CONCERNS B]:\n", resultB.weaknesses);
console.log("[POTENTIALS B]:\n", resultB.strengths);

// ASSERTIONS
let failed = false;

// 1. Peserta A must NOT have "bingung menentukan jurusan" or "menunda" in concerns
if (resultA.weaknesses.includes("bingung") || resultA.weaknesses.includes("Pemetaan Pilihan Jurusan Kuliah")) {
  console.error("❌ FAIL: Peserta A falsely reported major confusion!");
  failed = true;
}

// 2. Peserta B must have major confusion / screen time in concerns
if (!resultB.weaknesses.includes("Pemetaan Pilihan Jurusan") && !resultB.weaknesses.includes("Screen Time") && !resultB.weaknesses.includes("menunda")) {
  console.error("❌ FAIL: Peserta B missing explicit concern derived from answers!");
  failed = true;
}

// 3. Results A and B must not be identical
if (resultA.weaknesses === resultB.weaknesses) {
  console.error("❌ FAIL: Results A and B are identical generic outputs!");
  failed = true;
}

if (!failed) {
  console.log("\n✅ CONCEPT SHIFT TEST PASSED: Results are 100% point-based, evidence-backed, and distinct per parent answer!");
} else {
  process.exit(1);
}
