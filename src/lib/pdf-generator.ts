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

  let parsedAnswersText = "";
  if (formattedAnswers && formattedAnswers.trim()) {
    const items = formattedAnswers.split("\n\n").map(item => {
      const lines = item.split("\n");
      const q = lines[0]?.replace(/^P:\s*/, "") || "";
      const a = lines[1]?.replace(/^J:\s*/, "") || "";
      return `mengenai ${q.toLowerCase()}, orang tua menyampaikan bahwa ${a.toLowerCase()}`;
    });
    parsedAnswersText = items.join(", serta ");
  }

  const p1_sapaan = `Ayah Bunda ${parentDisplay}, terima kasih telah meluangkan waktu untuk mengisi formulir konsultasi ini. Dari jawaban yang diberikan, kami melihat beberapa gambaran mengenai kondisi dan perkembangan Ananda ${nameDisplay} pada jenjang ${jenjangLabel}. Sebagaimana kita ketahui bersama, setiap anak berkembang dengan ritme keunikannya sendiri, dan perhatian hangat yang Ayah Bunda berikan merupakan fondasi awal yang sangat berharga bagi tumbuh kembang Ananda secara menyeluruh.`;

  const p2_gambaran_potensi = `Secara umum, Ananda ${nameDisplay} menunjukkan profil anak yang memiliki rasa ingin tahu yang besar dan antusiasme tinggi ketika dihadapkan pada hal-hal baru yang menarik perhatiannya. Potensi yang sudah sangat terlihat adalah daya tangkapnya yang responsif terhadap stimulasi visual serta pembelajaran berbasis pengalaman praktis. Ketika diberikan ruang untuk berinteraksi langsung dan mengeksplorasi ide-idenya, Ananda mampu menunjukkan fokus yang baik dan mengekspresikan pemahamannya dengan penuh percaya diri.`;

  const p3_perhatian_dan_hubungan = `Meskipun demikian, ada beberapa hal yang masih memerlukan perhatian dan pendampingan yang sabar di rumah maupun di sekolah. Berdasarkan analisis keterkaitan antara jawaban yang disampaikan, tampak bahwa ${parsedAnswersText || "kondisi keseharian anak menunjukkan perlunya penyelarasan ritme belajar dan pengelolaan fokus"}. Terlihat hubungan yang erat antara suasana lingkungan belajar dengan tingkat daya tahan konsentrasi Ananda. Ketika suasana belajar dirasakan kurang bervariasi atau terlalu menuntut hafalan kaku, energi dan fokus Ananda cenderung lebih cepat teralih. Hal ini merupakan dinamika yang sangat wajar bagi anak usia berkembang dan bukan menunjukkan suatu kendala permanen.`;

  const p4_faktor_dampak = `Faktor utama yang kemungkinan mempengaruhi kondisi Ananda ${nameDisplay} saat ini adalah kebutuhan akan variasi metode belajar yang dinamis serta ritme pendampingan emosional yang konsisten. Apabila kondisi ini tidak mendapatkan pendampingan yang tepat sejak dini, anak berisiko merasa kurang dipahami, mengalami penurunan motivasi mandiri, atau cepat merasa jenuh saat menghadapi tantangan akademis yang lebih kompleks. Namun sebaliknya, apabila diberikan pendekatan yang sesuai dengan tipe belajarnya, Ananda akan tumbuh menjadi pembelajar yang tangguh, kreatif, dan mandiri.`;

  const p5_harapan_dan_rekomendasi = `Harapan perkembangan Ananda ${nameDisplay} ke depan sangatlah cerah apabila mendapatkan stimulasi yang mendukung. Kami merekomendasikan agar orang tua dan sekolah bekerja sama menciptakan lingkungan belajar yang kaya akan eksplorasi interaktif, memanfaatkan media visual, serta memberikan dorongan positif atas setiap usaha kecil yang ditunjukkan anak. Pembiasaan jadwal harian yang fleksibel namun konsisten di rumah juga akan membantu Ananda melatih kedisiplinan diri tanpa merasa tertekan.`;

  const p6_penutup = `Melalui pendampingan yang konsisten, komunikasi yang baik di rumah, serta lingkungan belajar yang mendukung, kami yakin potensi Ananda ${nameDisplay} dapat berkembang secara optimal. Setiap anak memiliki keunikan dan waktu berkembang yang berbeda, sehingga proses ini perlu dijalani dengan penuh kesabaran.`;

  const fullNarrative = `${p1_sapaan}\n\n${p2_gambaran_potensi}\n\n${p3_perhatian_dan_hubungan}\n\n${p4_faktor_dampak}\n\n${p5_harapan_dan_rekomendasi}\n\n${p6_penutup}`;

  return {
    summary: p1_sapaan,
    analysis: fullNarrative,
    strengths: p2_gambaran_potensi,
    weaknesses: p3_perhatian_dan_hubungan,
    potential: p4_faktor_dampak,
    risk: p4_faktor_dampak,
    education_recommendation: `${p5_harapan_dan_rekomendasi}\n\n${p6_penutup}`
  };
}
