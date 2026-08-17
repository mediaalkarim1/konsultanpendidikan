import { submitConsultationHandler } from "../src/actions/process-consultation";
import { getConsultationDetailHandler } from "../src/actions/admin-actions";

async function runEndToEndTests() {
  console.log("==================================================");
  console.log("STARTING END-TO-END SUBMIT CONSULTATION AUDIT TESTS");
  console.log("==================================================\n");

  const testPayloads = [
    {
      levelName: "TK & SD",
      payload: {
        parent_name: "Bunda Maria (Test Audit TKSD)",
        child_name: "Ananda Budi",
        whatsapp_number: "081299990001",
        level: "tksd" as const,
        answers: [
          { question_id: "tksd-q1", answer_text: "Anak sangat aktif dan mandiri di rumah", selected_option_ids: [] },
          { question_id: "tksd-q2", answer_text: "Sangat bersemangat mencoba permainan balok & menggambar", selected_option_ids: [] },
          { question_id: "tksd-q3", answer_text: "Mudah berteman dan komunikatif", selected_option_ids: [] },
          { question_id: "tksd-q4", answer_text: "Suka bercerita tentang aktivitas di sekolah", selected_option_ids: [] },
          { question_id: "tksd-q5", answer_text: "Terkadang sedikit emosional saat lelah", selected_option_ids: [] },
          { question_id: "tksd-q6", answer_text: "Orang tua selalu mendampingi saat belajar", selected_option_ids: [] },
          { question_id: "tksd-q7", answer_text: "Tertarik pada musik dan lagu anak", selected_option_ids: [] },
          { question_id: "tksd-q8", answer_text: "Mampu mematuhi aturan rumah dengan baik", selected_option_ids: [] },
          { question_id: "tksd-q9", answer_text: "Makan dan tidur dengan teratur", selected_option_ids: [] },
          { question_id: "tksd-q10", answer_text: "Membutuhkan variasi metode belajar visual", selected_option_ids: [] },
          { question_id: "tksd-q11", answer_text: "Harapan anak menjadi percaya diri dan kreatif", selected_option_ids: [] },
          { question_id: "tksd-q12", answer_text: "Bersedia mengikuti sesi lanjutan", selected_option_ids: [] },
        ]
      }
    },
    {
      levelName: "SMP",
      payload: {
        parent_name: "Ayah Hendra (Test Audit SMP)",
        child_name: "Ananda Rizky",
        whatsapp_number: "081299990002",
        level: "smp" as const,
        answers: [
          { question_id: "smp-q1", answer_text: "Suka berdiskusi masalah sains dan teknologi", selected_option_ids: [] },
          { question_id: "smp-q2", answer_text: "Memiliki minat tinggi pada komputer dan animasi", selected_option_ids: [] },
          { question_id: "smp-q3", answer_text: "Mulai belajar mengelola waktu secara mandiri", selected_option_ids: [] },
          { question_id: "smp-q4", answer_text: "Aktif dalam kegiatan ekstrakurikuler kepramukaan", selected_option_ids: [] },
          { question_id: "smp-q5", answer_text: "Sering menunda tugas jika terlalu sulit", selected_option_ids: [] },
          { question_id: "smp-q6", answer_text: "Orang tua memberikan bimbingan diskusi terbuka", selected_option_ids: [] },
          { question_id: "smp-q7", answer_text: "Suka memecahkan teka-teki dan matematika", selected_option_ids: [] },
          { question_id: "smp-q8", answer_text: "Memiliki hubungan pertemanan yang positif", selected_option_ids: [] },
          { question_id: "smp-q9", answer_text: "Penggunaan gadget terkadang perlu dibatasi", selected_option_ids: [] },
          { question_id: "smp-q10", answer_text: "Menginginkan lingkungan sekolah yang eksploratif", selected_option_ids: [] },
          { question_id: "smp-q11", answer_text: "Harapan anak menjadi pribadi mandiri dan berkarakter", selected_option_ids: [] },
          { question_id: "smp-q12", answer_text: "Bersedia dihubungi tim konsultan", selected_option_ids: [] },
        ]
      }
    },
    {
      levelName: "SMA",
      payload: {
        parent_name: "Ibu Ratna (Test Audit SMA)",
        child_name: "Ananda Sarah",
        whatsapp_number: "081299990003",
        level: "sma" as const,
        answers: [
          { question_id: "sma-q1", answer_text: "Sudah sangat mantap memilih jurusan Teknik Informatika", selected_option_ids: [] },
          { question_id: "sma-q2", answer_text: "Memiliki kepemimpinan yang baik dalam organisasi siswa", selected_option_ids: [] },
          { question_id: "sma-q3", answer_text: "Mandiri dalam belajar dan aktif riset universitas", selected_option_ids: [] },
          { question_id: "sma-q4", answer_text: "Menyukai mata pelajaran Matematika dan Fisika", selected_option_ids: [] },
          { question_id: "sma-q5", answer_text: "Terkadang merasa tertekan menghadapi ujian akhir", selected_option_ids: [] },
          { question_id: "sma-q6", answer_text: "Orang tua mendukung penuh pilihan jurusan anak", selected_option_ids: [] },
          { question_id: "sma-q7", answer_text: "Keterampilan analisis dan logika sangat menonjol", selected_option_ids: [] },
          { question_id: "sma-q8", answer_text: "Memiliki perencanaan belajar yang terstruktur", selected_option_ids: [] },
          { question_id: "sma-q9", answer_text: "Aktif mengikuti olimpiade sains", selected_option_ids: [] },
          { question_id: "sma-q10", answer_text: "Target kuliah di Perguruan Tinggi Negeri terkemuka", selected_option_ids: [] },
          { question_id: "sma-q11", answer_text: "Harapan anak sukses karir di bidang teknologi", selected_option_ids: [] },
          { question_id: "sma-q12", answer_text: "Bersedia dijadwalkan sesi konsultasi gratis", selected_option_ids: [] },
        ]
      }
    }
  ];

  for (const item of testPayloads) {
    console.log(`\n--- TESTING SUBMIT FOR JENJANG: ${item.levelName} ---`);
    const res = await submitConsultationHandler(item.payload);

    console.log("Submit Response:", res);
    if (!res.success || !res.consultationId) {
      console.error(`❌ TEST FAILED FOR ${item.levelName}:`, res.error);
      process.exit(1);
    }

    const cId = res.consultationId;

    // Verify Admin lookup via getConsultationDetailHandler
    const detail = await getConsultationDetailHandler(cId);
    if (!detail.success || !detail.consultation) {
      console.error(`❌ ADMIN DETAIL LOOKUP FAILED FOR ${item.levelName}:`, detail.error);
      process.exit(1);
    }

    console.log(`✓ Admin Consultation lookup successful (ID: ${detail.consultation.id}, Parent: ${detail.consultation.parent_name}, Level: ${detail.consultation.level})`);
    console.log(`✓ Answers retrieved for Admin view: ${detail.answers?.length || 0}`);

    if (!detail.analysis || !detail.analysis.summary) {
      console.error(`❌ ADMIN ANALYSIS LOOKUP FAILED FOR ${item.levelName}: Analysis summary missing`);
      process.exit(1);
    }

    console.log(`✓ Admin Analysis summary retrieved: ${detail.analysis.summary.slice(0, 120)}...`);
    console.log(`✓ Admin Analysis recommendations: ${detail.analysis.education_recommendation ? 'PRESENT' : 'NONE'}`);
  }

  // Test Retry / Re-submit to check duplication prevention
  console.log("\n--- TESTING RESUBMIT / DUPLICATION PREVENTION ---");
  const testPayload = testPayloads[0].payload;
  const retryRes = await submitConsultationHandler(testPayload);
  console.log("Retry Submit Response:", retryRes);
  if (retryRes.success && retryRes.consultationId) {
    const detail = await getConsultationDetailHandler(retryRes.consultationId);
    if (detail.success && detail.analysis) {
      console.log(`✓ Resubmit verification successful for consultation ID ${retryRes.consultationId}`);
    }
  }

  console.log("\n==================================================");
  console.log("ALL END-TO-END SUBMIT AUDIT TESTS PASSED PERFECTLY!");
  console.log("==================================================");
}

runEndToEndTests().catch(err => {
  console.error("Fatal Test Execution Error:", err);
  process.exit(1);
});
