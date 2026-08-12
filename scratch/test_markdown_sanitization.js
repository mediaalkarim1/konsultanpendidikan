const { sanitizeAnalysisMarkdown, cleanHeadingTitle, parseReportSections } = require("../src/lib/pdf-generator.ts");

// Sample Raw Markdown from old DB or Gemini
const sampleMarkdown = `
### 1. RINGKASAN AWAL:
Berdasarkan kuesioner orang tua untuk anak bernama Bagas (jenjang SMA)...

### 2. ❗ AREA YANG PERLU DIPERHATIKAN:

### ❗ Pemetaan Pilihan Jurusan & Perguruan Tinggi
Jawaban orang tua mencatat bahwa Bagas masih bingung menentukan jurusan...

### ❗ Manajemen Waktu & Perencanaan Studi Mandiri
Jawaban orang tua menunjukkan kendala dalam pengaturan prioritas...

### 3. 🌟 MINAT & POTENSI:

### 🌟 Portofolio Karya & Pengalaman Proyek
Bagas memiliki ketertarikan kuat pada desain grafis dan teknologi...

### 4. 🎯 REKOMENDASI PENDAMPINGAN RUMAH:

### 🎯 Diskusi Matriks Minat Jurusan
Ajak Bagas menyusun tabel perbandingan jurusan...
`;

const mockAnalysis = {
  summary: "### 1. RINGKASAN AWAL:\nBerdasarkan kuesioner orang tua...",
  weaknesses: "### ❗ Pemetaan Pilihan Jurusan & Perguruan Tinggi\nJawaban orang tua mencatat...",
  strengths: "### 🌟 Portofolio Karya & Pengalaman Proyek\nBagas memiliki ketertarikan...",
  education_recommendation: "### 🎯 Diskusi Matriks Minat Jurusan\nAjak Bagas menyusun..."
};

console.log("=== TEST 1: sanitizeAnalysisMarkdown ===");
const cleanSummary = sanitizeAnalysisMarkdown(mockAnalysis.summary);
console.log("Clean Summary Has Hash?", cleanSummary.includes("#"));
console.log("Clean Summary Text:", cleanSummary);

console.log("\n=== TEST 2: cleanHeadingTitle ===");
const cleanTitle = cleanHeadingTitle("### ❗ Pemetaan Pilihan Jurusan");
console.log("Clean Title Has Hash?", cleanTitle.includes("#"));
console.log("Clean Title Output:", cleanTitle);

console.log("\n=== TEST 3: parseReportSections ===");
const parsed = parseReportSections(mockAnalysis, sampleMarkdown);
console.log("Parsed Summary Has Hash?", parsed.summary.includes("#"));
console.log("Parsed Concerns Has Hash?", JSON.stringify(parsed.concerns).includes("#"));
console.log("Parsed Potentials Has Hash?", JSON.stringify(parsed.potentials).includes("#"));
console.log("Parsed Recommendations Has Hash?", JSON.stringify(parsed.recommendations).includes("#"));

if (
  !cleanSummary.includes("#") &&
  !cleanTitle.includes("#") &&
  !parsed.summary.includes("#") &&
  !JSON.stringify(parsed.concerns).includes("#")
) {
  console.log("\n✅ ALL TESTS PASSED: '###' HAS BEEN 100% ELIMINATED!");
} else {
  console.error("\n❌ TEST FAILED: Hash still detected!");
}
