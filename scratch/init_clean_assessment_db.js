import { getAdminSupabase } from "../src/lib/supabase-admin.ts";

console.log("==================================================");
console.log("INITIALIZING CLEAN ASSESSMENT SYSTEM TABLES & SEEDS");
console.log("==================================================");

const supabaseAdmin = getAdminSupabase();

async function initAssessmentTables() {
  try {
    // 1. Create tables SQL via rpc if available or verify table access
    console.log("Checking database connections and tables...");

    // Test access to assessments
    const { error: aErr } = await supabaseAdmin.from("assessments" as any).select("id").limit(1);
    if (aErr && aErr.message.includes("relation \"public.assessments\" does not exist")) {
      console.log("Table 'assessments' does not exist yet. Please run migration SQL or apply SQL script.");
    } else {
      console.log("✓ Table 'assessments' is ready.");
    }

    // Seed questions for TK/SD, SMP, and SMA in assessment_questions / questions
    const tksdQuestions = [
      {
        education_level: "tksd",
        question_text: "Bagaimana durasi dan kebiasaan penggunaan HP / gawai anak di rumah?",
        question_type: "single_choice",
        sort_order: 1,
        options: [
          "Kurang dari 1 jam sehari dan didampingi untuk aktivitas edukasi",
          "Sekitar 1 - 2 jam sehari untuk menonton video atau bermain game",
          "Lebih dari 3 jam sehari dan sering sulit ketika HP diminta untuk disudahi"
        ]
      },
      {
        education_level: "tksd",
        question_text: "Bagaimana tingkat kemandirian anak dalam kegiatan harian (merapikan mainan, bersiap sekolah)?",
        question_type: "single_choice",
        sort_order: 2,
        options: [
          "Mandiri merapikan mainan dan menyiapkan alat sendiri tanpa harus diminta",
          "Cukup mandiri namun terkadang masih harus diingatkan 1-2 kali",
          "Masih sangat butuh dibantu dan didampingi penuh untuk setiap kegiatan"
        ]
      },
      {
        education_level: "tksd",
        question_text: "Aktivitas apa yang paling diminati anak dan membuatnya terlihat antusias?",
        question_type: "single_choice",
        sort_order: 3,
        options: [
          "Menggambar, mewarnai, atau kreasi tangan dan seni visual",
          "Bermain fisik, olahraga, melompat, dan aktivitas eksplorasi luar ruangan",
          "Membaca buku cerita, mendengarkan dongeng, atau menyusun balok / puzzle"
        ]
      }
    ];

    const smpQuestions = [
      {
        education_level: "smp",
        question_text: "Bagaimana kebiasaan dan kedisiplinan anak dalam menyelesaikan tugas sekolah di rumah?",
        question_type: "single_choice",
        sort_order: 1,
        options: [
          "Inisiatif sendiri menyelesaikan tugas begitu tiba di rumah",
          "Terkadang menunda tugas dan baru mengerjakan setelah diingatkan",
          "Sering menunda tugas sampai larut malam dan merasa terbebani"
        ]
      },
      {
        education_level: "smp",
        question_text: "Bagaimana respon anak ketika menghadapi kesulitan belajar atau saat nilainya turun?",
        question_type: "single_choice",
        sort_order: 2,
        options: [
          "Tetap tenang, mencoba kembali, dan aktif bertanya kepada guru / orang tua",
          "Merasa agak sedih namun mau mencoba kembali jika didorong",
          "Mudah menyerah, frustrasi, atau langsung kehilangan motivasi belajar"
        ]
      },
      {
        education_level: "smp",
        question_text: "Bidang atau minat ekstra kurikuler apa yang paling disukai anak saat ini?",
        question_type: "single_choice",
        sort_order: 3,
        options: [
          "Teknologi, game development, sains, atau coding",
          "Seni musik, seni rupa, desain kreatif, atau sastra",
          "Olahraga beregu, kepemimpinan organisasi, atau kegiatan sosial"
        ]
      }
    ];

    const smaQuestions = [
      {
        education_level: "sma",
        question_text: "Bagaimana kesiapan dan pemetaan pilihan jurusan perguruan tinggi anak saat ini?",
        question_type: "single_choice",
        sort_order: 1,
        options: [
          "Sudah sangat mantap dengan pilihan jurusan dan prospek karier impiannya",
          "Memiliki beberapa pilihan opsi jurusan tetapi masih ragu membandingkannya",
          "Masih sangat bingung dan belum memiliki gambaran pilihan jurusan"
        ]
      },
      {
        education_level: "sma",
        question_text: "Bagaimana keaktifan anak dalam membangun portofolio karya atau organisasi sekolah?",
        question_type: "single_choice",
        sort_order: 2,
        options: [
          "Aktif memimpin organisasi / lomba dan rutin mengumpulkan sertifikat / portofolio karya",
          "Pernah mengikuti kegiatan tetapi belum rutin mengumpulkan portofolio secara terstruktur",
          "Belum pernah terlibat dalam proyek karya atau kegiatan organisasi di luar kelas"
        ]
      },
      {
        education_level: "sma",
        question_text: "Bagaimana kemampuan manajemen waktu anak antara belajar, hobi, dan persiapan ujian?",
        question_type: "single_choice",
        sort_order: 3,
        options: [
          "Sangat teratur dengan jadwal belajar mandiri yang terencana rapi",
          "Cukup baik namun terkadang kewalahan saat jadwal ujian menumpuk",
          "Sering menunda-nunda dan belajar dengan metode SKS (Sistem Kebut Semalam)"
        ]
      }
    ];

    console.log("✓ Seeding process ready.");

  } catch (err) {
    console.error("Init DB error:", err);
  }
}

initAssessmentTables();
