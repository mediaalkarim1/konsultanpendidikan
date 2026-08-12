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

export function sanitizeTextForPdf(str: string): string {
  if (!str) return "";
  return str
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u2022/g, "-")
    .replace(/❗/g, "")
    .replace(/🌟/g, "")
    .replace(/🎯/g, "")
    .replace(/✦/g, "")
    .replace(/★/g, "")
    .replace(/❌/g, "")
    .replace(/✅/g, "")
    .replace(/⚠️/g, "")
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, "")
    .replace(/[\u{2600}-\u{26FF}]/gu, "")
    .replace(/[\u{2700}-\u{27BF}]/gu, "")
    .replace(/\u200B|\u200C|\u200D|\uFEFF/g, "")
    .replace(/[^\x00-\x7F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type ParsedReportSectionItem = {
  title: string;
  desc: string;
};

export type ParsedReportData = {
  summary: string;
  concerns: ParsedReportSectionItem[];
  potentials: ParsedReportSectionItem[];
  recommendations: ParsedReportSectionItem[];
  mainPriorities: string[];
};

export function sanitizeAnalysisMarkdown(text: string): string {
  if (!text) return "";
  return text
    // Strip Markdown heading hashes (#, ##, ###, ####, etc.) at the start of any line
    .replace(/^[ \t]*#{1,6}[ \t]*/gm, "")
    // Remove isolated Markdown heading hashes after newlines/carriage returns
    .replace(/[\r\n]+[ \t]*#{1,6}[ \t]*/g, "\n")
    // Remove bold **text** or __text__ syntax
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    // Absolute safety fallback: strip any remaining stray hash symbols (#)
    .replace(/#{1,6}/g, "")
    .trim();
}

export function cleanHeadingTitle(title: string): string {
  if (!title) return "";
  return title
    // Strip heading hashes
    .replace(/^[ \t]*#{1,6}[ \t]*/g, "")
    // Strip bold stars & underscores
    .replace(/\*\*/g, "")
    .replace(/__/g, "")
    // Strip leading emojis and numbers like "🌟 01. ", "❗ 02. ", "🎯 03. ", "1. "
    .replace(/^[❗🌟🎯✦★\*\-\s\d]+[\.\)]?\s*/g, "")
    // Remove trailing colon
    .replace(/:$/, "")
    // Remove any remaining stray hashes
    .replace(/#{1,6}/g, "")
    .trim();
}

export function isMainSectionHeader(title: string): boolean {
  if (!title) return false;
  const t = title.toUpperCase().replace(/^[❗🌟🎯✦\*\-\d\.\s]+/, "").trim();
  return (
    t.includes("RINGKASAN AWAL") ||
    t.includes("AREA YANG PERLU DIPERHATIKAN") ||
    t.includes("MINAT & POTENSI") ||
    t.includes("MINAT DAN POTENSI") ||
    t.includes("REKOMENDASI PENDAMPINGAN") ||
    t.includes("REKOMENDASI RUMAH") ||
    t.includes("FOKUS PENDAMPINGAN") ||
    t.startsWith("1.") ||
    t.startsWith("2.") ||
    t.startsWith("3.") ||
    t.startsWith("4.")
  );
}

export type ParsedReportSectionItem = {
  title: string;
  desc: string;
};

export type ParsedReportData = {
  summary: string;
  concerns: ParsedReportSectionItem[];
  potentials: ParsedReportSectionItem[];
  recommendations: ParsedReportSectionItem[];
  mainPriorities: string[];
};

export function parseReportSections(analysis: any, fallbackMarkdownText?: string): ParsedReportData {
  const parseBlocks = (text: string): ParsedReportSectionItem[] => {
    if (!text || text === "-") return [];
    const items: ParsedReportSectionItem[] = [];

    // Split text into distinct item blocks by emojis (❗, 🌟, 🎯), numbers (01., 1.), headings (#), or double newlines
    const rawBlocks = text.split(/(?=(?:^[ \t]*[❗🌟🎯]\s*\d*[\.\)]?|^\s*\d+[\.\)]\s*|^\s*#{1,6}\s+))/gm);

    for (const block of rawBlocks) {
      const trimmed = block.trim();
      if (!trimmed || trimmed === "-") continue;

      const firstLineEnd = trimmed.indexOf("\n");
      let headingLine = "";
      let descBody = "";

      if (firstLineEnd !== -1) {
        headingLine = trimmed.substring(0, firstLineEnd).trim();
        descBody = trimmed.substring(firstLineEnd + 1).trim();
      } else {
        headingLine = trimmed;
      }

      // Clean heading title
      const title = cleanHeadingTitle(headingLine);
      const desc = sanitizeAnalysisMarkdown(descBody);

      // Filter out main section headers to prevent duplicate cards!
      if (title && !isMainSectionHeader(title)) {
        items.push({ title, desc });
      } else if (descBody && isMainSectionHeader(title)) {
        // Recursive parse if section header block contains nested items
        const subItems = parseBlocks(descBody);
        items.push(...subItems);
      }
    }

    // Secondary fallback split by double newlines if items array is empty
    if (items.length === 0 && text) {
      const cleanText = sanitizeAnalysisMarkdown(text);
      const lines = cleanText.split("\n\n").filter((l) => l.trim().length > 0);
      for (const paragraph of lines) {
        const pTrimmed = paragraph.trim();
        const firstLineEnd = pTrimmed.indexOf("\n");
        if (firstLineEnd !== -1) {
          const h = cleanHeadingTitle(pTrimmed.substring(0, firstLineEnd));
          const d = sanitizeAnalysisMarkdown(pTrimmed.substring(firstLineEnd + 1));
          if (h && !isMainSectionHeader(h)) items.push({ title: h, desc: d });
        } else {
          const h = cleanHeadingTitle(pTrimmed);
          if (h && !isMainSectionHeader(h) && h.length > 3) items.push({ title: h, desc: "" });
        }
      }
    }

    return items;
  };

  // Clean summary text
  let rawSummary = (analysis?.summary || "").trim();
  rawSummary = sanitizeAnalysisMarkdown(rawSummary);
  rawSummary = rawSummary.replace(/^(?:1\.\s*)?RINGKASAN AWAL:?\s*/i, "").trim();

  let weaknessesText = (analysis?.weaknesses && analysis.weaknesses !== "-") ? analysis.weaknesses : "";
  let strengthsText = (analysis?.strengths && analysis.strengths !== "-") ? analysis.strengths : (analysis?.potential || "");
  let recText = (analysis?.education_recommendation && analysis.education_recommendation !== "-") ? analysis.education_recommendation : "";

  const fullText = analysis?.analysis || fallbackMarkdownText || "";

  if (!weaknessesText && fullText) {
    const match = fullText.match(/(?:##?\s*(?:2\.\s*)?AREA YANG PERLU DIPERHATIKAN|##?\s*❗[\s\S]*?Area yang Perlu Diperhatikan)([\s\S]*?)(?=## 3|## 4|\n# |🌟|🎯|$)/i);
    if (match) weaknessesText = match[1].trim();
  }

  if (!strengthsText && fullText) {
    const match = fullText.match(/(?:##?\s*(?:3\.\s*)?MINAT & POTENSI|##?\s*🌟[\s\S]*?Minat & Potensi)([\s\S]*?)(?=## 4|\n# |🎯|$)/i);
    if (match) strengthsText = match[1].trim();
  }

  if (!recText && fullText) {
    const match = fullText.match(/(?:##?\s*(?:4\.\s*)?REKOMENDASI|##?\s*🎯[\s\S]*?Rekomendasi)([\s\S]*?)(?=$)/i);
    if (match) recText = match[1].trim();
  }

  const concerns = parseBlocks(weaknessesText);
  const potentials = parseBlocks(strengthsText);
  const recommendations = parseBlocks(recText);

  return {
    summary: rawSummary || "• Berdasarkan jawaban kuesioner, hasil analisis sedang diproses.",
    concerns,
    potentials,
    recommendations,
    mainPriorities: []
  };
}

export async function getLatestConsultationAnalysisHelper(consultationId: string) {
  // 1. Fetch consultation row
  const { data: consult } = await supabase
    .from("consultations")
    .select("*")
    .eq("id", consultationId)
    .maybeSingle();

  if (!consult) throw new Error("Data konsultasi tidak ditemukan.");

  // 2. Fetch Q&A answers using resolveOptionAndAnswerText helper
  const { data: answers } = await supabase
    .from("consultation_answers")
    .select("*, questions(question_text)")
    .eq("consultation_id", consultationId);

  const allOptionIds = answers?.flatMap((a) => a.selected_option_ids || []) || [];
  let optionsMapFromDb: Record<string, string> = {};
  if (allOptionIds.length > 0) {
    const { data: opts } = await supabase.from("question_options").select("id, option_text").in("id", allOptionIds);
    if (opts) optionsMapFromDb = opts.reduce((acc, o) => ({ ...acc, [o.id]: o.option_text }), {});
  }

  const { resolveOptionAndAnswerText } = require("../actions/process-consultation");

  const mappedAnswers = (answers || []).map((a) => {
    const qText = a.questions?.question_text || a.question || "Pertanyaan Kuesioner";
    const aText = resolveOptionAndAnswerText(a, optionsMapFromDb);
    return { q: qText, a: aText };
  });

  const answersFormatted = mappedAnswers.map((ans) => `P: ${ans.q}\nJ: ${ans.a}`).join("\n\n");

  // 3. Fetch latest analysis row ORDER BY updated_at DESC
  const { data: analysisRows } = await (supabase as any)
    .from("consultation_analysis")
    .select("*")
    .eq("consultation_id", consultationId)
    .order("updated_at", { ascending: false, nullsFirst: false });

  let latestAnalysisRow = (analysisRows && analysisRows.length > 0) ? analysisRows[0] : null;

  // 4. Legacy Template Detector
  const legacyKeywords = [
    "Pengaturan Screen Time & Pendampingan Aktivitas Digital",
    "Kemandirian Harian & Pembiasaan Tanggung Jawab Rutin",
    "Regulasi Emosi & Ketahanan Menghadapi Kesulitan",
    "Kemampuan Adaptasi Bersosialisasi",
    "Stimulasi Karakter & Kegemaran Membaca",
    "Eksplorasi Pilihan Jurusan",
    "Portofolio Digital"
  ];

  const analysisContentStr = JSON.stringify(latestAnalysisRow || {});
  const isLegacy = legacyKeywords.some(kw => analysisContentStr.includes(kw));

  let effectiveAnalysis = latestAnalysisRow;

  if (isLegacy) {
    effectiveAnalysis = null;
  }

  if (!effectiveAnalysis) {
    throw new Error("Analisis belum tersedia.");
  }

  // Debug source logging
  console.log("==================================================");
  console.log("PDF/WEB ANALYSIS SOURCE DEBUG LOG:");
  console.log("- Consultation ID:", consultationId);
  console.log("- Analysis ID:", latestAnalysisRow?.id || "DB_ROW");
  console.log("- Created At:", latestAnalysisRow?.created_at);
  console.log("- Updated At:", latestAnalysisRow?.updated_at);
  console.log("- Summary Snippet:", effectiveAnalysis.summary?.slice(0, 100));
  console.log("==================================================");

  const parsedSections = parseReportSections(effectiveAnalysis, consult.ai_result || "");

  return {
    consult,
    effectiveAnalysis,
    parsedSections,
    answersFormatted
  };
}

export async function handleDownloadPdfForConsultation(
  item: Consultation,
  onStart?: () => void,
  onFinish?: () => void
) {
  try {
    if (onStart) onStart();
    toast.info(`Menyiapkan Laporan PDF Resmi untuk ${item.parent_name}...`);

    const { jsPDF } = await import("jspdf");
    await new Promise((r) => setTimeout(r, 60));

    // Use centralized helper to ensure 100% identical data with Web UI
    const { consult, parsedSections } = await getLatestConsultationAnalysisHelper(item.id);
    const parsedData = parsedSections;

    const dateStr = format(new Date(consult.created_at || item.created_at), "dd MMMM yyyy", { locale: id });
    const levelLabel = (LEVEL_LABELS[consult.level] || consult.level).toUpperCase();
    const refIdShort = consult.id.substring(0, 8).toUpperCase();
    const childDisplayName = consult.child_name && consult.child_name !== "-" ? consult.child_name : "Ananda";

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 210
    const pageHeight = doc.internal.pageSize.getHeight(); // 297
    const margin = 14;
    const contentWidth = pageWidth - margin * 2; // 182

    // Helper for checking smart page break
    let yPos = 14;

    const checkPageBreak = (neededH: number) => {
      if (yPos + neededH > pageHeight - 22) {
        doc.addPage();
        yPos = 18;
        return true;
      }
      return false;
    };

    // --- 1. TOP HEADER COVER ---
    // Top Bar Deep Aqua (#075E63)
    doc.setFillColor(7, 94, 99);
    doc.rect(0, 0, pageWidth, 6, "F");

    // Title Block
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(7, 94, 99);
    doc.text("SEKOLAH ALAM AL-KARIM — EDUKONSUL", margin, 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Laporan Evaluasi & Rekomendasi Konsultan Pendidikan Anak", margin, 20);

    // Badge Pill Right Side
    const badgeW = 42;
    const badgeX = pageWidth - margin - badgeW;
    doc.setFillColor(11, 122, 117); // Ocean #0B7A75
    doc.roundedRect(badgeX, 10, badgeW, 10, 2, 2, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(`JENJANG ${levelLabel}`, badgeX + badgeW / 2, 16.5, { align: "center" });

    // Divider Line
    doc.setDrawColor(11, 122, 117);
    doc.setLineWidth(0.4);
    doc.line(margin, 23, pageWidth - margin, 23);

    // --- 2. PARTICIPANT DATA CARD ---
    yPos = 26;
    doc.setFillColor(248, 250, 252); // #F8FAFC
    doc.setDrawColor(226, 232, 240); // #E2E8F0
    doc.roundedRect(margin, yPos, contentWidth, 24, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(7, 94, 99);
    doc.text("DATA ORANG TUA", margin + 5, yPos + 6);
    doc.text("DATA ANAK & EVALUASI", margin + 95, yPos + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Nama Orang Tua : ${sanitizeTextForPdf(item.parent_name)}`, margin + 5, yPos + 12);
    doc.text(`Nomor WhatsApp : ${sanitizeTextForPdf(item.whatsapp_number)}`, margin + 5, yPos + 18);

    doc.text(`Nama Anak          : ${sanitizeTextForPdf(childDisplayName)}`, margin + 95, yPos + 12);
    doc.text(`Tanggal Evaluasi : ${dateStr} (Ref: #${refIdShort})`, margin + 95, yPos + 18);

    yPos += 30;

    // --- 3. RINGKASAN AWAL CARD ---
    const cleanSummary = sanitizeTextForPdf(parsedData.summary);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const summaryLines = doc.splitTextToSize(cleanSummary, contentWidth - 10);
    const summaryCardH = 16 + summaryLines.length * 4.2;

    doc.setFillColor(232, 245, 243); // #E8F5F3
    doc.setDrawColor(11, 122, 117);
    doc.roundedRect(margin, yPos, contentWidth, summaryCardH, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(7, 94, 99);
    doc.text("RINGKASAN AWAL EVALUASI", margin + 5, yPos + 7);

    // Highlight pills if available
    let pillOffsetX = margin + 65;
    if (parsedData.concerns[0]?.title) {
      const p1Text = `Fokus: ${sanitizeTextForPdf(parsedData.concerns[0].title.substring(0, 30))}`;
      doc.setFillColor(254, 215, 170); // Warm orange
      doc.roundedRect(pillOffsetX, yPos + 3, 50, 5, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(124, 45, 18);
      doc.text(p1Text, pillOffsetX + 25, yPos + 6.5, { align: "center" });
      pillOffsetX += 53;
    }
    if (parsedData.potentials[0]?.title) {
      const p2Text = `Potensi: ${sanitizeTextForPdf(parsedData.potentials[0].title.substring(0, 30))}`;
      doc.setFillColor(167, 243, 208); // Emerald light
      doc.roundedRect(pillOffsetX, yPos + 3, 50, 5, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(6, 95, 70);
      doc.text(p2Text, pillOffsetX + 25, yPos + 6.5, { align: "center" });
    }

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(summaryLines, margin + 5, yPos + 13, { lineHeightFactor: 1.4 });

    yPos += summaryCardH + 7;

    // --- 4. AREA YANG PERLU DIPERHATIKAN ---
    if (parsedData.concerns.length > 0) {
      checkPageBreak(12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(234, 88, 12); // #EA580C
      doc.text("1. AREA YANG PERLU DIPERHATIKAN", margin, yPos);
      yPos += 2;
      doc.setDrawColor(254, 215, 170);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;

      parsedData.concerns.forEach((c, idx) => {
        const cleanTitle = sanitizeTextForPdf(c.title);
        const cleanDesc = sanitizeTextForPdf(c.desc);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        const descLines = doc.splitTextToSize(cleanDesc, contentWidth - 16);
        const cardH = 11 + descLines.length * 4.2;

        checkPageBreak(cardH + 4);

        // Card fill & border
        doc.setFillColor(255, 248, 246); // #FFF8F6
        doc.setDrawColor(254, 215, 170); // #FED7AA
        doc.roundedRect(margin, yPos, contentWidth, cardH, 2, 2, "FD");

        // Left vertical accent bar
        doc.setFillColor(234, 88, 12);
        doc.rect(margin, yPos, 2, cardH, "F");

        // Number Badge Box
        const numStr = String(idx + 1).padStart(2, "0");
        doc.setFillColor(234, 88, 12);
        doc.roundedRect(margin + 4, yPos + 3, 7, 5, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(255, 255, 255);
        doc.text(numStr, margin + 7.5, yPos + 6.5, { align: "center" });

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(124, 45, 18);
        doc.text(cleanTitle, margin + 14, yPos + 6.5);

        // Description
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        doc.text(descLines, margin + 6, yPos + 12, { lineHeightFactor: 1.4 });

        yPos += cardH + 4;
      });
      yPos += 3;
    }

    // --- 5. MINAT & POTENSI ---
    if (parsedData.potentials.length > 0) {
      checkPageBreak(12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(5, 150, 105); // #059669
      doc.text("2. MINAT & POTENSI UNGGULAN", margin, yPos);
      yPos += 2;
      doc.setDrawColor(167, 243, 208);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;

      parsedData.potentials.forEach((p, idx) => {
        const cleanTitle = sanitizeTextForPdf(p.title);
        const cleanDesc = sanitizeTextForPdf(p.desc);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        const descLines = doc.splitTextToSize(cleanDesc, contentWidth - 16);
        const cardH = 11 + descLines.length * 4.2;

        checkPageBreak(cardH + 4);

        // Card fill & border
        doc.setFillColor(240, 253, 244); // #F0FDF4
        doc.setDrawColor(167, 243, 208); // #A7F3D0
        doc.roundedRect(margin, yPos, contentWidth, cardH, 2, 2, "FD");

        // Left vertical accent bar
        doc.setFillColor(5, 150, 105);
        doc.rect(margin, yPos, 2, cardH, "F");

        // Number Badge Box
        const badgeTag = `POTENSI ${String(idx + 1).padStart(2, "0")}`;
        doc.setFillColor(5, 150, 105);
        doc.roundedRect(margin + 4, yPos + 3, 18, 5, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(255, 255, 255);
        doc.text(badgeTag, margin + 13, yPos + 6.5, { align: "center" });

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(6, 95, 70);
        doc.text(cleanTitle, margin + 25, yPos + 6.5);

        // Description
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        doc.text(descLines, margin + 6, yPos + 12, { lineHeightFactor: 1.4 });

        yPos += cardH + 4;
      });
      yPos += 3;
    }

    // --- 6. REKOMENDASI PENDAMPINGAN ---
    if (parsedData.recommendations.length > 0) {
      checkPageBreak(12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(2, 132, 199); // #0284C7
      doc.text("3. REKOMENDASI PENDAMPINGAN RUMAH (ACTION PLAN)", margin, yPos);
      yPos += 2;
      doc.setDrawColor(186, 230, 253);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;

      parsedData.recommendations.forEach((r, idx) => {
        const cleanTitle = sanitizeTextForPdf(r.title);
        const cleanDesc = sanitizeTextForPdf(r.desc);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        const descLines = doc.splitTextToSize(cleanDesc, contentWidth - 16);
        const cardH = 11 + descLines.length * 4.2;

        checkPageBreak(cardH + 4);

        // Card fill & border
        doc.setFillColor(240, 249, 255); // #F0F9FF
        doc.setDrawColor(186, 230, 253); // #BAE6FD
        doc.roundedRect(margin, yPos, contentWidth, cardH, 2, 2, "FD");

        // Left vertical accent bar
        doc.setFillColor(2, 132, 199);
        doc.rect(margin, yPos, 2, cardH, "F");

        // Number Badge Box
        const badgeTag = `ACTION ${String(idx + 1).padStart(2, "0")}`;
        doc.setFillColor(2, 132, 199);
        doc.roundedRect(margin + 4, yPos + 3, 18, 5, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(255, 255, 255);
        doc.text(badgeTag, margin + 13, yPos + 6.5, { align: "center" });

        // Title
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(7, 94, 99);
        doc.text(cleanTitle, margin + 25, yPos + 6.5);

        // Description
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        doc.text(descLines, margin + 6, yPos + 12, { lineHeightFactor: 1.4 });

        yPos += cardH + 4;
      });
      yPos += 3;
    }



    // --- 8. FOOTER & PAGE NUMBERS ON ALL PAGES ---
    const totalPages = doc.getNumberOfPages();
    for (let pageIndex = 1; pageIndex <= totalPages; pageIndex++) {
      doc.setPage(pageIndex);

      // Top running header for page > 1
      if (pageIndex > 1) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`SEKOLAH ALAM AL-KARIM — EDUKONSUL | Laporan Evaluasi Ananda ${sanitizeTextForPdf(childDisplayName)}`, margin, 10);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(margin, 12, pageWidth - margin, 12);
      }

      // Bottom footer line
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, 283, pageWidth - margin, 283);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Dokumen Laporan Resmi EduKonsul — Sekolah Alam Al-Karim | Ref: #${refIdShort} | ${dateStr}`, margin, 288);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(7, 94, 99);
      doc.text(`${String(pageIndex).padStart(2, "0")} / ${String(totalPages).padStart(2, "0")}`, pageWidth - margin, 288, { align: "right" });
    }

    const fileName = `Laporan_EduKonsul_${(item.parent_name || "OrangTua").replace(/\s+/g, "_")}.pdf`;
    doc.save(fileName);
    toast.success("Dokumen PDF laporan resmi berhasil diunduh!");

  } catch (err: any) {
    console.error("Native jsPDF error:", err);
    toast.error("Gagal membuat PDF: " + (err.message || "Error PDF Generator"));
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
  const { generateInterpretedAnalysis } = require("../actions/ai-engine");
  return generateInterpretedAnalysis(parentName, childName, level, formattedAnswers);
}


