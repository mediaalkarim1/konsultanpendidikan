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

  // Generate minimum 5 recommendations linked to findings
  const rawRecs: string[] = [];
  concernsList.slice(0, 5).forEach((c) => {
    const t = c.title;
    if (t.includes("Jurusan") || t.includes("Karier") || t.includes("Cita-Cita")) {
      rawRecs.push(
        `### 🎯 Diskusi Matriks Minat & Eksplorasi Pilihan Jurusan\nAjak ${nameDisplay} berdiskusi santai untuk mengidentifikasi 3 bidang favorit, membandingkan mata kuliahnya, serta mencocokkan dengan potensi utamanya.`
      );
    } else if (t.includes("Portofolio") || t.includes("Proyek") || t.includes("Karya")) {
      rawRecs.push(
        `### 🎯 Buat Papan Dokumentasi Karya & Portofolio Digital\nDampingi ${nameDisplay} mengumpulkan sertifikat, hasil tulisan, foto kegiatan, atau proyek sekolah ke dalam satu folder portofolio yang rapi.`
      );
    } else if (t.includes("Screen Time") || t.includes("Gawai") || t.includes("Gadget")) {
      rawRecs.push(
        `### 🎯 Sepakati Batas Durasi Layar & Rutinitas Tanpa Gawai\nDiskusikan aturan waktu pemakaian gadget bersama ${nameDisplay} dan ciptakan area bebas layar saat jam belajar dan jam makan keluarga.`
      );
    } else if (t.includes("Bahasa Inggris") || t.includes("Public Speaking") || t.includes("Komunikasi")) {
      rawRecs.push(
        `### 🎯 Fasilitasi Latihan Berbicara & Media Bahasa Inggris Harian\nAjak ${nameDisplay} membaca buku ber-bahasa Inggris atau menceritakan kembali berita/video singkat yang diminatinya dalam Bahasa Inggris.`
      );
    } else if (t.includes("Kemandirian") || t.includes("Emosi") || t.includes("Tugas")) {
      rawRecs.push(
        `### 🎯 Terapkan Rutinitas Mandiri Bergradasi & Validasi Emosi\nBerikan kepercayaan tanggung jawab harian pada ${nameDisplay} disertai pujian spesifik saat berhasil menyelesaikannya secara mandiri.`
      );
    } else {
      rawRecs.push(
        `### 🎯 Lakukan Sesi Refleksi Mingguan Bersama Anak\nSediakan waktu 15 menit setiap pekan untuk mendengarkan cerita ${nameDisplay} tentang hambatan yang dihadapi dan merayakan pencapaian kecilnya.`
      );
    }
  });

  const poolRecs = [
    `### 🎯 Diskusi Matriks Minat & Eksplorasi Pilihan Jurusan\nAjak ${nameDisplay} berdiskusi santai untuk mengidentifikasi 3 bidang favorit, membandingkan mata kuliahnya, serta mencocokkan dengan potensi utamanya.`,
    `### 🎯 Buat Papan Dokumentasi Karya & Portofolio Digital\nDampingi ${nameDisplay} mengumpulkan sertifikat, hasil tulisan, foto kegiatan, atau proyek sekolah ke dalam satu folder portofolio yang rapi.`,
    `### 🎯 Sepakati Batas Durasi Layar & Rutinitas Tanpa Gawai\nDiskusikan aturan waktu pemakaian gadget bersama ${nameDisplay} dan ciptakan area bebas layar saat jam belajar dan jam makan keluarga.`,
    `### 🎯 Fasilitasi Latihan Berbicara & Media Bahasa Inggris Harian\nAjak ${nameDisplay} membaca buku ber-bahasa Inggris atau menceritakan kembali berita/video singkat yang diminatinya dalam Bahasa Inggris.`,
    `### 🎯 Terapkan Rutinitas Mandiri Bergradasi & Validasi Emosi\nBerikan kepercayaan tanggung jawab harian pada ${nameDisplay} disertai pujian spesifik saat berhasil menyelesaikannya secara mandiri.`,
    `### 🎯 Lakukan Sesi Refleksi Mingguan Bersama Anak\nSediakan waktu 15 menit setiap pekan untuk mendengarkan cerita ${nameDisplay} tentang hambatan yang dihadapi dan merayakan pencapaian kecilnya.`,
    `### 🎯 Ciptakan Suasana Belajar yang Kondusif & Suportif di Rumah\nPastikan pendampingan dilakukan dengan komunikasi dua arah agar ${nameDisplay} merasa aman dan nyaman saat belajar.`
  ];

  const recommendationsList: string[] = [];
  [...rawRecs, ...poolRecs].forEach(r => {
    if (recommendationsList.length < 5 && !recommendationsList.includes(r)) {
      recommendationsList.push(r);
    }
  });

  // Format markdown output strings
  const formattedConcerns = concernsList
    .map((c) => `### ❗ ${c.title}\n${c.desc}`)
    .join("\n\n");

  const formattedPotentials = potentialsList
    .map((p) => `### 🌟 ${p.title}\n${p.desc}`)
    .join("\n\n");

  const formattedRecommendations = recommendationsList.join("\n\n");

  const summary = `Berdasarkan jawaban kuesioner yang disampaikan ${parentDisplay} mengenai ${childPhrase} pada jenjang ${jenjangLabel}, terlihat gambaran khusus mengenai karakteristik belajar dan interaksi harian anak.\n\nPola jawaban orang tua menunjukkan bahwa ${childPhrase} memiliki potensi positif yang baik pada ${potentialsList[0]?.title || "eksplorasi minat"}, namun pada saat yang sama memerlukan pendampingan terarah terutama pada ${concernsList[0]?.title || "aspek harian"}.\n\nLaporan ini merangkum ${concernsList.length} area perhatian spesifik dan ${potentialsList.length} potensi utama dari jawaban orang tua sebagai panduan pendampingan hangat di rumah.`;

  const fullNarrative = `## 1. RINGKASAN AWAL\n\n${summary}\n\n## 2. ❗ AREA YANG PERLU DIPERHATIKAN\n\n${formattedConcerns}\n\n## 3. 🌟 MINAT & POTENSI\n\n${formattedPotentials}\n\n## 4. 🎯 REKOMENDASI PENDAMPINGAN RUMAH\n\n${formattedRecommendations}`;

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






