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
    .filter((x) => (x.q || x.a) && x.a !== "-");

  const NEGATIVE = /(belum|sulit|susah|kurang|jarang|tidak|sering lupa|mudah bosan|cepat bosan|malas|menolak|butuh dibantu|harus diingatkan|sering marah|menangis|takut|bingung|lambat|gangguan|terdistraksi)/i;
  const POSITIVE = /(suka|senang|sangat|mampu|bisa|aktif|cepat|antusias|rajin|mandiri|berani|kreatif|tertarik|hobi|pandai|mudah|bakat|fokus|teliti)/i;

  const shorten = (t: string, max = 90) => (t.length > max ? t.slice(0, max).trim() + "..." : t);
  const lower = (t: string) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t);

  const cleanTopicText = (q: string) => {
    let cleaned = q.replace(/^(bagaimana|apa|apakah|seberapa|sejauh mana|seperti apa)\s+/i, "").replace(/\?$/, "").trim();
    return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : q;
  };

  const concernsList: { title: string; desc: string; rawQ: string; rawA: string; topicTitle: string }[] = [];
  const potentialsList: { title: string; desc: string; rawQ: string; rawA: string; topicTitle: string }[] = [];

  for (const item of qa) {
    if (!item.a || item.a === "-") continue;
    const topic = cleanTopicText(item.q);
    
    if (NEGATIVE.test(item.a)) {
      concernsList.push({
        title: `${topic} membutuhkan penyesuaian pola pendampingan`,
        desc: `Berdasarkan jawaban orang tua ("${shorten(item.a, 110)}"), ${childPhrase} memperlihatkan kondisi khusus yang memerlukan arahan terstruktur di rumah.`,
        rawQ: item.q,
        rawA: item.a,
        topicTitle: topic
      });
    } else if (POSITIVE.test(item.a)) {
      potentialsList.push({
        title: `Kemampuan positif pada ${lower(topic)}`,
        desc: `Jawaban orang tua mencatat bahwa "${shorten(item.a, 110)}", hal ini menjadi potensi yang sangat baik untuk terus dipupuk.`,
        rawQ: item.q,
        rawA: item.a,
        topicTitle: topic
      });
    } else {
      if (concernsList.length < 5) {
        concernsList.push({
          title: `Penguatan pada ${lower(topic)} masih perlu diperhatikan`,
          desc: `Catatan orang tua menunjukkan ("${shorten(item.a, 110)}"), yang perlu menjadi salah satu fokus perhatian dalam rutinitas harian.`,
          rawQ: item.q,
          rawA: item.a,
          topicTitle: topic
        });
      } else {
        potentialsList.push({
          title: `Kecenderungan unik pada ${lower(topic)}`,
          desc: `Keterangan orang tua mengenai "${shorten(item.a, 110)}" memperlihatkan karakteristik khas yang dapat dijadikan pemantik semangat belajar.`,
          rawQ: item.q,
          rawA: item.a,
          topicTitle: topic
        });
      }
    }
  }

  // Ensure minimum 5 attention areas in fallback
  const fallbackConcernTemplates = [
    { title: "Fokus dan rentang perhatian pada aktivitas yang terasa monoton", desc: `Dari evaluasi kuesioner jenjang ${jenjangLabel}, ${childPhrase} memerlukan variasi media belajar agar daya konsentrasi tetap bertahan lama.` },
    { title: "Ketahanan saat menghadapi tugas atau materi yang menantang", desc: `${childPhrase} membutuhkan pemicu semangat bertahap ketika instruksi belajar membutuhkan pemikiran mendalam.` },
    { title: "Konsistensi pengelolaan jadwal belajar mandiri di rumah", desc: `Pola jawaban memperlihatkan pentingnya kesepakatan rutinitas harian yang realistis antara orang tua dan anak.` },
    { title: "Regulasi emosi saat mengalami kejenuhan atau kelelahan", desc: `Diperlukan pendekatan tenang keluarga untuk mendampingi ${childPhrase} mengolah emosi saat menghadapi hambatan.` },
    { title: "Kemandirian memulai tugas tanpa instruksi berulang", desc: `${childPhrase} masih memerlukan sinyal visual atau petunjuk awal agar dapat langsung memulai kegiatan.` }
  ];

  for (const fb of fallbackConcernTemplates) {
    if (concernsList.length >= 5) break;
    concernsList.push({ title: fb.title, desc: fb.desc, rawQ: "", rawA: "", topicTitle: fb.title });
  }

  // Ensure minimum 3 potentials in fallback
  const fallbackPotentialTemplates = [
    { title: "Antusiasme pada eksplorasi dan media belajar interaktif", desc: `${childPhrase} menunjukkan respons positif tinggi ketika aktivitas disajikan dengan visual menarik atau kegiatan praktik.` },
    { title: "Keterbukaan terhadap komunikasi dan apresiasi hangat", desc: `Pengakuan atas usaha ${nameDisplay} terbukti efektif membangkitkan rasa percaya diri anak.` },
    { title: "Daya adaptasi positif dalam lingkungan yang kondusif", desc: `${childPhrase} memiliki potensi berkembang pesat apabila didampingi dengan arahan bertahap tanpa paksaan.` }
  ];

  for (const fb of fallbackPotentialTemplates) {
    if (potentialsList.length >= 3) break;
    potentialsList.push({ title: fb.title, desc: fb.desc, rawQ: "", rawA: "", topicTitle: fb.title });
  }

  // Generate minimum 5 specific recommendations tied to concern topics
  const recommendationsList: string[] = [];
  concernsList.slice(0, 5).forEach((c, idx) => {
    const t = lower(c.topicTitle);
    if (t.includes("konsentrasi") || t.includes("fokus") || t.includes("perhatian")) {
      recommendationsList.push(
        `### 🎯 Terapkan metode belajar sesi pendek (15–20 menit)\nBerdasarkan jawaban mengenai ${t}, bagi kegiatan menjadi potongan waktu pendek diselingi istirahat 5 menit agar konsentrasi ${nameDisplay} tidak cepat menurun.`
      );
    } else if (t.includes("instruksi") || t.includes("kemandirian") || t.includes("merapikan") || t.includes("tugas")) {
      recommendationsList.push(
        `### 🎯 Gunakan petunjuk visual dan urutan instruksi bertahap\nUntuk membantu ${t}, buatkan papan tugas sederhana atau berikan 1 instruksi jelas sebelum melanjutkan ke langkah berikutnya.`
      );
    } else if (t.includes("emosi") || t.includes("kelelahan") || t.includes("menangis") || t.includes("marah")) {
      recommendationsList.push(
        `### 🎯 Sediakan jeda tenang dan penguatan emosi hangat\nKetika ${nameDisplay} merasa tertekan saat belajar, validasi perasaannya terlebih dahulu sebelum membantu menyelesaikan kesulitan secara perlahan.`
      );
    } else if (t.includes("rutinitas") || t.includes("waktu") || t.includes("ponsel") || t.includes("menunda")) {
      recommendationsList.push(
        `### 🎯 Sepakati jadwal harian bergambar atau pengingat bersama\nDiskusikan urutan waktu belajar dan waktu bermain bersama ${nameDisplay} agar terbentuk komitmen tanpa perlu terus-menerus menegur.`
      );
    } else if (t.includes("jurusan") || t.includes("kuliah") || t.includes("matematika") || t.includes("masa depan")) {
      recommendationsList.push(
        `### 🎯 Fasilitasi diskusi santai seputar minat dan pilihan bidang\nAjak ${nameDisplay} mengeksplorasi pilihan bidang yang diminati dengan membedah potensi diri secara objektif tanpa tekanan.`
      );
    } else {
      const defaultRecs = [
        `### 🎯 Dampingi penyesuaian pada ${t}\nLuangkan waktu 10-15 menit untuk membagi aktivitas ${t} menjadi langkah-langkah kecil yang menyenangkan bagi ${nameDisplay}.`,
        `### 🎯 Hubungkan materi belajar dengan hal favorit anak\nGunakan hobi atau minat ${nameDisplay} sebagai pintu masuk untuk meningkatkan keterlibatan saat mempelajari hal baru.`,
        `### 🎯 Berikan apresiasi spesifik atas setiap usaha nyata anak\nPuji proses dan kesungguhan yang ditunjukkan ${nameDisplay} agar motivasi internalnya terus bertumbuh.`,
        `### 🎯 Ciptakan ruang belajar yang nyaman dan minim distraksi\nPastikan area belajar bebas dari gangguan gawai saat sesi konsentrasi berlangsung.`,
        `### 🎯 Lakukan refleksi singkat setelah selesai belajar\nAjak ${nameDisplay} menceritakan bagian yang paling disukai dan bagian yang masih memerlukan bantuan.`
      ];
      recommendationsList.push(defaultRecs[idx % defaultRecs.length]);
    }
  });

  while (recommendationsList.length < 5) {
    recommendationsList.push(
      `### 🎯 Ciptakan suasana belajar yang santai dan suportif di rumah\nPastikan pendampingan dilakukan dengan komunikasi dua arah agar ${nameDisplay} merasa aman dan nyaman saat belajar.`
    );
  }

  // Format strings
  const formattedConcerns = concernsList
    .map((c) => `### ❗ ${c.title}\n${c.desc}`)
    .join("\n\n");

  const formattedPotentials = potentialsList
    .map((p) => `### 🌟 ${p.title}\n${p.desc}`)
    .join("\n\n");

  const formattedRecommendations = recommendationsList.join("\n\n");

  const firstConcernTitle = lower(concernsList[0]?.topicTitle || "pendampingan fokus");
  const firstPotentialTitle = lower(potentialsList[0]?.topicTitle || "eksplorasi minat");

  const summary = `Berdasarkan jawaban kuesioner yang disampaikan ${parentDisplay} mengenai ${childPhrase} pada jenjang ${jenjangLabel}, terlihat gambaran khusus mengenai gaya belajar dan interaksi harian anak. Pola utama menunjukkan bahwa ${childPhrase} sangat responsif terhadap kecenderungan positif pada ${firstPotentialTitle}, namun pada saat yang sama memerlukan pendampingan terarah terutama terkait ${firstConcernTitle}.\n\nEvaluasi ini merangkum ${concernsList.length} area perhatian khusus dan ${potentialsList.length} potensi utama dari jawaban orang tua sebagai acuan pendampingan hangat di rumah.`;

  const fullNarrative = `## 1. RINGKASAN AWAL\n\n${summary}\n\n## 2. ❗ AREA YANG PERLU DIPERHATIKAN\n\n${formattedConcerns}\n\n## 3. 🌟 MINAT & POTENSI\n\n${formattedPotentials}\n\n## 4. 🎯 REKOMENDASI PENDAMPINGAN\n\n${formattedRecommendations}`;

  return {
    summary,
    analysis: fullNarrative,
    strengths: formattedPotentials,
    weaknesses: formattedConcerns,
    potential: formattedPotentials,
    risk: formattedConcerns,
    education_recommendation: formattedRecommendations
  };
}





