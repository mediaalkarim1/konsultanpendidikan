import { generateInterpretedAnalysis } from "../src/actions/ai-engine.ts";

const parentName = "Bapak Ahmad Zamroni";
const childName = "Adiba";
const level = "tksd";
const formattedAnswers = `P: Untuk memulai konsultasi, mohon sebutkan jenjang pendidikan anak Anda saat ini:
J: TK B / SD Kelas 1

P: Aktivitas harian anak di rumah:
J: Anak antusias menggambar dan melukis benda di sekitarnya, mandiri menyiapkan alat tulis dan buku sendiri.

P: Penggunaan media digital/HP:
J: Memakai HP 1 jam sehari untuk menonton video edukasi mewarnai dan lagu anak.`;

const result = generateInterpretedAnalysis(parentName, childName, level, formattedAnswers);
console.log("==========================================");
console.log("GENERATED 4-SECTION ANALYSIS:");
console.log("==========================================");
console.log("Summary:", JSON.stringify(result.summary, null, 2));
console.log("Weaknesses (Concerns):", JSON.stringify(result.weaknesses, null, 2));
console.log("Strengths (Potentials):", JSON.stringify(result.strengths, null, 2));
console.log("Education Recs:", JSON.stringify(result.education_recommendation, null, 2));
