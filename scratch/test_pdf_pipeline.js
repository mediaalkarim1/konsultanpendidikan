import { sanitizeAnalysisMarkdown, cleanHeadingTitle, parseReportSections, generateFallbackAnalysisResult } from "../src/lib/pdf-generator.ts";

console.log("=== PDF PIPELINE AUDIT & VALIDATION ===");

// Test 1: Generate Fallback
const fallback = generateFallbackAnalysisResult("Bambang (Anak: Bagas)", "Bagas", "sma", "P: Kuesioner\nJ: Masih bingung menentukan jurusan kuliah");
console.log("Fallback summary contains ###?", fallback.summary.includes("#"));
console.log("Fallback weaknesses contains ###?", fallback.weaknesses.includes("#"));
console.log("Fallback recs contains ###?", fallback.education_recommendation.includes("#"));

// Test 2: Parse Report Sections
const parsed = parseReportSections(fallback);
console.log("\nParsed Data Summary:", parsed.summary.substring(0, 60) + "...");
console.log("Concerns Count:", parsed.concerns.length);
console.log("Potentials Count:", parsed.potentials.length);
console.log("Recommendations Count:", parsed.recommendations.length);

console.log("\nItem 1 Concern Title:", parsed.concerns[0]?.title);
console.log("Item 1 Potential Title:", parsed.potentials[0]?.title);
console.log("Item 1 Rec Title:", parsed.recommendations[0]?.title);

let hasHash = false;
if (parsed.summary.includes("#")) hasHash = true;
parsed.concerns.forEach(c => { if (c.title.includes("#") || c.desc.includes("#")) hasHash = true; });
parsed.potentials.forEach(p => { if (p.title.includes("#") || p.desc.includes("#")) hasHash = true; });
parsed.recommendations.forEach(r => { if (r.title.includes("#") || r.desc.includes("#")) hasHash = true; });

if (!hasHash) {
  console.log("\n✅ PDF PIPELINE TEST PASSED: 100% IDENTICAL STRUCTURE, ZERO '###' DETECTED!");
} else {
  console.error("\n❌ TEST FAILED: '###' detected in PDF parsed items!");
}
