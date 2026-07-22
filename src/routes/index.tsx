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
          --primary: ${config.colors?.primary || '#2563eb'};
          --brand: ${config.colors?.primary || '#2563eb'};
          --brand-soft: #eff6ff;
          --secondary: ${config.colors?.secondary || '#1e3a5f'};
          --background: ${config.colors?.background || '#ffffff'};
          --card: ${config.colors?.card || '#ffffff'};
        }
        .hero-gradient-bg {
          background: linear-gradient(135deg, #2563EB 0%, #3B82F6 45%, #60A5FA 100%);
        }
        .btn-hero-primary {
          background-color: #ffffff;
          color: #2563eb;
          font-weight: 800;
          transition: all 0.2s ease-in-out;
        }
        .btn-hero-primary:hover {
          background-color: #eff6ff;
          color: #1d4ed8;
          box-shadow: 0 10px 25px -5px rgba(255,255,255,0.4);
        }
        .btn-theme-primary {
          background-color: #2563eb;
          color: #ffffff;
          transition: all 0.2s ease-in-out;
        }
        .btn-theme-primary:hover {
          background-color: #1d4ed8;
          box-shadow: 0 8px 20px -4px rgba(37,99,235,0.35);
        }
        .btn-theme-secondary {
          background-color: #ffffff;
          border: 1px solid #2563eb;
          color: #2563eb;
          transition: all 0.2s ease-in-out;
        }
        .btn-theme-secondary:hover {
          background-color: #eff6ff;
          border-color: #1d4ed8;
          color: #1d4ed8;
        }
      `}</style>

      {/* Decorative Ambient Background Lights - Subtle Soft Blue */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-blue-100/60 via-sky-50/40 to-transparent blur-[140px]" />
      <div className="pointer-events-none absolute top-1/3 -left-40 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-slate-100/80 via-blue-50/30 to-transparent blur-[140px]" />

      {/* 1. STICKY HEADER */}
      {config.showHeader !== false && (
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xl transition-all shadow-xs" style={{ backgroundColor: config.colors?.header ? config.colors.header + 'f0' : undefined }}>
          <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link to="/" className="flex items-center gap-3 group">
              {config.logoImg ? (
                <img src={config.logoImg} alt={config.siteName} className="h-10 w-auto rounded-xl shadow-xs transition group-hover:scale-105" />
              ) : (
                <div className="grid h-11 w-11 place-items-center rounded-2xl btn-theme-primary font-black shadow-md text-xl transition group-hover:scale-105 text-white">
                  {config.logoText ? config.logoText.charAt(0) : "E"}
                </div>
              )}
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black tracking-tight text-[#1e293b] group-hover:text-[#2563eb] transition">
                    {config.logoText}
                  </span>
                  <span className="inline-block h-2 w-2 rounded-full bg-[#2563eb] animate-pulse" />
                </div>
                <span className="text-[11px] text-[#475569] font-bold tracking-wide">
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
                  className="text-xs sm:text-sm font-bold text-[#475569] hover:text-[#2563eb] hover:bg-[#eff6ff] px-3.5 py-1.5 rounded-xl transition-all"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={handleOpenHistoryModal}
                className="text-xs font-bold btn-theme-secondary transition flex items-center gap-1.5 rounded-2xl px-3.5 py-2 shadow-xs hover:scale-105 active:scale-95 ml-2"
              >
                <History className="h-4 w-4 text-[#2563eb]" /> 
                <span>Cek Riwayat</span>
              </button>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="hidden h-10 items-center gap-2 rounded-2xl btn-theme-primary px-5 text-xs sm:text-sm font-bold shadow-md transition-all hover:scale-105 active:scale-95 md:inline-flex text-white"
              >
                <LogIn className="h-4 w-4 text-white" />
                <span>{config.btnLoginText}</span>
              </Link>

              {/* Mobile Hamburger Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="grid h-10 w-10 place-items-center rounded-xl bg-[#eff6ff] border border-blue-200 text-[#2563eb] md:hidden active:scale-95 transition shadow-xs hover:bg-blue-100"
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
                  className="block w-full text-left py-2.5 px-3 text-sm font-bold text-[#475569] hover:text-[#2563eb] hover:bg-[#eff6ff] rounded-xl transition"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={handleOpenHistoryModal}
                className="w-full text-left py-2.5 px-3 text-sm font-bold btn-theme-secondary rounded-xl flex items-center gap-2"
              >
                <History className="h-4.5 w-4.5 text-[#2563eb]" /> Riwayat Konsultasi
              </button>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl btn-theme-primary py-3 text-sm font-bold shadow-md text-white"
              >
                <LogIn className="h-4.5 w-4.5 text-white" />
                <span>{config.btnLoginText}</span>
              </Link>
            </div>
          )}
        </header>
      )}

      {/* 2. HERO SECTION - SECTION 1 (Hero Gradient with Abstract Circle Decorations & White Text) */}
      {config.showHero !== false && (
        <section id="tentang" className="relative pt-12 pb-20 md:pt-20 md:pb-28 hero-gradient-bg text-white overflow-hidden shadow-sm">
          {/* Abstract Circle / Blob Background Decorations (5-10% Opacity) */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute top-1/2 -left-24 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute bottom-0 right-1/3 h-64 w-64 rounded-full bg-white/5 blur-xl" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              
              {/* Left Column: Teks & CTA */}
              <div className="text-left lg:col-span-7 space-y-6">
                
                {/* Badge */}
                <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 backdrop-blur-md px-4 py-1.5 text-xs font-bold text-white shadow-xs">
                  <span className="flex h-2 w-2 rounded-full bg-white animate-ping" />
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                  <span>{config.heroBadge}</span>
                </div>

                {/* Title */}
                <h1 className="text-4xl sm:text-6xl lg:text-6.5xl xl:text-7xl font-black leading-[1.08] tracking-tight text-white">
                  {config.heroTitle?.includes("Untuk Anak") ? (
                    <>
                      Konsultasi & Rekomendasi <br />
                      <span className="text-blue-100 underline decoration-white/30 underline-offset-8">Pendidikan Terbaik Anak</span>
                    </>
                  ) : (
                    config.heroTitle
                  )}
                </h1>

                {/* Description */}
                <p className="text-base leading-relaxed text-white/90 sm:text-lg max-w-2xl font-medium">
                  {config.heroDesc}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    onClick={() => handleScroll(config.heroBtn1Link || "#jenjang")}
                    className="inline-flex h-13 items-center justify-center gap-2.5 rounded-2xl btn-hero-primary px-8 text-base font-extrabold shadow-xl transition hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>{config.heroBtn1}</span>
                    <ArrowRight className="h-5 w-5 text-[#2563eb]" />
                  </button>
                </div>

                {/* Trust Metrics Bar */}
                {config.showHeroStats !== false && (
                  <div className="pt-8 border-t border-white/20 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {config.heroStats?.map((stat: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 bg-white/15 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 text-white shadow-xs">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20 text-white font-bold">
                          <DynamicIcon name={stat.icon || "Award"} className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-lg font-black text-white leading-none">{stat.value}</p>
                          <p className="text-[11px] font-medium text-blue-50/90">{stat.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>

              {/* Right Column: Hero Graphic */}
              <div className="relative lg:col-span-5 flex justify-center">
                <div className="absolute -inset-2 bg-white/20 rounded-3xl blur-2xl opacity-60 -z-10" />
                
                <div className="relative w-full max-w-[460px]">
                  {/* Hero Main Image */}
                  <img
                    src={config.heroImg}
                    alt="Konsultasi Pendidikan Anak Sekolah Alam Al-Karim"
                    className="w-full h-[380px] sm:h-[440px] rounded-3xl object-cover shadow-2xl border-4 border-white/90"
                  />
                </div>
              </div>

            </div>
          </div>
        </section>
      )}

      {/* 3. SECTION KEUNGGULAN (ADVANTAGES) - SECTION 2 (Very Light Blue Background #EFF6FF) */}
      {config.showAdvantages !== false && (
        <section id="keunggulan" className="py-16 md:py-24 border-t border-b border-blue-100 bg-[#eff6ff] relative">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            
            {/* Header Section */}
            <div className="mx-auto max-w-3xl text-center space-y-4 mb-10 sm:mb-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-white border border-blue-200 px-3.5 py-1 text-xs font-bold text-[#2563eb] shadow-xs">
                <Target className="h-3.5 w-3.5 text-[#2563eb]" />
                <span>KEUNGGULAN UTAMA</span>
              </div>
              <h2 className="text-2.5xl font-extrabold tracking-tight text-[#1e293b] sm:text-4xl">
                {config.advantagesTitle}
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-[#475569]">
                {config.advantagesSub}
              </p>
            </div>

            {/* List Poin Utama Keunggulan */}
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
              {config.advantages?.map((adv: any, idx: number) => {
                return (
                  <div
                    key={idx}
                    className="group flex items-center gap-4 rounded-2xl border border-[#e5e7eb] p-4 sm:p-5 bg-white text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-[#2563eb]/40 shadow-xs"
                    style={{ backgroundColor: config.colors?.card }}
                  >
                    {/* Icon Box */}
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#2563eb] text-white shadow-xs transition-transform duration-300 group-hover:scale-105">
                      <DynamicIcon name={adv.icon} className="h-6 w-6" />
                    </div>

                    {/* Main Point Title Only */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-extrabold text-[#1e293b] tracking-tight leading-snug group-hover:text-[#2563eb] transition">
                        {adv.title}
                      </h3>
                    </div>

                    <div className="shrink-0 text-[#2563eb]">
                      <CheckCircle2 className="h-5 w-5" />
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
        <section id="jenjang" className="py-16 md:py-24 bg-white border-b border-slate-200/80 relative">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            
            {/* Header Section */}
            <div className="mx-auto max-w-3xl text-center space-y-4 mb-10 sm:mb-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#eff6ff] border border-blue-200 px-3.5 py-1 text-xs font-bold text-[#2563eb]">
                <School className="h-3.5 w-3.5 text-[#2563eb]" />
                <span>KONSULTASI BERDASARKAN JENJANG</span>
              </div>
              <h2 className="text-2.5xl font-extrabold tracking-tight text-[#1e293b] sm:text-4xl">
                {config.levelsTitle}
              </h2>
              <p className="text-sm sm:text-base text-[#475569]">
                {config.levelsSub || "Pilihlah jenjang pendidikan anak Anda untuk langsung memulai pengisian formulir kuesioner pemetaan potensi."}
              </p>
            </div>

            {/* Layout 3 Baris Sejajar */}
            <div className="flex flex-col gap-3.5 sm:space-y-6 max-w-5xl mx-auto">
              {config.levels?.filter((l: any) => l.active !== false).map((level: any) => {
                return (
                  <Link
                    key={level.id}
                    to="/formulir/$jenjang"
                    params={{ jenjang: level.id }}
                    className="group relative flex items-center justify-between gap-3.5 sm:gap-6 rounded-2xl sm:rounded-3xl border border-[#e5e7eb] bg-white p-4 sm:p-8 shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-[#2563eb]/40"
                    style={{ backgroundColor: config.colors?.card }}
                  >
                    {/* Left Side: Icon & Details */}
                    <div className="flex items-center gap-3.5 sm:gap-5 flex-1 min-w-0">
                      {/* Icon Box */}
                      <div className="grid h-12 w-12 sm:h-16 sm:w-16 shrink-0 place-items-center rounded-xl sm:rounded-2xl bg-[#2563eb] text-white shadow-md transition-transform duration-300 group-hover:scale-105">
                        <DynamicIcon name={level.icon} className="h-6 w-6 sm:h-8 sm:w-8" />
                      </div>

                      <div className="space-y-1 sm:space-y-2.5 text-left flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <h3 className="text-base sm:text-2xl font-black text-[#1e293b] tracking-tight group-hover:text-[#2563eb] transition">
                            {level.name}
                          </h3>
                          <span className="rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-bold border bg-[#eff6ff] text-[#2563eb] border-blue-200">
                            {level.tag || level.name}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-[#64748b] leading-relaxed line-clamp-2 sm:line-clamp-none">
                          {level.desc}
                        </p>

                        {/* Bullet Highlights */}
                        <div className="hidden sm:flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-xs font-semibold text-[#475569]">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-[#2563eb] shrink-0" />
                            <span>Pemetaan Gaya Belajar</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-[#2563eb] shrink-0" />
                            <span>Analisis Kebutuhan Anak</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-[#2563eb] shrink-0" />
                            <span>Rekomendasi Sekolah</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Action Button */}
                    <div className="shrink-0 flex items-center justify-end">
                      <div className="inline-flex h-10 sm:h-12 items-center justify-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl btn-theme-primary px-4 sm:px-7 text-xs sm:text-sm font-bold shadow-xs transition group-hover:shadow-md">
                        <span>{level.btnText || "Mulai"}</span>
                        <ArrowRight className="h-4 w-4 sm:h-4.5 sm:w-4.5 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

          </div>
        </section>
      )}

      {/* 5. CARA KERJA (HOW IT WORKS) - SECTION 4 (Soft Blue-Gray Background #F8FAFC) */}
      {config.showHowItWorks !== false && (
        <section id="carakerja" className="py-16 md:py-24 bg-[#f8fafc] border-t border-b border-slate-200/80 relative">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            
            <div className="mx-auto max-w-3xl text-center space-y-4 mb-10 sm:mb-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3.5 py-1 text-xs font-bold text-[#2563eb] shadow-xs">
                <Zap className="h-3.5 w-3.5 text-[#2563eb]" />
                <span>PROSES SANGAT MUDAH</span>
              </div>
              <h2 className="text-2.5xl font-extrabold tracking-tight text-[#1e293b] sm:text-4xl">
                {config.howItWorksTitle || "4 Langkah Mudah Konsultasi Pendidikan"}
              </h2>
              <p className="text-sm sm:text-base text-[#475569]">
                {config.howItWorksSub || "Proses efisien dan terstruktur untuk membantu Anda mendapatkan arahan pendidikan terbaik."}
              </p>
            </div>

            {/* Grid / List Poin Utama 4 Langkah */}
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
              {config.howItWorksSteps?.map((item: any, idx: number) => {
                return (
                  <div 
                    key={idx} 
                    className="group relative flex items-center gap-4 p-4 sm:p-5 rounded-2xl border border-[#e5e7eb] bg-white hover:border-[#2563eb]/40 hover:shadow-md transition-all duration-300 text-left shadow-xs"
                  >
                    {/* Icon Box */}
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#2563eb] text-white shadow-xs transition-transform duration-300 group-hover:scale-105">
                      <DynamicIcon name={item.icon || "CheckCircle2"} className="h-6 w-6" />
                    </div>

                    {/* Main Point Title & Step Pill */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <span className="inline-block text-[10px] font-black tracking-wider text-[#2563eb] bg-[#eff6ff] border border-blue-200 px-2.5 py-0.5 rounded-full uppercase">
                        Langkah {item.step || `0${idx+1}`}
                      </span>
                      <h3 className="text-sm sm:text-base font-extrabold text-[#1e293b] tracking-tight leading-snug group-hover:text-[#2563eb] transition">
                        {item.title}
                      </h3>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </section>
      )}

      {/* 6. FAQ SECTION - SECTION 5 (Very Light Blue Background #EFF6FF) */}
      {config.showFaq !== false && (
        <section id="faq" className="py-16 md:py-24 bg-[#eff6ff] border-t border-b border-blue-100 relative">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            
            <div className="text-center space-y-4 mb-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-white border border-blue-200 px-3.5 py-1 text-xs font-bold text-[#2563eb] shadow-xs">
                <HelpCircle className="h-3.5 w-3.5 text-[#2563eb]" />
                <span>PERTANYAAN POPULER</span>
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight text-[#1e293b] sm:text-4xl">
                {config.faqTitle || "Sering Ditanyakan Orang Tua"}
              </h2>
              <p className="text-base text-[#475569]">
                {config.faqSub || "Temukan jawaban cepat atas pertanyaan seputar konsultasi pendidikan Sekolah Alam Al-Karim."}
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-[#e5e7eb] p-6 md:p-8 shadow-xs" style={{ backgroundColor: config.colors?.card }}>
              <Accordion type="single" collapsible className="w-full space-y-3">
                {config.faqs?.map((faq: any, idx: number) => (
                  <AccordionItem key={idx} value={`item-${idx}`} className={`border-b border-slate-100 pb-3 ${idx === (config.faqs?.length || 0) - 1 ? 'border-none pb-0' : ''}`}>
                    <AccordionTrigger className="text-base font-bold text-[#1e293b] hover:text-[#2563eb] text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-[#64748b] leading-relaxed pt-2">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

          </div>
        </section>
      )}

      {/* 7. CALL TO ACTION BANNER - SECTION 6 (Navy Gradient Background) */}
      {config.showCta !== false && (
        <section className="mx-auto max-w-6xl px-4 py-12 md:py-20">
          <div
            className="rounded-3xl p-8 sm:p-12 text-center text-white relative overflow-hidden shadow-xl bg-gradient-to-r from-[#1e3a5f] to-[#2563eb]"
            style={{ backgroundColor: config.ctaBg || undefined }}
          >
            {/* Background Decorative Rings */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-xl" />
            <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-blue-400/20 blur-xl" />

            <div className="relative z-10 space-y-6 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-4 py-1.5 text-xs font-bold text-blue-100 border border-white/20">
                <Sparkles className="h-4 w-4 text-blue-200" />
                <span>MULAI LANGKAH AWAL SEKARANG</span>
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight text-white">
                {config.ctaTitle}
              </h2>

              <p className="text-base md:text-lg text-blue-100/90 max-w-2xl mx-auto leading-relaxed">
                {config.ctaDesc}
              </p>

              <div className="pt-4">
                <button
                  onClick={() => handleScroll(config.ctaBtnLink || "#jenjang")}
                  className="inline-flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-white px-9 text-base font-extrabold text-[#2563eb] shadow-lg transition-all hover:scale-105 active:scale-95 hover:bg-blue-50"
                >
                  <span>{config.ctaBtn}</span>
                  <ArrowRight className="h-5 w-5 text-[#2563eb]" />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 8. FOOTER - SECTION 7 (Navy #1E3A5F Background & White Text & #BFDBFE Links) */}
      {config.showFooter !== false && (
        <footer className="border-t border-slate-700 bg-[#1e3a5f] text-white py-12 md:py-16 relative" style={{ backgroundColor: config.colors?.footer }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 md:grid-cols-12">
              
              {/* Brand Info */}
              <div className="space-y-4 md:col-span-5 text-left">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#2563eb] font-black text-white text-xl shadow-md">
                    {config.logoText?.charAt(0) || "E"}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xl font-black text-white leading-tight">{config.logoText}</span>
                    <span className="text-xs text-[#bfdbfe] font-semibold">{config.footerSchool}</span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-blue-100/90 max-w-md">
                  Membimbing langkah anak menuju masa depan gemilang dengan pemahaman utuh karakter, minat, dan potensi tumbuh kembang alami.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  {config.socialLinks?.map((soc: any, idx: number) => (
                    <a 
                      key={idx}
                      href={soc.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 text-[#bfdbfe] border border-white/15 hover:bg-[#2563eb] hover:text-white transition"
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
                    <MapPin className="h-4 w-4 text-[#bfdbfe] shrink-0 mt-0.5" />
                    <span className="text-blue-100/90">{config.footerAddress}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-[#bfdbfe] shrink-0" />
                    <a href={`https://wa.me/${config.footerWa}`} target="_blank" rel="noreferrer" className="text-[#bfdbfe] hover:text-white transition font-medium">
                      {config.footerWa}
                    </a>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-[#bfdbfe] shrink-0" />
                    <a href={`mailto:${config.footerEmail}`} className="text-[#bfdbfe] hover:text-white transition font-medium">
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
                        className="text-blue-100/80 hover:text-white transition"
                      >
                        {nav.label}
                      </button>
                    </li>
                  ))}
                  <li>
                    <a href={`https://${config.footerWebsite}`} target="_blank" rel="noreferrer" className="text-[#bfdbfe] hover:underline flex items-center gap-1.5 mt-1">
                      <Globe className="h-3.5 w-3.5" />
                      <span>Website Resmi Sekolah</span>
                    </a>
                  </li>
                </ul>
              </div>

            </div>

            <div className="mt-12 border-t border-white/10 pt-6 text-center text-xs text-blue-200/60 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p>{config.footerCopyright}</p>
              <p className="text-[11px] text-blue-200/50">Sekolah Alam Al-Karim — EduKonsul System v2.0</p>
            </div>
          </div>
        </footer>
      )}

    </div>
  );
}
