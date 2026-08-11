import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { toast } from "sonner";

export type Consultation = {
  id: string;
  created_at: string;
  parent_name: string;
  child_name?: string | null;
  whatsapp_number: string;
  level: string;
  status: string;
  error_message?: string;
  ai_result?: string | null;
};

const LEVEL_LABELS: Record<string, string> = { tksd: "TK & SD", smp: "SMP", sma: "SMA" };

export async function handleDownloadPdfForConsultation(
  item: Consultation,
  onStart?: () => void,
  onFinish?: () => void
) {
  try {
    if (onStart) onStart();
    toast.info(`Menyiapkan Laporan PDF Resmi untuk ${item.parent_name}...`);

    // Dynamic import jsPDF for SSR safety
    const { jsPDF } = await import("jspdf");

    // Yield to main UI thread so spinner renders immediately
    await new Promise((r) => setTimeout(r, 60));

    // Fetch answers
    const { data: answers } = await supabase
      .from("consultation_answers")
      .select("*, questions(question_text)")
      .eq("consultation_id", item.id);

    const allOptionIds = answers?.flatMap((a) => a.selected_option_ids || []) || [];
    let optionsMap: Record<string, string> = {};
    if (allOptionIds.length > 0) {
      const { data: opts } = await supabase.from("question_options").select("id, option_text").in("id", allOptionIds);
      if (opts) optionsMap = opts.reduce((acc, o) => ({ ...acc, [o.id]: o.option_text }), {});
    }

    const { data: analysisData } = await (supabase as any)
      .from("consultation_analysis")
      .select("*")
      .eq("consultation_id", item.id)
      .maybeSingle();

    const mappedAnswers = (answers || []).map((a) => ({
      q: a.questions?.question_text || "Pertanyaan",
      a: a.answer_text || (a.selected_option_ids || []).map((oid: string) => optionsMap[oid] || oid).join(", ")
    }));

    const answersFormatted = mappedAnswers.map((ans) => `P: ${ans.q}\nJ: ${ans.a}`).join("\n\n");
    const dynamicNarrative = generateFallbackAnalysisResult(item.parent_name, item.child_name || "-", item.level, answersFormatted);

    const narrativeText = analysisData?.analysis || (item as any).ai_result || dynamicNarrative.analysis;
    const dateStr = format(new Date(item.created_at), "dd MMMM yyyy", { locale: id });
    const levelLabel = (LEVEL_LABELS[item.level] || item.level).toUpperCase();

    // Native jsPDF document creation
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 297 mm
    const margin = 15;
    const maxTextWidth = pageWidth - margin * 2; // 180 mm

    // 1. Top Green Decorative Bar
    doc.setFillColor(4, 120, 87); // Emerald 700 (#047857)
    doc.rect(0, 0, pageWidth, 5, "F");

    // Kop Surat Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(4, 120, 87);
    doc.text("SEKOLAH ALAM AL-KARIM — EDUKONSUL", margin, 17);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text("Laporan Evaluasi & Rekomendasi Konsultan Pendidikan Anak", margin, 23);

    // Right Side Metadata
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(6, 95, 70);
    doc.text(`JENJANG: ${levelLabel}`, pageWidth - margin - 40, 17);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(`Ref ID: #${item.id.substring(0, 8)}`, pageWidth - margin - 40, 23);

    // Divider Line
    doc.setDrawColor(5, 150, 105);
    doc.setLineWidth(0.4);
    doc.line(margin, 27, pageWidth - margin, 27);

    // 2. Data Card Section
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, 31, maxTextWidth, 24, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(4, 120, 87);
    doc.text("DATA ORANG TUA", margin + 5, 37);
    doc.text("DATA ANAK & EVALUASI", margin + 95, 37);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Nama Orang Tua : ${item.parent_name}`, margin + 5, 44);
    doc.text(`Nomor WhatsApp : ${item.whatsapp_number}`, margin + 5, 50);

    doc.text(`Nama Anak          : ${item.child_name || "-"}`, margin + 95, 44);
    doc.text(`Tanggal Evaluasi : ${dateStr}`, margin + 95, 50);

    // 3. Section Title
    let yPos = 63;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(4, 120, 87);
    doc.text("LAPORAN HASIL ANALISIS & REKOMENDASI KONSULTAN", margin, yPos);
    yPos += 3;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 7;

    // 4. Narrative Paragraphs
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);

    const paragraphs = narrativeText.split("\n\n");

    for (const para of paragraphs) {
      if (!para.trim()) continue;
      const lines = doc.splitTextToSize(para.trim(), maxTextWidth);
      const neededHeight = lines.length * 5;

      // Auto page break check
      if (yPos + neededHeight > pageHeight - 28) {
        doc.addPage();
        yPos = 20;

        // Header line on new page
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Laporan Evaluasi Ananda ${item.child_name || item.parent_name} (Sambungan)`, margin, yPos - 5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(51, 65, 85);
      }

      doc.text(lines, margin, yPos, { lineHeightFactor: 1.4 });
      yPos += lines.length * 5.2 + 4;
    }

    // 5. Footer Signature Block
    if (yPos + 35 > pageHeight - 15) {
      doc.addPage();
      yPos = 20;
    } else {
      yPos += 8;
    }

    doc.setDrawColor(226, 232, 240);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 7;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("Dokumen Laporan Resmi EduKonsul — Sekolah Alam Al-Karim", margin, yPos + 4);
    doc.text(`Diterbitkan pada: ${dateStr}`, margin, yPos + 9);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(4, 120, 87);
    doc.text("Tim Konsultan Pendidikan", pageWidth - margin - 45, yPos + 4);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text("Sekolah Alam Al-Karim", pageWidth - margin - 45, yPos + 22);
    doc.line(pageWidth - margin - 45, yPos + 23, pageWidth - margin, yPos + 23);

    // Save File
    const fileName = `Laporan_Konsultasi_${(item.parent_name || "OrangTua").replace(/\s+/g, "_")}.pdf`;
    doc.save(fileName);
    toast.success("Dokumen PDF berhasil diunduh!");

  } catch (err: any) {
    console.error("Native jsPDF error:", err);
    toast.error("Gagal membuat PDF. Silakan coba lagi.");
  } finally {
    if (onFinish) onFinish();
  }
}

