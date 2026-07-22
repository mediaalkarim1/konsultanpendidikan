import { createFileRoute, Link } from "@tanstack/react-router";
import { 
  ArrowRight, 
  GraduationCap, 
  LogIn, 
  School, 
  BookOpen,
  Menu,
  X,
  Target,
  Brain,
  UserCheck,
  Sprout,
  MessageSquare,
  Lock,
  History,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Globe,
  CheckCircle2,
  Star,
  Users,
  ShieldCheck,
  Zap,
  Award,
  ChevronRight,
  HelpCircle
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/")({
  component: Home,
});

// Dynamic Icon Component
function DynamicIcon({ name, className }: { name: string; className?: string }) {
  if (!name) return <LucideIcons.HelpCircle className={className} />;
  
  // 1. Try exact name
  let IconComponent = (LucideIcons as any)[name];
  
  // 2. Try converting kebab-case / snake_case / spaces to PascalCase
  if (!IconComponent) {
    const pascalName = name
      .split(/[-_ ]+/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join("");
    IconComponent = (LucideIcons as any)[pascalName];
  }
  
  // 3. Try case-insensitive lookup
  if (!IconComponent) {
    const matchKey = Object.keys(LucideIcons).find(
      key => key.toLowerCase() === name.toLowerCase().replace(/[-_ ]/g, "")
    );
    if (matchKey) {
      IconComponent = (LucideIcons as any)[matchKey];
    }
  }
  
  const FinalIcon = IconComponent || LucideIcons.HelpCircle;
  return <FinalIcon className={className} />;
}

export const DEFAULT_HOMEPAGE_CONFIG = {
  siteName: "Sekolah Alam Al-Karim",
  logoText: "EduKonsul",
  logoImg: "",
  btnLoginText: "Login Admin",
  navItems: [
    { label: "Beranda", link: "/" },
    { label: "Tentang", link: "#tentang" },
    { label: "Keunggulan", link: "#keunggulan" },
    { label: "Jenjang", link: "#jenjang" },
    { label: "Cara Kerja", link: "#carakerja" },
    { label: "FAQ", link: "#faq" }
  ],
  
  // Section Visibility flags for EVERY section
  showHeader: true,
  showHero: true,
  showHeroStats: true,
  showAdvantages: true,
  showLevels: true,
  showHowItWorks: true,
  showFaq: true,
  showCta: true,
  showFooter: true,
  
  // Hero Section
  heroBadge: "Konsultasi & Pemetaan Karakter Anak",
  heroTitle: "Konsultasi & Rekomendasi Pendidikan Untuk Anak",
  heroDesc: "Bantu pahami potensi, karakter, dan kebutuhan belajar anak melalui konsultasi pendidikan yang didampingi Tim Konsultan Sekolah Alam Al-Karim.",
  heroImg: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=80",
  heroBtn1: "Mulai Konsultasi",
  heroBtn1Link: "#jenjang",
  heroStats: [
    { value: "1.000+", label: "Orang Tua Terbantu", icon: "Users" },
    { value: "100%", label: "Tim Konsultan Expert", icon: "Award" },
    { value: "Cerdas", label: "Analisis Objektif", icon: "Zap" },
    { value: "Gratis", label: "100% Data Rahasia", icon: "ShieldCheck" }
  ],
  
  // Advantages Section
  advantagesTitle: "Mengapa Memilih Konsultasi Pendidikan Sekolah Alam Al-Karim?",
  advantagesSub: "Kami membantu orang tua memahami potensi, karakter, dan kebutuhan belajar anak melalui analisis yang terstruktur serta pendampingan langsung dari Tim Konsultan.",
  advantages: [
    {
      icon: "Target",
      title: "Analisis Potensi Anak",
      desc: "Membantu memetakan potensi, karakter, minat, dan gaya belajar anak sehingga orang tua lebih memahami kebutuhan pendidikan anak."
    },
    {
      icon: "Brain",
      title: "Analisis Cerdas & Presisi",
      desc: "Didukung teknologi cerdas untuk membantu menganalisis jawaban orang tua secara cepat, sistematis, dan objektif sebelum ditinjau kembali oleh Tim Konsultan Sekolah Alam Al-Karim."
    },
    {
      icon: "UserCheck",
      title: "Dikaji Tim Konsultan Expert",
      desc: "Seluruh hasil analisis ditinjau kembali oleh Tim Konsultan sehingga rekomendasi lebih tepat dan sesuai dengan kondisi anak."
    },
    {
      icon: "Sprout",
      title: "Rekomendasi Holistik",
      desc: "Prinsip pendidikan holistik yang disesuaikan dengan minat, gaya belajar, dan bakat alami anak."
    },
    {
      icon: "MessageSquare",
      title: "Konsultasi Gratis via WA",
      desc: "Orang tua dapat berkonsultasi langsung dengan Tim Sekolah Alam Al-Karim melalui WhatsApp tanpa biaya."
    },
    {
      icon: "Lock",
      title: "Data 100% Aman & Rahasia",
      desc: "Seluruh data konsultasi dijaga kerahasiaannya dan hanya digunakan untuk kebutuhan konsultasi pendidikan."
    }
  ],
  
  // Levels Section
  levelsTitle: "Pilih Jenjang Pendidikan Anak",
  levelsSub: "Pilihlah jenjang pendidikan anak Anda untuk langsung memulai pengisian formulir kuesioner pemetaan potensi.",
  levels: [
    {
      id: "tksd",
      name: "TK & SD",
      tag: "TK / SD • Usia 4-12 Thn",
      desc: "Konsultasikan kebutuhan tumbuh kembang anak usia dini untuk rekomendasi pendidikan & karakter dasar terbaik.",
      icon: "School",
      btnText: "Mulai Konsultasi",
      active: true
    },
    {
      id: "smp",
      name: "SMP",
      tag: "SMP • Usia 13-15 Thn",
      desc: "Petakan potensi, karakter, dan minat belajar remaja untuk sekolah menengah & eksplorasi bakat yang sesuai.",
      icon: "BookOpen",
      btnText: "Mulai Konsultasi",
      active: true
    },
    {
      id: "sma",
      name: "SMA",
      tag: "SMA • Usia 16-18 Thn",
      desc: "Temukan pemetaan jurusan, kesiapan perkuliahan (PTN), dan arah karier masa depan anak secara optimal.",
      icon: "GraduationCap",
      btnText: "Mulai Konsultasi",
      active: true
    }
  ],

  // How It Works Section
  howItWorksTitle: "4 Langkah Mudah Konsultasi Pendidikan",
  howItWorksSub: "Proses efisien dan terstruktur untuk membantu Anda mendapatkan arahan pendidikan terbaik.",
  howItWorksSteps: [
    {
      step: "01",
      title: "Pilih Jenjang",
      desc: "Pilih jenjang sekolah anak Anda (TK/SD, SMP, atau SMA) sesuai kelompok usia.",
      icon: "School"
    },
    {
      step: "02",
      title: "Isi Kuesioner",
      desc: "Jawab pertanyaan seputar minat, gaya belajar, dan perilaku tumbuh kembang anak.",
      icon: "BookOpen"
    },
    {
      step: "03",
      title: "Analisis Cerdas",
      desc: "Sistem cerdas memproses jawaban & Tim Konsultan Al-Karim meninjau hasilnya.",
      icon: "Brain"
    },
    {
      step: "04",
      title: "Hasil & Diskusi WA",
      desc: "Dapatkan rekomendasi lengkap dan diskusikan gratis langsung via WhatsApp.",
      icon: "MessageSquare"
    }
  ],

  // FAQ Section
  faqTitle: "Sering Ditanyakan Orang Tua",
  faqSub: "Temukan jawaban cepat atas pertanyaan seputar konsultasi pendidikan Sekolah Alam Al-Karim.",
  faqs: [
    {
      question: "Apakah layanan konsultasi ini benar-benar gratis?",
      answer: "Ya, 100% GRATIS! Sekolah Alam Al-Karim menyediakan pemetaan dan konsultasi ini sebagai bentuk komitmen pengabdian kepada masyarakat agar setiap anak mendapatkan rekomendasi pendampingan pendidikan yang sesuai potensi alaminya."
    },
    {
      question: "Berapa lama proses hingga hasil rekomendasi keluar?",
      answer: "Setelah pengisian kuesioner selesai, hasil analisis awal akan langsung tergenerasi secara otomatis. Anda juga dapat melanjutkan diskusi dengan Tim Konsultan melalui WhatsApp untuk penjelasan mendalam."
    },
    {
      question: "Apakah data pribadi anak dan orang tua dijamin kerahasiaannya?",
      answer: "Sangat aman. Seluruh data kuesioner dan identitas Anda dijaga secara ketat dan hanya digunakan semata-mata untuk keperluan evaluasi konsultasi pendidikan."
    },
    {
      question: "Siapa yang menyusun dan menganalisis kuesioner ini?",
      answer: "Analisis didukung oleh algoritma cerdas yang dikombinasikan dengan kajian langsung oleh Tim Konsultan Pendidikan & Psikolog Perkembangan Sekolah Alam Al-Karim."
    }
  ],
  
  // CTA Section
  ctaTitle: "Siap Menemukan Pendidikan Terbaik untuk Anak Anda?",
  ctaDesc: "Konsultasikan kebutuhan pendidikan & tumbuh kembang anak secara gratis bersama Tim Konsultan Sekolah Alam Al-Karim.",
  ctaBtn: "Mulai Konsultasi Sekarang",
  ctaBtnLink: "#jenjang",
  ctaBg: "#1e3a5f",
  
  // Footer & Social
  footerLogo: "",
  footerSchool: "Sekolah Alam Al-Karim",
  footerAddress: "Jl. Raya Al-Karim No. 123, Bandar Lampung",
  footerWa: "081234567890",
  footerEmail: "kontak@sekolahalamalkarim.sch.id",
  footerWebsite: "sekolahalamalkarim.sch.id",
  footerCopyright: "© 2026 EduKonsul — Sekolah Alam Al-Karim. All rights reserved.",
  socialLinks: [
    { platform: "Instagram", url: "https://instagram.com/sekolahalamalkarim" },
    { platform: "Facebook", url: "https://facebook.com/sekolahalamalkarim" },
    { platform: "Youtube", url: "https://youtube.com/sekolahalamalkarim" }
  ],
  
  colors: {
    primary: "#2563eb",
    secondary: "#1e3a5f",
    button: "#2563eb",
    header: "#ffffff",
    footer: "#0f172a",
    background: "#ffffff",
    card: "#ffffff"
  }
};

const ADVANTAGE_THEMES = [
  { bg: "bg-blue-50/80", border: "border-slate-200", text: "text-slate-900", ring: "group-hover:border-blue-400", iconGradient: "from-[#1e3a5f] to-[#2563eb]" },
  { bg: "bg-blue-50/80", border: "border-slate-200", text: "text-slate-900", ring: "group-hover:border-blue-400", iconGradient: "from-blue-600 to-indigo-600" },
  { bg: "bg-blue-50/80", border: "border-slate-200", text: "text-slate-900", ring: "group-hover:border-blue-400", iconGradient: "from-[#1e3a5f] to-slate-800" },
  { bg: "bg-blue-50/80", border: "border-slate-200", text: "text-slate-900", ring: "group-hover:border-blue-400", iconGradient: "from-blue-700 to-[#1e3a5f]" },
  { bg: "bg-blue-50/80", border: "border-slate-200", text: "text-slate-900", ring: "group-hover:border-blue-400", iconGradient: "from-indigo-600 to-blue-600" },
  { bg: "bg-blue-50/80", border: "border-slate-200", text: "text-slate-900", ring: "group-hover:border-blue-400", iconGradient: "from-[#1e3a5f] to-blue-800" }
];

export function Home() {
  const [config, setConfig] = useState(DEFAULT_HOMEPAGE_CONFIG);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadHomeConfig();
  }, []);

  async function loadHomeConfig() {
    try {
      const { data } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "site.homepage_config")
        .maybeSingle();

      if (data && data.value) {
        const val = data.value as any;
        setConfig({
          ...DEFAULT_HOMEPAGE_CONFIG,
          ...val,
          navItems: Array.isArray(val.navItems) && val.navItems.length > 0 ? val.navItems : DEFAULT_HOMEPAGE_CONFIG.navItems,
          heroStats: Array.isArray(val.heroStats) && val.heroStats.length > 0 ? val.heroStats : DEFAULT_HOMEPAGE_CONFIG.heroStats,
          advantages: Array.isArray(val.advantages) && val.advantages.length > 0 ? val.advantages : DEFAULT_HOMEPAGE_CONFIG.advantages,
          levels: Array.isArray(val.levels) && val.levels.length > 0 ? val.levels : DEFAULT_HOMEPAGE_CONFIG.levels,
          howItWorksSteps: Array.isArray(val.howItWorksSteps) && val.howItWorksSteps.length > 0 ? val.howItWorksSteps : DEFAULT_HOMEPAGE_CONFIG.howItWorksSteps,
          faqs: Array.isArray(val.faqs) && val.faqs.length > 0 ? val.faqs : DEFAULT_HOMEPAGE_CONFIG.faqs,
          socialLinks: Array.isArray(val.socialLinks) && val.socialLinks.length > 0 ? val.socialLinks : DEFAULT_HOMEPAGE_CONFIG.socialLinks,
          colors: {
            ...DEFAULT_HOMEPAGE_CONFIG.colors,
            ...(val.colors || {})
          }
        });
      }
    } catch (_) {}
  }

  // Smooth scroll handler
  const handleScroll = (idStr: string) => {
    setMobileMenuOpen(false);
    if (!idStr) return;
    if (idStr.startsWith("#")) {
      const cleanId = idStr.replace("#", "");
      const element = document.getElementById(cleanId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      window.location.href = idStr;
    }
  };

  // Open global history check modal
  const handleOpenHistoryModal = () => {
    setMobileMenuOpen(false);
    window.dispatchEvent(new Event("open-history-modal"));
  };

  return (
    <div className="min-h-screen bg-white text-[#1e293b] font-sans selection:bg-[#2563eb] selection:text-white relative overflow-hidden" style={{ backgroundColor: config.colors?.background }}>
      {/* Inject Dynamic Colors & CSS Custom Utility Rules */}
      <style>{`
        :root {
          --primary: ${config.colors?.primary || '#0F766E'};
          --brand: ${config.colors?.primary || '#0F766E'};
          --brand-soft: #ecfeff;
          --secondary: ${config.colors?.secondary || '#083344'};
          --background: ${config.colors?.background || '#ffffff'};
          --card: ${config.colors?.card || '#ffffff'};
        }
        .hero-deep-ocean-bg {
          background: linear-gradient(135deg, #083344 0%, #0F4C81 40%, #0F766E 75%, #38BDF8 100%);
        }
        .btn-gradient-aqua {
          background: linear-gradient(135deg, #0F766E 0%, #38BDF8 100%);
          color: #ffffff;
          font-weight: 800;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 15px -2px rgba(15, 118, 110, 0.4);
        }
        .btn-gradient-aqua:hover {
          background: linear-gradient(135deg, #115E59 0%, #0284C7 100%);
          box-shadow: 0 10px 25px -4px rgba(56, 189, 248, 0.5);
          transform: translateY(-2px);
        }
        .btn-hero-gradient {
          background: linear-gradient(135deg, #0F766E 0%, #38BDF8 100%);
          color: #ffffff;
          font-weight: 800;
          transition: all 0.3s ease-in-out;
          box-shadow: 0 10px 30px -5px rgba(56, 189, 248, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.3);
        }
        .btn-hero-gradient:hover {
          background: linear-gradient(135deg, #38BDF8 0%, #60A5FA 100%);
          color: #083344;
          box-shadow: 0 15px 35px -5px rgba(255, 255, 255, 0.5);
          transform: translateY(-2px);
        }
        .gradient-text-wave {
          background: linear-gradient(135deg, #ffffff 0%, #dff6f8 50%, #38bdf8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .card-saas-premium {
          border-radius: 20px;
          border: 1px solid rgba(226, 232, 240, 0.8);
          background-color: #ffffff;
          transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
        }
        .card-saas-premium:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 30px -10px rgba(15, 118, 110, 0.15);
          border-color: rgba(56, 189, 248, 0.5);
        }
      `}</style>

      {/* 1. STICKY HEADER */}
      {config.showHeader !== false && (
        <header className="sticky top-0 z-40 border-b border-cyan-100 bg-white/90 backdrop-blur-xl transition-all shadow-xs" style={{ backgroundColor: config.colors?.header ? config.colors.header + 'f0' : undefined }}>
          <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link to="/" className="flex items-center gap-3 group">
              {config.logoImg ? (
                <img src={config.logoImg} alt={config.siteName} className="h-10 w-auto rounded-xl shadow-xs transition group-hover:scale-105" />
              ) : (
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#083344] to-[#0F766E] font-black shadow-md text-xl transition group-hover:scale-105 text-white">
                  {config.logoText ? config.logoText.charAt(0) : "E"}
                </div>
              )}
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black tracking-tight text-[#083344] group-hover:text-[#0F766E] transition">
                    {config.logoText}
                  </span>
                  <span className="inline-block h-2 w-2 rounded-full bg-[#38BDF8] animate-pulse" />
                </div>
                <span className="text-[11px] text-[#0F766E] font-bold tracking-wide">
                  {config.siteName}
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden items-center gap-2 md:flex">
              {config.navItems?.map((item: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (item.link?.startsWith("#")) {
                      handleScroll(item.link);
                    } else if (item.link) {
                      window.location.href = item.link;
                    }
                  }}
                  className="text-xs sm:text-sm font-bold text-[#475569] hover:text-[#0F766E] hover:bg-[#ECFEFF] px-3.5 py-1.5 rounded-xl transition-all"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={handleOpenHistoryModal}
                className="text-xs font-bold border border-[#0F766E] text-[#0F766E] hover:bg-[#ECFEFF] transition flex items-center gap-1.5 rounded-2xl px-3.5 py-2 shadow-xs hover:scale-105 active:scale-95 ml-2"
              >
                <History className="h-4 w-4 text-[#0F766E]" /> 
                <span>Cek Riwayat</span>
              </button>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="hidden h-11 items-center gap-2 rounded-2xl btn-gradient-aqua px-6 text-xs sm:text-sm font-extrabold shadow-md transition-all hover:scale-105 active:scale-95 md:inline-flex text-white"
              >
                <LogIn className="h-4 w-4 text-white" />
                <span>{config.btnLoginText}</span>
              </Link>

              {/* Mobile Hamburger Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="grid h-10 w-10 place-items-center rounded-xl bg-[#ECFEFF] border border-cyan-200 text-[#0F766E] md:hidden active:scale-95 transition shadow-xs hover:bg-cyan-100"
                aria-label="Menu Mobile"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Drawer */}
          {mobileMenuOpen && (
            <div className="border-t border-slate-200 bg-white p-5 space-y-3 md:hidden shadow-xl animate-in slide-in-from-top duration-200">
              {config.navItems?.map((item: any, idx: number) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (item.link?.startsWith("#")) {
                      handleScroll(item.link);
                    } else if (item.link) {
                      window.location.href = item.link;
                    }
                  }}
                  className="block w-full text-left py-2.5 px-3 text-sm font-bold text-[#475569] hover:text-[#0F766E] hover:bg-[#ECFEFF] rounded-xl transition"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={handleOpenHistoryModal}
                className="w-full text-left py-2.5 px-3 text-sm font-bold border border-[#0F766E] text-[#0F766E] rounded-xl flex items-center gap-2"
              >
                <History className="h-4.5 w-4.5 text-[#0F766E]" /> Riwayat Konsultasi
              </button>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl btn-gradient-aqua py-3 text-sm font-bold shadow-md text-white"
              >
                <LogIn className="h-4.5 w-4.5 text-white" />
                <span>{config.btnLoginText}</span>
              </Link>
            </div>
          )}
        </header>
      )}

      {/* 2. HERO SECTION - SECTION 1 (Full Width Deep Ocean / Deep Aqua Gradient with Wave Dividers & SaaS AI Illustrations) */}
      {config.showHero !== false && (
        <section id="tentang" className="relative pt-14 pb-28 md:pt-24 md:pb-36 hero-deep-ocean-bg text-white overflow-hidden shadow-2xl">
          {/* Soft Glow Effects & Mesh Gradients */}
          <div className="pointer-events-none absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-[#38BDF8]/20 blur-[140px]" />
          <div className="pointer-events-none absolute top-1/2 -right-40 h-[500px] w-[500px] rounded-full bg-[#0F766E]/30 blur-[150px]" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 h-[400px] w-[400px] rounded-full bg-[#0F4C81]/40 blur-[130px]" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              
              {/* Left Column: Teks & CTA */}
              <div className="text-left lg:col-span-7 space-y-6">
                
                {/* Badge */}
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-white/10 backdrop-blur-md px-4 py-1.5 text-xs font-bold text-cyan-100 shadow-xs hover:border-cyan-300/60 transition">
                  <span className="flex h-2 w-2 rounded-full bg-[#38BDF8] animate-ping" />
                  <Sparkles className="h-3.5 w-3.5 text-[#38BDF8]" />
                  <span>{config.heroBadge}</span>
                </div>

                {/* Title */}
                <h1 className="text-4xl sm:text-6xl lg:text-6.5xl xl:text-7xl font-black leading-[1.08] tracking-tight text-white">
                  {config.heroTitle?.includes("Untuk Anak") ? (
                    <>
                      Konsultasi & Rekomendasi <br />
                      <span className="gradient-text-wave">Pendidikan Terbaik Anak</span>
                    </>
                  ) : (
                    config.heroTitle
                  )}
                </h1>

                {/* Description */}
                <p className="text-base leading-relaxed text-cyan-50/90 sm:text-lg max-w-2xl font-medium">
                  {config.heroDesc}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    onClick={() => handleScroll(config.heroBtn1Link || "#jenjang")}
                    className="inline-flex h-14 items-center justify-center gap-2.5 rounded-2xl btn-hero-gradient px-9 text-base font-extrabold shadow-2xl transition hover:scale-105 active:scale-95"
                  >
                    <span>{config.heroBtn1}</span>
                    <ArrowRight className="h-5 w-5 text-white" />
                  </button>
                </div>

                {/* Trust Metrics Bar */}
                {config.showHeroStats !== false && (
                  <div className="pt-8 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {config.heroStats?.map((stat: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 bg-[#083344]/70 backdrop-blur-xl p-3.5 rounded-[20px] border border-cyan-400/20 text-white shadow-xl hover:border-cyan-400/50 transition">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#0F766E] to-[#38BDF8] text-white font-bold shadow-md">
                          <DynamicIcon name={stat.icon || "Award"} className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-lg font-black text-white leading-none">{stat.value}</p>
                          <p className="text-[11px] font-medium text-cyan-200/90">{stat.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>

              {/* Right Column: SaaS AI Vector Illustration Graphic & Image Card */}
              <div className="relative lg:col-span-5 flex justify-center">
                <div className="absolute -inset-4 bg-gradient-to-r from-[#0F766E]/40 via-[#38BDF8]/30 to-[#0F4C81]/40 rounded-[30px] blur-3xl opacity-70 -z-10" />
                
                <div className="relative w-full max-w-[460px]">
                  {/* Floating SaaS AI Badge Elements */}
                  <div className="absolute -top-6 -left-6 z-20 hidden sm:flex items-center gap-3 bg-[#083344]/90 backdrop-blur-xl border border-cyan-300/30 text-white px-4 py-2.5 rounded-2xl shadow-2xl animate-bounce duration-1000">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#0F766E] text-cyan-200">
                      <Brain className="h-4.5 w-4.5" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-white">Analisis AI Presisi</p>
                      <p className="text-[10px] text-cyan-200 font-medium">Pemetaan 100% Objektif</p>
                    </div>
                  </div>

                  <div className="absolute -bottom-6 -right-6 z-20 hidden sm:flex items-center gap-3 bg-[#083344]/90 backdrop-blur-xl border border-cyan-300/30 text-white px-4 py-2.5 rounded-2xl shadow-2xl">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-[#38BDF8] text-[#083344]">
                      <ShieldCheck className="h-4.5 w-4.5" />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-black text-white">Tim Konsultan Expert</p>
                      <p className="text-[10px] text-cyan-200 font-medium">Sekolah Alam Al-Karim</p>
                    </div>
                  </div>

                  {/* Hero Main Image inside SaaS Frame */}
                  <div className="rounded-[24px] overflow-hidden border-2 border-cyan-200/30 shadow-2xl bg-[#083344]/40 p-2 backdrop-blur-md">
                    <img
                      src={config.heroImg}
                      alt="Konsultasi Pendidikan Anak Sekolah Alam Al-Karim"
                      className="w-full h-[380px] sm:h-[440px] rounded-[20px] object-cover shadow-xl"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Smooth Wave Bottom Transition Divider */}
          <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none pointer-events-none">
            <svg className="relative block w-full h-10 sm:h-14 text-[#ecfeff]" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.94,130.83,121.3,200,113.8,241.13,109.34,281.82,86.26,321.39,56.44Z" fill="currentColor"></path>
            </svg>
          </div>
        </section>
      )}

      {/* 3. SECTION KEUNGGULAN (ADVANTAGES) - SECTION 2 (Light Aqua Background #ECFEFF) */}
      {config.showAdvantages !== false && (
        <section id="keunggulan" className="py-20 md:py-28 bg-[#ecfeff] relative border-b border-cyan-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            
            {/* Header Section */}
            <div className="mx-auto max-w-3xl text-center space-y-4 mb-12 sm:mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-white border border-cyan-200 px-4 py-1.5 text-xs font-extrabold text-[#0F766E] shadow-xs">
                <Target className="h-4 w-4 text-[#0F766E]" />
                <span>KEUNGGULAN UTAMA</span>
              </div>
              <h2 className="text-3xl font-black tracking-tight text-[#083344] sm:text-4.5xl leading-tight">
                {config.advantagesTitle}
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-[#475569] font-medium">
                {config.advantagesSub}
              </p>
            </div>

            {/* List Poin Utama Keunggulan */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-6">
              {config.advantages?.map((adv: any, idx: number) => {
                return (
                  <div
                    key={idx}
                    className="card-saas-premium p-6 flex items-start gap-4 text-left"
                    style={{ backgroundColor: config.colors?.card }}
                  >
                    {/* Icon Box */}
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#0F766E] to-[#38BDF8] text-white shadow-md">
                      <DynamicIcon name={adv.icon} className="h-6 w-6" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <h3 className="text-base font-extrabold text-[#083344] tracking-tight leading-snug">
                        {adv.title}
                      </h3>
                      {adv.desc && (
                        <p className="text-xs text-[#475569] leading-relaxed line-clamp-3">
                          {adv.desc}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </section>
      )}

      {/* 4. PILIHAN JENJANG PENDIDIKAN - SECTION 3 (Pure White Background #FFFFFF) */}
      {config.showLevels !== false && (
        <section id="jenjang" className="py-20 md:py-28 bg-white relative border-b border-slate-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            
            {/* Header Section */}
            <div className="mx-auto max-w-3xl text-center space-y-4 mb-12 sm:mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#ECFEFF] border border-cyan-200 px-4 py-1.5 text-xs font-extrabold text-[#0F766E]">
                <School className="h-4 w-4 text-[#0F766E]" />
                <span>KONSULTASI BERDASARKAN JENJANG</span>
              </div>
              <h2 className="text-3xl font-black tracking-tight text-[#083344] sm:text-4.5xl leading-tight">
                {config.levelsTitle}
              </h2>
              <p className="text-sm sm:text-base text-[#475569] font-medium">
                {config.levelsSub || "Pilihlah jenjang pendidikan anak Anda untuk langsung memulai pengisian formulir kuesioner pemetaan potensi."}
              </p>
            </div>

            {/* Layout Card Besar */}
            <div className="flex flex-col gap-6 max-w-5xl mx-auto">
              {config.levels?.filter((l: any) => l.active !== false).map((level: any) => {
                return (
                  <Link
                    key={level.id}
                    to="/formulir/$jenjang"
                    params={{ jenjang: level.id }}
                    className="card-saas-premium p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 group"
                    style={{ backgroundColor: config.colors?.card }}
                  >
                    {/* Left Side: Icon & Details */}
                    <div className="flex items-start sm:items-center gap-5 flex-1 min-w-0">
                      {/* Icon Box */}
                      <div className="grid h-14 w-14 sm:h-18 sm:w-18 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#083344] via-[#0F766E] to-[#38BDF8] text-white shadow-lg group-hover:scale-105 transition-transform">
                        <DynamicIcon name={level.icon} className="h-7 w-7 sm:h-9 sm:w-9" />
                      </div>

                      <div className="space-y-2 text-left flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-xl sm:text-2.5xl font-black text-[#083344] tracking-tight group-hover:text-[#0F766E] transition">
                            {level.name}
                          </h3>
                          <span className="rounded-full px-3 py-1 text-xs font-bold border bg-[#ECFEFF] text-[#0F766E] border-cyan-200">
                            {level.tag || level.name}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-[#475569] leading-relaxed">
                          {level.desc}
                        </p>

                        {/* Bullet Highlights */}
                        <div className="hidden sm:flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-xs font-bold text-[#083344]">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-[#0F766E] shrink-0" />
                            <span>Pemetaan Gaya Belajar</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-[#0F766E] shrink-0" />
                            <span>Analisis Kebutuhan Anak</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-[#0F766E] shrink-0" />
                            <span>Rekomendasi Sekolah</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Action Button */}
                    <div className="shrink-0 flex items-center justify-end">
                      <div className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl btn-gradient-aqua px-7 text-xs sm:text-sm font-extrabold shadow-md group-hover:shadow-lg">
                        <span>{level.btnText || "Mulai Konsultasi"}</span>
                        <ArrowRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

          </div>
        </section>
      )}

      {/* 5. MENGAPA MEMILIH KAMI - SECTION 4 (Soft Wave Pattern / #F8FAFC) */}
      <section className="py-20 md:py-28 bg-[#f8fafc] relative border-b border-slate-200/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          
          <div className="mx-auto max-w-3xl text-center space-y-4 mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-1.5 text-xs font-extrabold text-[#0F4C81] shadow-xs">
              <Award className="h-4 w-4 text-[#0F4C81]" />
              <span>MENGAPA MEMILIH KAMI</span>
            </div>
            <h2 className="text-3xl font-black tracking-tight text-[#083344] sm:text-4.5xl leading-tight">
              Solusi Terbaik Pemetaan Pendidikan Anak
            </h2>
            <p className="text-sm sm:text-base text-[#475569] font-medium">
              Memberikan pendampingan menyeluruh yang memadukan keahlian psikologi pendidikan dengan teknologi pemetaan cerdas.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="card-saas-premium p-6 flex flex-col gap-4 text-left">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0F4C81]/10 text-[#0F4C81] border border-[#0F4C81]/20">
                <Brain className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-[#083344]">Analisis Cerdas & Objektif</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Algoritma cerdas mengevaluasi kuesioner dengan teliti untuk memetakan karakter, gaya belajar, dan potensi alami anak.
              </p>
            </div>

            <div className="card-saas-premium p-6 flex flex-col gap-4 text-left">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0F4C81]/10 text-[#0F4C81] border border-[#0F4C81]/20">
                <UserCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-[#083344]">Tim Konsultan Expert</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Didampingi langsung oleh praktisi & psikolog Sekolah Alam Al-Karim yang berpengalaman dalam tumbuh kembang anak.
              </p>
            </div>

            <div className="card-saas-premium p-6 flex flex-col gap-4 text-left">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0F4C81]/10 text-[#0F4C81] border border-[#0F4C81]/20">
                <Sprout className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-black text-[#083344]">Pendekatan Holistik</h3>
              <p className="text-xs text-[#475569] leading-relaxed">
                Tidak sekadar nilai akademis, kami memperhatikan perkembangan emosi, sosial, dan bakat unik setiap anak secara seimbang.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* 6. PROSES KONSULTASI / 4 LANGKAH - SECTION 5 (Horizontal Timeline Layout) */}
      {config.showHowItWorks !== false && (
        <section id="carakerja" className="py-20 md:py-28 bg-white relative border-b border-slate-100">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            
            <div className="mx-auto max-w-3xl text-center space-y-4 mb-14 sm:mb-20">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#ECFEFF] border border-cyan-200 px-4 py-1.5 text-xs font-extrabold text-[#0F766E]">
                <Zap className="h-4 w-4 text-[#0F766E]" />
                <span>ALUR TERSTRUKTUR</span>
              </div>
              <h2 className="text-3xl font-black tracking-tight text-[#083344] sm:text-4.5xl leading-tight">
                {config.howItWorksTitle || "4 Langkah Mudah Konsultasi Pendidikan"}
              </h2>
              <p className="text-sm sm:text-base text-[#475569] font-medium">
                {config.howItWorksSub || "Proses efisien dan terstruktur untuk membantu Anda mendapatkan arahan pendidikan terbaik."}
              </p>
            </div>

            {/* Horizontal Timeline Wrapper */}
            <div className="relative">
              {/* Horizontal Connecting Line (Desktop Only) */}
              <div className="hidden lg:block absolute top-1/2 left-[10%] right-[10%] h-1 bg-gradient-to-r from-[#0F766E] via-[#38BDF8] to-[#0F4C81] -translate-y-6 z-0" />

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 relative z-10">
                {config.howItWorksSteps?.map((item: any, idx: number) => {
                  return (
                    <div 
                      key={idx} 
                      className="card-saas-premium p-6 flex flex-col items-start gap-4 text-left relative bg-white"
                    >
                      {/* Step Header */}
                      <div className="flex items-center justify-between w-full">
                        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#0F766E] to-[#38BDF8] text-white shadow-md">
                          <DynamicIcon name={item.icon || "CheckCircle2"} className="h-6 w-6" />
                        </div>
                        <span className="inline-block text-xs font-black tracking-wider text-white bg-gradient-to-r from-[#0F766E] to-[#38BDF8] px-3 py-1 rounded-full uppercase shadow-xs">
                          Step {item.step || `0${idx+1}`}
                        </span>
                      </div>

                      {/* Step Details */}
                      <div className="space-y-1.5 pt-2">
                        <h3 className="text-base font-extrabold text-[#083344] tracking-tight">
                          {item.title}
                        </h3>
                        {item.desc && (
                          <p className="text-xs text-[#475569] leading-relaxed">
                            {item.desc}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </section>
      )}

      {/* 7. FAQ SECTION - SECTION 6 (Light Aqua Background #ECFEFF) */}
      {config.showFaq !== false && (
        <section id="faq" className="py-20 md:py-28 bg-[#ecfeff] relative border-b border-cyan-100">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            
            <div className="text-center space-y-4 mb-12 sm:mb-16">
              <div className="inline-flex items-center gap-2 rounded-full bg-white border border-cyan-200 px-4 py-1.5 text-xs font-extrabold text-[#0F766E] shadow-xs">
                <HelpCircle className="h-4 w-4 text-[#0F766E]" />
                <span>PERTANYAAN POPULER</span>
              </div>
              <h2 className="text-3xl font-black tracking-tight text-[#083344] sm:text-4.5xl leading-tight">
                {config.faqTitle || "Sering Ditanyakan Orang Tua"}
              </h2>
              <p className="text-base text-[#475569] font-medium">
                {config.faqSub || "Temukan jawaban cepat atas pertanyaan seputar konsultasi pendidikan Sekolah Alam Al-Karim."}
              </p>
            </div>

            <div className="bg-white rounded-[24px] border border-cyan-100 p-6 md:p-10 shadow-sm" style={{ backgroundColor: config.colors?.card }}>
              <Accordion type="single" collapsible className="w-full space-y-4">
                {config.faqs?.map((faq: any, idx: number) => (
                  <AccordionItem key={idx} value={`item-${idx}`} className={`border-b border-slate-100 pb-4 ${idx === (config.faqs?.length || 0) - 1 ? 'border-none pb-0' : ''}`}>
                    <AccordionTrigger className="text-base font-extrabold text-[#083344] hover:text-[#0F766E] text-left leading-snug">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-[#475569] leading-relaxed pt-2">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

          </div>
        </section>
      )}

      {/* 8. CALL TO ACTION BANNER - SECTION 7 (Deep Aqua / Ocean SaaS Banner) */}
      {config.showCta !== false && (
        <section className="mx-auto max-w-6xl px-4 py-14 md:py-24">
          <div
            className="rounded-[28px] p-8 sm:p-14 text-center text-white relative overflow-hidden shadow-2xl bg-gradient-to-r from-[#083344] via-[#0F4C81] to-[#0F766E] border border-cyan-400/30"
            style={{ backgroundColor: config.ctaBg || undefined }}
          >
            {/* Background Decorative Rings */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-[#38BDF8]/20 blur-3xl" />
            <div className="pointer-events-none absolute -left-20 -bottom-20 h-80 w-80 rounded-full bg-[#0F766E]/40 blur-3xl" />

            <div className="relative z-10 space-y-6 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md px-4 py-1.5 text-xs font-extrabold text-cyan-200 border border-white/20">
                <Sparkles className="h-4 w-4 text-[#38BDF8]" />
                <span>MULAI LANGKAH AWAL SEKARANG</span>
              </div>

              <h2 className="text-3xl sm:text-4.5xl md:text-5.5xl font-black tracking-tight leading-tight text-white">
                Siap Mengetahui Potensi Terbaik Anak Anda?
              </h2>

              <p className="text-base md:text-lg text-cyan-100/90 max-w-2xl mx-auto leading-relaxed font-medium">
                {config.ctaDesc}
              </p>

              <div className="pt-4">
                <button
                  onClick={() => handleScroll(config.ctaBtnLink || "#jenjang")}
                  className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl btn-gradient-aqua px-10 text-base font-extrabold shadow-2xl hover:scale-105 active:scale-95 transition-all"
                >
                  <span>{config.ctaBtn}</span>
                  <ArrowRight className="h-5 w-5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 9. FOOTER - SECTION 8 (Deep Ocean Background #083344) */}
      {config.showFooter !== false && (
        <footer className="border-t border-cyan-900/60 bg-[#083344] text-slate-300 py-14 md:py-20 relative" style={{ backgroundColor: config.colors?.footer }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 md:grid-cols-12">
              
              {/* Brand Info */}
              <div className="space-y-4 md:col-span-5 text-left">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-[#0F766E] to-[#38BDF8] font-black text-white text-xl shadow-md">
                    {config.logoText?.charAt(0) || "E"}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xl font-black text-white leading-tight">{config.logoText}</span>
                    <span className="text-xs text-[#38BDF8] font-semibold">{config.footerSchool}</span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-slate-300/90 max-w-md font-medium">
                  Membimbing langkah anak menuju masa depan gemilang dengan pemahaman utuh karakter, minat, dan potensi tumbuh kembang alami.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  {config.socialLinks?.map((soc: any, idx: number) => (
                    <a 
                      key={idx}
                      href={soc.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-cyan-200 border border-white/15 hover:bg-[#0F766E] hover:text-white transition"
                      aria-label={soc.platform}
                    >
                      <Globe className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Hubungi Kami */}
              <div className="space-y-3.5 text-left md:col-span-4">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">Hubungi Kami</h4>
                <ul className="space-y-3 text-xs">
                  <li className="flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 text-[#38BDF8] shrink-0 mt-0.5" />
                    <span className="text-slate-300">{config.footerAddress}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-[#38BDF8] shrink-0" />
                    <a href={`https://wa.me/${config.footerWa}`} target="_blank" rel="noreferrer" className="text-cyan-200 hover:text-white transition font-medium">
                      {config.footerWa}
                    </a>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-[#38BDF8] shrink-0" />
                    <a href={`mailto:${config.footerEmail}`} className="text-cyan-200 hover:text-white transition font-medium">
                      {config.footerEmail}
                    </a>
                  </li>
                </ul>
              </div>

              {/* Tautan Quick Links */}
              <div className="space-y-3.5 text-left md:col-span-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">Navigasi Cepat</h4>
                <ul className="space-y-2 text-xs font-medium">
                  {config.navItems?.map((nav: any, idx: number) => (
                    <li key={idx}>
                      <button
                        onClick={() => {
                          if (nav.link?.startsWith("#")) handleScroll(nav.link);
                          else if (nav.link) window.location.href = nav.link;
                        }}
                        className="text-slate-300 hover:text-[#38BDF8] transition"
                      >
                        {nav.label}
                      </button>
                    </li>
                  ))}
                  <li>
                    <a href={`https://${config.footerWebsite}`} target="_blank" rel="noreferrer" className="text-[#38BDF8] hover:underline flex items-center gap-1.5 mt-1 font-bold">
                      <Globe className="h-3.5 w-3.5" />
                      <span>Website Resmi Sekolah</span>
                    </a>
                  </li>
                </ul>
              </div>

            </div>

            <div className="mt-12 border-t border-cyan-950 pt-6 text-center text-xs text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p>{config.footerCopyright}</p>
              <p className="text-[11px] text-slate-400 font-medium">Sekolah Alam Al-Karim — EduKonsul System v2.0</p>
            </div>
          </div>
        </footer>
      )}

    </div>
  );
}
