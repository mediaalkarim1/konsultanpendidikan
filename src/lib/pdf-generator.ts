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
    // Remove leading numbering like "1. " or "1) "
    .replace(/^\d+[\.\)]\s*/, "")
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

    // Split text into blocks by heading boundaries or newlines
    const rawBlocks = text.split(/(?=(?:^[ \t]*#{1,6}\s+|^\s*###?\s*))/gm);

    for (const block of rawBlocks) {
      const trimmed = block.trim();
      if (!trimmed) continue;

      const firstLineEnd = trimmed.indexOf("\n");
      let headingLine = "";
      let descBody = "";

      if (firstLineEnd !== -1) {
        headingLine = trimmed.substring(0, firstLineEnd).trim();
        descBody = trimmed.substring(firstLineEnd + 1).trim();
      } else {
        headingLine = trimmed;
      }

      // Clean heading title while PRESERVING emojis and title content (e.g. "❗ Pemetaan Pilihan Jurusan")
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

    // Secondary fallback split if items array is empty but text has paragraphs
    if (items.length === 0 && text) {
      const cleanText = sanitizeAnalysisMarkdown(text);
      const lines = cleanText.split("\n").filter((l) => l.trim().length > 0);
      for (const line of lines) {
        const cleaned = cleanHeadingTitle(line);
        if (cleaned && !isMainSectionHeader(cleaned) && cleaned.length > 3) {
          items.push({ title: cleaned, desc: "" });
        }
      }
    }

    return items;
  };

  // Clean summary text
  let rawSummary = (analysis?.summary || "").trim();
  rawSummary = sanitizeAnalysisMarkdown(rawSummary);
  // Remove duplicate section title like "1. RINGKASAN AWAL:" from start of summary
  rawSummary = rawSummary.replace(/^(?:1\.\s*)?RINGKASAN AWAL:?\s*/i, "").trim();

  let weaknessesText = (analysis?.weaknesses && analysis.weaknesses !== "-") ? analysis.weaknesses : "";
  let strengthsText = (analysis?.strengths && analysis.strengths !== "-") ? analysis.strengths : (analysis?.potential || "");
  let recText = (analysis?.education_recommendation && analysis.education_recommendation !== "-") ? analysis.education_recommendation : "";

  const fullText = analysis?.analysis || fallbackMarkdownText || "";

  if (!weaknessesText && fullText) {
    const match = fullText.match(/(?:##?\s*(?:2\.\s*)?AREA YANG PERLU DIPERHATIKAN|##?\s*❗[\s\S]*?Area yang Perlu Diperhatikan)([\s\S]*?)(?=## 3|## 4|\n# |$)/i);
    if (match) weaknessesText = match[1].trim();
  }

  if (!strengthsText && fullText) {
    const match = fullText.match(/(?:##?\s*(?:3\.\s*)?MINAT & POTENSI|##?\s*🌟[\s\S]*?Minat & Potensi)([\s\S]*?)(?=## 4|\n# |$)/i);
    if (match) strengthsText = match[1].trim();
  }

  if (!recText && fullText) {
    const match = fullText.match(/(?:##?\s*(?:4\.\s*)?REKOMENDASI|##?\s*🎯[\s\S]*?Rekomendasi)([\s\S]*?)(?=$)/i);
    if (match) recText = match[1].trim();
  }

  const concerns = parseBlocks(weaknessesText);
  const potentials = parseBlocks(strengthsText);
  const recommendations = parseBlocks(recText);

  const mainPriorities: string[] = [];
  concerns.slice(0, 3).forEach((c) => {
    const cleanTitle = cleanHeadingTitle(c.title).replace(/^[❗🌟🎯✦\*\-\d\.\s]+/, "").trim();
    if (cleanTitle && !mainPriorities.includes(cleanTitle)) mainPriorities.push(cleanTitle);
  });
  if (mainPriorities.length < 3) {
    recommendations.slice(0, 3).forEach((r) => {
      const cleanTitle = cleanHeadingTitle(r.title).replace(/^[❗🌟🎯✦\*\-\d\.\s]+/, "").trim();
      if (cleanTitle && !mainPriorities.includes(cleanTitle) && mainPriorities.length < 3) {
        mainPriorities.push(cleanTitle);
      }
    });
  }

  return {
    summary: rawSummary || "Ringkasan evaluasi hasil assessment konsultan pendidikan anak.",
    concerns,
    potentials,
    recommendations,
    mainPriorities
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

    // Fetch consultation answers & options
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

    const parsedData = parseReportSections(analysisData || { summary: dynamicNarrative.summary, analysis: (item as any).ai_result || dynamicNarrative.analysis, weaknesses: dynamicNarrative.weaknesses, strengths: dynamicNarrative.strengths, education_recommendation: dynamicNarrative.education_recommendation }, (item as any).ai_result || dynamicNarrative.analysis);

    const dateStr = format(new Date(item.created_at), "dd MMMM yyyy", { locale: id });
    const levelLabel = (LEVEL_LABELS[item.level] || item.level).toUpperCase();
    const refIdShort = item.id.substring(0, 8).toUpperCase();
    const childDisplayName = item.child_name && item.child_name !== "-" ? item.child_name : "Ananda";

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

    // --- 7. FOKUS PENDAMPINGAN UTAMA ---
    if (parsedData.mainPriorities.length > 0) {
      checkPageBreak(24);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(7, 94, 99);
      doc.text("4. FOKUS PENDAMPINGAN UTAMA", margin, yPos);
      yPos += 2;
      doc.setDrawColor(11, 122, 117);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;

      const priorityCardH = 10 + parsedData.mainPriorities.length * 6;
      doc.setFillColor(232, 245, 243); // #E8F5F3
      doc.setDrawColor(11, 122, 117);
      doc.roundedRect(margin, yPos, contentWidth, priorityCardH, 2, 2, "FD");

      let prioY = yPos + 6;
      parsedData.mainPriorities.forEach((prio, i) => {
        const cleanPrio = sanitizeTextForPdf(prio);
        doc.setFillColor(7, 94, 99);
        doc.roundedRect(margin + 5, prioY - 3, 5, 4, 1, 1, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(255, 255, 255);
        doc.text(String(i + 1), margin + 7.5, prioY - 0.2, { align: "center" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(17, 52, 58);
        doc.text(cleanPrio, margin + 12, prioY);
        prioY += 6;
      });

      yPos += priorityCardH + 5;
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
  const jenjangLabel = level === "tksd" ? "TK & SD" : level === "smp" ? "SMP" : "SMA";
  
  // Clean up parentName and extract childName if encoded as "Parent (Anak: Child)"
  let cleanParentName = (parentName || "Orang Tua").trim();
  let cleanChildName = (childName && childName !== "-" ? childName : "").trim();

  if (cleanParentName.includes("(Anak:")) {
    const match = cleanParentName.match(/^(.*?)\s*\(Anak:\s*([^)]+)\)/i);
    if (match) {
      cleanParentName = match[1].trim();
      if (!cleanChildName) cleanChildName = match[2].trim();
    }
  }

  const nameDisplay = cleanChildName || "Ananda";
  const parentDisplay = cleanParentName || "Bunda/Ayah";
  const childPhrase = cleanChildName ? `Ananda ${cleanChildName}` : "Ananda";

  type QA = { q: string; a: string };
  const qa: QA[] = (formattedAnswers || "")
    .split("\n\n")
    .map((item) => {
      const lines = item.split("\n");
      return {
        q: (lines[0] || "").replace(/^P:\s*/, "").trim(),
        a: (lines[1] || "").replace(/^J:\s*/, "").trim()
      };
    })
    .filter((x) => (x.q || x.a) && x.a && x.a !== "-");

  // Helper to map parent answers to clean professional topic titles
  const deriveCleanTitleFromAnswer = (ans: string, qText: string): { title: string; isConcern: boolean; isPotential: boolean } => {
    const lowerA = ans.toLowerCase();
    const lowerQ = qText.toLowerCase();

    if (lowerA.includes("bingung menentukan jurusan") || lowerA.includes("jurusan kuliah")) {
      return { title: "Pemetaan Pilihan Jurusan Kuliah & Perguruan Tinggi", isConcern: true, isPotential: false };
    }
    if (lowerA.includes("belum memiliki tujuan") || lowerA.includes("belum memiliki gambaran")) {
      return { title: "Kejelasan Arah Cita-Cita & Purpose Masa Depan", isConcern: true, isPotential: false };
    }
    if (lowerA.includes("belum memiliki pengalaman organisasi") || lowerA.includes("hampir tidak pernah")) {
      return { title: "Pengalaman Proyek Nyata & Portofolio Organisasi", isConcern: true, isPotential: false };
    }
    if (lowerA.includes("lebih dari") || lowerA.includes("4–6 jam") || lowerA.includes("6 jam") || lowerA.includes("hampir setiap waktu")) {
      return { title: "Pengelolaan Screen Time & Durasi Gawai Harian", isConcern: true, isPotential: false };
    }
    if (lowerA.includes("menangis") || lowerA.includes("marah") || lowerA.includes("rewel")) {
      return { title: "Regulasi Emosi & Respon Saat Pengalihan Aktivitas", isConcern: true, isPotential: false };
    }
    if (lowerA.includes("menunda") || lowerA.includes("mudah menyerah") || lowerA.includes("menunggu arahan")) {
      return { title: "Kemandirian Inisiatif & Ketahanan Menghadapi Tugas", isConcern: true, isPotential: false };
    }
    if (lowerA.includes("kurang percaya diri") || lowerA.includes("pemalu") || lowerA.includes("masih malu")) {
      return { title: "Rasa Percaya Diri & Keberanian Menyampaikan Pendapat", isConcern: true, isPotential: false };
    }
    if (lowerA.includes("bahasa inggris") || lowerA.includes("public speaking") || lowerA.includes("problem solving")) {
      return { title: `Pengembangan Keterampilan Utama (${ans})`, isConcern: false, isPotential: true };
    }
    if (lowerA.includes("kuliah") || lowerA.includes("beasiswa") || lowerA.includes("persiapan kuliah")) {
      return { title: "Fokus Persiapan Perguruan Tinggi & Beasiswa", isConcern: false, isPotential: true };
    }
    if (lowerA.includes("sudah terbiasa") || lowerA.includes("mencoba sendiri") || lowerA.includes("sangat mudah berteman")) {
      return { title: `Karakter Mandiri & Adaptasi Positif (${ans})`, isConcern: false, isPotential: true };
    }
    if (lowerA.includes("akhlak") || lowerA.includes("karakter") || lowerA.includes("disiplin")) {
      return { title: "Penguatan Nilai Karakter & Akhlak Anak", isConcern: false, isPotential: true };
    }

    // Default fallback cleanly derived from answer string
    const cleanAns = ans.length > 50 ? ans.slice(0, 47) + "..." : ans;
    // Skip demographic answers from becoming potentials
    const isDemographic = /^(3|4|5|6|7|8|9|10|11|12|13|14|15|16|17|18)\s*tahun$/i.test(ans) || /^(tk\s*a|tk\s*b|sd|smp|sma|belum sekolah|ya|tidak|mungkin|mungkin nanti)$/i.test(ans);
    if (isDemographic) {
      return { title: "", isConcern: false, isPotential: false };
    }

    if (/(belum|sulit|kurang|jarang|tidak|menunda|menangis|marah)/i.test(ans)) {
      return { title: `Pendampingan Terarah pada Aspek "${cleanAns}"`, isConcern: true, isPotential: false };
    } else {
      return { title: `Potensi Positif pada Aspek "${cleanAns}"`, isConcern: false, isPotential: true };
    }
  };

  const concernsList: { title: string; desc: string }[] = [];
  const potentialsList: { title: string; desc: string }[] = [];

  for (const item of qa) {
    if (!item.a || item.a === "-") continue;
    const { title, isConcern, isPotential } = deriveCleanTitleFromAnswer(item.a, item.q);
    
    if (isConcern) {
      // Avoid exact duplicates
      if (!concernsList.some(c => c.title === title)) {
        concernsList.push({
          title,
          desc: `Jawaban orang tua mencatat: "${item.a}". Hal ini menjadi area perhatian yang memerlukan arahan dan pendampingan terstruktur di rumah.`
        });
      }
    } else if (isPotential) {
      if (!potentialsList.some(p => p.title === title)) {
        potentialsList.push({
          title,
          desc: `Jawaban orang tua menunjukkan: "${item.a}". Keadaan ini menjadi modal kekuatan positif yang sangat baik untuk terus dioptimalkan.`
        });
      }
    }
  }

  // Ensure level-appropriate fallback items if answers yielded fewer than minimums
  if (level === "sma") {
    const smaDefaults = [
      { title: "Pemetaan Pilihan Jurusan & Prospek Karier Perguruan Tinggi", desc: `Menjelang kelulusan SMA, ${childPhrase} memerlukan pendampingan diskusi objektif untuk membedah kecocokan antara minat, bakat, dan pilihan jurusan kuliah.` },
      { title: "Pengayaan Portofolio Karya & Pengalaman Proyek Mandiri", desc: `${childPhrase} perlu didorong untuk mendokumentasikan karya atau pengalaman proyek nyata sebagai bekal portofolio pendaftaran kampus/beasiswa.` },
      { title: "Keterampilan Bahasa Inggris Aktif & Literasi Digital", desc: `Penguasaan komunikasi Bahasa Inggris dan keahlian digital menjadi modal kunci untuk kesiapan persaingan di jenjang perguruan tinggi.` },
      { title: "Manajemen Waktu & Kemandirian Pengelolaan Anggaran", desc: `Pembiasaan menyusun skala prioritas belajar dan literasi keuangan mandiri penting ditanamkan sebelum memasuki kehidupan kampus.` },
      { title: "Pengelolaan Regulasi Diri & Tekanan Menghadapi Kelulusan", desc: `Pendampingan keluarga yang hangat sangat dibutuhkan ${childPhrase} untuk menjaga kestabilan motivasi dan ketenangan pikiran.` }
    ];
    for (const d of smaDefaults) {
      if (concernsList.length >= 5) break;
      if (!concernsList.some(c => c.title === d.title)) concernsList.push(d);
    }
  } else if (level === "smp") {
    const smpDefaults = [
      { title: "Pengelolaan Waktu Belajar & Pembatasan Durasi Gawai", desc: `Pada fase remaja SMP, ${childPhrase} membutuhkan kesepakatan rutinitas harian yang seimbang antara waktu belajar dan aktivitas layar.` },
      { title: "Kedisiplinan Belajar & Pengurangan Kebiasaan Menunda Task", desc: `Pembiasaan membagi tugas sekolah menjadi sesi-sesi kecil terbukti efektif menjaga konsistensi belajar ${nameDisplay}.` },
      { title: "Rasa Percaya Diri & Keberanian Komunikasi Keluarga", desc: `Fasilitasi ruang ruang terbuka di rumah agar ${childPhrase} merasa nyaman mengungkapkan pendapat tanpa rasa takut dinilai.` },
      { title: "Eksplorasi Minat & Pengalaman Berorganisasi/Klub", desc: `Mendorong keterlibatan ${childPhrase} dalam kegiatan di luar kelas membantu memperluas wawasan dan mengenali bakat alaminya.` },
      { title: "Daya Tahan Pemecahan Masalah (Problem Solving)", desc: `${childPhrase} perlu didampingi saat menghadapi materi menantang dengan pendekatan diskusi panduan bertahap.` }
    ];
    for (const d of smpDefaults) {
      if (concernsList.length >= 5) break;
      if (!concernsList.some(c => c.title === d.title)) concernsList.push(d);
    }
  } else {
    const tksdDefaults = [
      { title: "Pengaturan Screen Time & Pendampingan Aktivitas Digital", desc: `Bagi anak usia dini/SD, batas durasi media digital dan pengalihan ke permainan fisik sangat penting untuk tumbuh kembang optimal.` },
      { title: "Kemandirian Harian & Pembiasaan Tanggung Jawab Rutin", desc: `Pembiasaan tugas-tugas mandiri kecil seperti merapikan mainan atau sepatu sendiri membantu memupuk rasa percaya diri ${nameDisplay}.` },
      { title: "Regulasi Emosi & Ketahanan Menghadapi Kesulitan", desc: `Ketika ${childPhrase} merasa frustrasi atau rewel saat belajar, apresiasi usahanya dan berikan jeda tenang sebelum mencoba kembali.` },
      { title: "Kemampuan Adaptasi Bersosialisasi dengan Teman Sebaya", desc: `Dukungan ramah keluarga membantu ${childPhrase} merasa aman saat berinteraksi di lingkungan sekolah atau kelompok bermain.` },
      { title: "Stimulasi Karakter & Kegemaran Membaca / Bermain Kreatif", desc: `Sajikan aktivitas eksplorasi berbasis buku cerita atau media visual bergambar untuk membangkitkan rasa ingin tahu ${nameDisplay}.` }
    ];
    for (const d of tksdDefaults) {
      if (concernsList.length >= 5) break;
      if (!concernsList.some(c => c.title === d.title)) concernsList.push(d);
    }
  }

  // Ensure minimum 3 potentials
  const potentialDefaults = [
    { title: `Daya Adaptasi & Antusiasme Belajar ${nameDisplay}`, desc: `Keterangan orang tua memperlihatkan bahwa ${childPhrase} memiliki potensi respon positif tinggi apabila didampingi secara hangat.` },
    { title: "Keterbukaan terhadap Apresiasi & Pendampingan Komunikatif", desc: `Pemberian pengakuan atas usaha nyata ${nameDisplay} terbukti efektif membangkitkan motivasi internal anak.` },
    { title: "Kecerdasan Eksplorasi Minat & Karakter Positif", desc: `${childPhrase} menunjukkan modal dasar yang baik untuk berkembang pesat di lingkungan pendidikan holistik.` }
  ];
  for (const p of potentialDefaults) {
    if (potentialsList.length >= 3) break;
    if (!potentialsList.some(x => x.title === p.title)) potentialsList.push(p);
  }

  // Generate recommendations linked directly to findings
  const rawRecs: string[] = [];
  concernsList.forEach((c) => {
    const t = c.title;
    if (t.includes("Jurusan") || t.includes("Karier") || t.includes("Cita-Cita")) {
      rawRecs.push(
        `Diskusi Matriks Minat & Eksplorasi Pilihan Jurusan\nAjak ${nameDisplay} berdiskusi santai untuk mengidentifikasi 3 bidang favorit, membandingkan mata kuliahnya, serta mencocokkan dengan potensi utamanya.`
      );
    } else if (t.includes("Portofolio") || t.includes("Proyek") || t.includes("Karya")) {
      rawRecs.push(
        `Buat Papan Dokumentasi Karya & Portofolio Digital\nDampingi ${nameDisplay} mengumpulkan sertifikat, hasil tulisan, foto kegiatan, atau proyek sekolah ke dalam satu folder portofolio yang rapi.`
      );
    } else if (t.includes("Screen Time") || t.includes("Gawai") || t.includes("Gadget")) {
      rawRecs.push(
        `Sepakati Batas Durasi Layar & Rutinitas Tanpa Gawai\nDiskusikan aturan waktu pemakaian gadget bersama ${nameDisplay} dan ciptakan area bebas layar saat jam belajar dan jam makan keluarga.`
      );
    } else if (t.includes("Bahasa Inggris") || t.includes("Public Speaking") || t.includes("Komunikasi")) {
      rawRecs.push(
        `Fasilitasi Latihan Berbicara & Media Bahasa Inggris Harian\nAjak ${nameDisplay} membaca buku ber-bahasa Inggris atau menceritakan kembali berita/video singkat yang diminatinya dalam Bahasa Inggris.`
      );
    } else if (t.includes("Kemandirian") || t.includes("Emosi") || t.includes("Tugas")) {
      rawRecs.push(
        `Terapkan Rutinitas Mandiri Bergradasi & Validasi Emosi\nBerikan kepercayaan tanggung jawab harian pada ${nameDisplay} disertai pujian spesifik saat berhasil menyelesaikannya secara mandiri.`
      );
    } else {
      rawRecs.push(
        `Lakukan Sesi Refleksi Mingguan Bersama Anak\nSediakan waktu 15 menit setiap pekan untuk mendengarkan cerita ${nameDisplay} tentang hambatan yang dihadapi dan merayakan pencapaian kecilnya.`
      );
    }
  });

  const poolRecs = [
    `Diskusi Matriks Minat & Eksplorasi Pilihan Jurusan\nAjak ${nameDisplay} berdiskusi santai untuk mengidentifikasi 3 bidang favorit, membandingkan mata kuliahnya, serta mencocokkan dengan potensi utamanya.`,
    `Buat Papan Dokumentasi Karya & Portofolio Digital\nDampingi ${nameDisplay} mengumpulkan sertifikat, hasil tulisan, foto kegiatan, atau proyek sekolah ke dalam satu folder portofolio yang rapi.`,
    `Sepakati Batas Durasi Layar & Rutinitas Tanpa Gawai\nDiskusikan aturan waktu pemakaian gadget bersama ${nameDisplay} dan ciptakan area bebas layar saat jam belajar dan jam makan keluarga.`,
    `Fasilitasi Latihan Berbicara & Media Bahasa Inggris Harian\nAjak ${nameDisplay} membaca buku ber-bahasa Inggris atau menceritakan kembali berita/video singkat yang diminatinya dalam Bahasa Inggris.`,
    `Terapkan Rutinitas Mandiri Bergradasi & Validasi Emosi\nBerikan kepercayaan tanggung jawab harian pada ${nameDisplay} disertai pujian spesifik saat berhasil menyelesaikannya secara mandiri.`,
    `Lakukan Sesi Refleksi Mingguan Bersama Anak\nSediakan waktu 15 menit setiap pekan untuk mendengarkan cerita ${nameDisplay} tentang hambatan yang dihadapi dan merayakan pencapaian kecilnya.`,
    `Ciptakan Suasana Belajar yang Kondusif & Suportif di Rumah\nPastikan pendampingan dilakukan dengan komunikasi dua arah agar ${nameDisplay} merasa aman dan nyaman saat belajar.`
  ];

  const recommendationsList: string[] = [];
  [...rawRecs, ...poolRecs].forEach(r => {
    const cleanR = sanitizeAnalysisMarkdown(r);
    if (recommendationsList.length < 5 && !recommendationsList.includes(cleanR)) {
      recommendationsList.push(cleanR);
    }
  });

  // Format clean output strings
  const formattedConcerns = concernsList
    .map((c) => `❗ ${c.title}\n${c.desc}`)
    .join("\n\n");

  const formattedPotentials = potentialsList
    .map((p) => `🌟 ${p.title}\n${p.desc}`)
    .join("\n\n");

  const formattedRecommendations = recommendationsList
    .map((r) => `🎯 ${r}`)
    .join("\n\n");

  // Summary format MUST be bullet points
  const summaryPoints = [
    `• Berdasarkan jawaban kuesioner ${parentDisplay}, ${childPhrase} memperlihatkan karakteristik belajar unik pada jenjang ${jenjangLabel}.`,
    potentialsList[0]?.title ? `• Potensi utama yang menonjol: ${potentialsList[0].title}.` : `• ${childPhrase} menunjukkan antusiasme positif saat didampingi secara produktif.`,
    concernsList[0]?.title ? `• Fokus pendampingan utama di rumah: ${concernsList[0].title}.` : `• Membutuhkan arahan terstruktur untuk mengoptimalkan kebiasaan harian.`
  ];

  const summary = summaryPoints.join("\n");
  const fullNarrative = `RINGKASAN AWAL\n\n${summary}\n\nAREA YANG PERLU DIPERHATIKAN\n\n${formattedConcerns}\n\nMINAT & POTENSI\n\n${formattedPotentials}\n\nREKOMENDASI PENDAMPINGAN RUMAH\n\n${formattedRecommendations}`;

  return {
    summary: sanitizeAnalysisMarkdown(summary),
    analysis: sanitizeAnalysisMarkdown(fullNarrative),
    strengths: sanitizeAnalysisMarkdown(formattedPotentials),
    weaknesses: sanitizeAnalysisMarkdown(formattedConcerns),
    potential: sanitizeAnalysisMarkdown(formattedPotentials),
    risk: sanitizeAnalysisMarkdown(formattedConcerns),
    education_recommendation: sanitizeAnalysisMarkdown(formattedRecommendations)
  };
}






