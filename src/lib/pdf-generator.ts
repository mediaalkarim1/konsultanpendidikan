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
  const parentDisplay = cleanParentName || "Orang Tua";
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
    .filter((x) => (x.q || x.a) && x.a !== "-");

  const NEGATIVE = /(belum|sulit|susah|kurang|jarang|tidak|sering lupa|mudah bosan|cepat bosan|malas|menolak|butuh dibantu|harus diingatkan|sering marah|menangis|takut|bingung|lambat)/i;
  const POSITIVE = /(suka|senang|sangat|mampu|bisa|aktif|cepat|antusias|rajin|mandiri|berani|kreatif|tertarik|hobi|pandai|mudah)/i;

  const shorten = (t: string, max = 90) => (t.length > max ? t.slice(0, max).trim() + "..." : t);
  const lower = (t: string) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t);

  const concerns: string[] = [];
  const potentials: string[] = [];

  for (const item of qa) {
    if (!item.a || item.a === "-") continue;
    const topic = shorten(item.q.replace(/\?$/, ""));
    if (NEGATIVE.test(item.a)) {
      concerns.push(
        `❗ ${topic}\nDari jawaban orang tua (${lower(shorten(item.a, 120))}), bagian ini terlihat masih membutuhkan pendampingan yang konsisten.`
      );
    } else if (POSITIVE.test(item.a)) {
      potentials.push(
        `🌟 ${topic}\nJawaban orang tua menunjukkan ${lower(shorten(item.a, 120))}, sehingga ini menjadi kekuatan yang dapat terus dikembangkan.`
      );
    } else {
      if (concerns.length <= potentials.length) {
        concerns.push(
          `❗ ${topic}\nBerdasarkan jawaban orang tua (${lower(shorten(item.a, 120))}), aspek ini dapat menjadi perhatian dalam pendampingan harian.`
        );
      } else {
        potentials.push(
          `🌟 ${topic}\nJawaban orang tua mencatat ${lower(shorten(item.a, 120))}, yang menjadi bagian dari keunikan dan potensi anak.`
        );
      }
    }
  }

  if (concerns.length === 0) {
    concerns.push(
      `❗ Rutinitas & Konsistensi Belajar\nBerdasarkan profil perkembangan jenjang ${jenjangLabel}, ${childPhrase} membutuhkan pendampingan yang konsisten dan penguatan kebiasaan harian.`
    );
  }
  if (potentials.length === 0) {
    potentials.push(
      `🌟 Kemampuan Adaptasi & Minat Belajar\n${childPhrase} memiliki potensi berkembang yang positif jika didukung dengan media belajar yang tepat dan motivasi keluarga.`
    );
  }

  const summary = `Ayah Bunda ${parentDisplay}, dari keseluruhan informasi yang disampaikan mengenai ${childPhrase} pada jenjang ${jenjangLabel}, terlihat gambaran anak yang memiliki keunikan belajar serta potensi yang dapat didukung secara optimal di rumah.\n\nSecara umum, terdapat beberapa kekuatan yang menonjol sekaligus area utama yang perlu mendapat pendampingan hangat dari keluarga.`;

  const concernsText = concerns.join("\n\n");
  const potentialsText = potentials.join("\n\n");

  const recommendation = `🎯 Rekomendasi Pendampingan

- Dampingi ${childPhrase} pada area yang masih perlu perhatian di atas dengan langkah kecil dan konsisten setiap hari.
- Kaitkan aktivitas belajar dengan minat dan potensi yang sudah terlihat agar anak lebih terlibat.
- Beri apresiasi pada setiap usaha yang ditunjukkan ${nameDisplay}, bukan hanya pada hasil akhirnya.
- Sepakati rutinitas harian yang sederhana dan realistis bersama anak di rumah.`;

  const fullNarrative = `## 1. RINGKASAN AWAL\n\n${summary}\n\n## 2. ❗ AREA YANG PERLU DIPERHATIKAN\n\n${concernsText}\n\n## 3. 🌟 MINAT & POTENSI\n\n${potentialsText}\n\n## 4. 🎯 REKOMENDASI PENDAMPINGAN\n\n${recommendation}`;

  return {
    summary,
    analysis: fullNarrative,
    strengths: potentialsText,
    weaknesses: concernsText,
    potential: potentialsText,
    risk: concernsText,
    education_recommendation: recommendation
  };
}



