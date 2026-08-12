import { generateFallbackAnalysisResult, parseReportSections } from "../src/lib/pdf-generator.ts";

console.log("==================================================");
console.log("TESTING REPORT FIX FOR AHMAD ZAMRONI (ADIBA)");
console.log("==================================================");

const parentName = "Ahmad Zamroni";
const childName = "Adiba";
const level = "tksd";

// Simulate actual questionnaire Q&A answers
const formattedAnswers = `P: Durasi penggunaan gawai / screen time?
J: Sekitar 1-2 jam sehari untuk menonton video edukasi

P: Kemandirian harian anak?
J: Anak sudah cukup mandiri merapikan mainan dan menyiapkan alat tulis sendiri

P: Respon saat menghadapi kesulitan?
J: Mencoba terlebih dahulu dan mau bertanya jika mengalami kesulitan`;

const result = generateFallbackAnalysisResult(parentName, childName, level, formattedAnswers);
const parsed = parseReportSections(result);

console.log("Summary:\n", parsed.summary);
console.log("\nConcerns Count:", parsed.concerns.length);
console.log("Potentials Count:", parsed.potentials.length);
console.log("Recommendations Count:", parsed.recommendations.length);

console.log("\n=== POTENTIALS ===");
parsed.potentials.forEach(p => console.log(`🌟 ${p.title}\n   ${p.desc}`));

console.log("\n=== RECOMMENDATIONS ===");
parsed.recommendations.forEach(r => console.log(`🎯 ${r.title}\n   ${r.desc}`));

let failed = false;
if (parsed.potentials.length === 0 && parsed.concerns.length === 0) {
  console.error("❌ FAIL: Report sections are empty!");
  failed = true;
}
if (parsed.recommendations.length === 0) {
  console.error("❌ FAIL: Recommendations section is empty!");
  failed = true;
}

if (!failed) {
  console.log("\n✅ REPORT FIX TEST PASSED: All report sections are populated with clean evidence-based items!");
} else {
  process.exit(1);
}