export type AiAnalysisResult = {
  summary: string;
  analysis: string;
  strengths: string;
  weaknesses: string;
  potential: string;
  risk: string;
  education_recommendation: string;
};

export function generateFallbackAnalysisResult(parentName: string, childName: string, level: string, formattedAnswers: string): AiAnalysisResult {
  const jenjangLabel = level === "tksd" ? "TK & SD" : level === "smp" ? "SMP" : "SMA";
  const nameDisplay = childName && childName !== "-" ? childName : "Ananda";
  const parentDisplay = parentName || "Orang Tua";

  // Parse answers into Q&A pairs
  const qaPairs: { q: string; a: string }[] = [];
  if (formattedAnswers && formattedAnswers.trim()) {
    const items = formattedAnswers.split("\n\n");
    for (const item of items) {
      const lines = item.split("\n");
      const q = lines[0]?.replace(/^P:\s*/, "").trim() || "";
      const a = lines[1]?.replace(/^J:\s*/, "").trim() || "";
      if (q && a && a !== "-") qaPairs.push({ q, a });
    }
  }

  // Build summary (1–2 paragraphs)
  const summary = `${nameDisplay} adalah anak jenjang ${jenjangLabel} yang berdasarkan informasi dari ${parentDisplay} memiliki sejumlah karakteristik unik yang perlu dipahami dan didukung secara tepat. Dari keseluruhan jawaban yang disampaikan, terdapat beberapa pola yang perlu mendapat perhatian sekaligus potensi yang dapat dikembangkan lebih lanjut.`;

  // Build area perhatian dynamically from answers
  const areaItems: string[] = [];
  if (qaPairs.length > 0) {
    // Use up to first 3-4 Q&A pairs as area of concern
    const concernPairs = qaPairs.slice(0, Math.min(4, qaPairs.length));
    for (const pair of concernPairs) {
      const shortQ = pair.q.length > 60 ? pair.q.substring(0, 60) + "..." : pair.q;
      areaItems.push(`### ❗ ${shortQ}\n\nOrang tua menyampaikan bahwa ${pair.a.toLowerCase()}. Hal ini perlu mendapat perhatian dan pendampingan yang sesuai agar perkembangan ${nameDisplay} dapat berjalan optimal.`);
    }
  } else {
    areaItems.push(`### ❗ Perlu Pendampingan Belajar yang Konsisten\n\nBerdasarkan informasi yang tersedia, ${nameDisplay} masih membutuhkan pendampingan yang terstruktur dalam rutinitas belajar sehari-hari.`);
  }
  const weaknessesText = areaItems.join("\n\n");

  // Build minat & potensi
  const potentialItems: string[] = [];
  if (qaPairs.length > 2) {
    const potentialPairs = qaPairs.slice(Math.min(4, qaPairs.length));
    for (const pair of potentialPairs.slice(0, 3)) {
      const shortQ = pair.q.length > 50 ? pair.q.substring(0, 50) + "..." : pair.q;
      potentialItems.push(`### 🌟 ${shortQ}\n\nOrang tua menyebutkan bahwa ${pair.a.toLowerCase()}, yang menunjukkan adanya potensi yang dapat dikembangkan lebih jauh dengan stimulasi yang tepat.`);
    }
  }
  if (potentialItems.length === 0) {
    potentialItems.push(`### 🌟 Kemampuan Adaptasi\n\nBerdasarkan informasi yang tersedia, ${nameDisplay} menunjukkan kemampuan untuk menyesuaikan diri dengan lingkungan sekitarnya.`);
  }
  const strengthsText = potentialItems.join("\n\n");

  // Build recommendation
  const rekomendasi = `### 🎯 Rekomendasi Pendampingan

- Luangkan waktu setiap hari untuk mendampingi ${nameDisplay} belajar dalam suasana yang nyaman dan menyenangkan.
- Berikan pujian atas usaha yang ditunjukkan ${nameDisplay}, bukan hanya pada hasil akhirnya.
- Ciptakan rutinitas harian yang konsisten agar ${nameDisplay} merasa aman dan termotivasi.
- Amati kegiatan yang paling membuat ${nameDisplay} bersemangat dan jadikan itu sebagai pintu masuk untuk belajar hal-hal baru.
- Jalin komunikasi terbuka dengan ${nameDisplay} setiap hari agar orang tua dapat memahami perasaan dan kebutuhannya.`;

  // Build full analysis (all 4 sections combined)
  const fullAnalysis = `## Ringkasan Awal

${summary}

## ❗ Area yang Perlu Diperhatikan

${weaknessesText}

## 🌟 Minat & Potensi

${strengthsText}

${rekomendasi}`;

  return {
    summary,
    analysis: fullAnalysis,
    strengths: strengthsText,
    weaknesses: weaknessesText,
    potential: potentialItems.map(p => p.replace(/^###.*\n\n/, "")).join(" "),
    risk: areaItems.map(a => a.replace(/^###.*\n\n/, "")).join(" "),
    education_recommendation: rekomendasi
  };
}

