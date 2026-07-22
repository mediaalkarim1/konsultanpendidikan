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
  ctaBg: "#881337",
  
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
    primary: "#1e3a8a",
    secondary: "#881337",
    button: "#1e3a8a",
    header: "#ffffff",
    footer: "#0b1329",
    background: "#ffffff",
    card: "#ffffff"
  }
};

const ADVANTAGE_THEMES = [
  { bg: "bg-blue-500/10", border: "border-blue-200 dark:border-blue-800", text: "text-blue-950 dark:text-blue-400", ring: "group-hover:border-blue-500", iconGradient: "from-blue-950 via-indigo-900 to-blue-900" },
  { bg: "bg-rose-500/10", border: "border-rose-200 dark:border-rose-800", text: "text-rose-950 dark:text-rose-400", ring: "group-hover:border-rose-500", iconGradient: "from-rose-950 via-maroon-900 to-rose-900" },
  { bg: "bg-indigo-500/10", border: "border-indigo-200 dark:border-indigo-800", text: "text-indigo-950 dark:text-indigo-400", ring: "group-hover:border-indigo-500", iconGradient: "from-indigo-950 via-blue-900 to-slate-900" },
  { bg: "bg-red-500/10", border: "border-red-200 dark:border-red-800", text: "text-red-950 dark:text-red-400", ring: "group-hover:border-red-500", iconGradient: "from-red-950 via-rose-950 to-maroon-900" },
  { bg: "bg-sky-500/10", border: "border-sky-200 dark:border-sky-800", text: "text-sky-950 dark:text-sky-400", ring: "group-hover:border-sky-500", iconGradient: "from-blue-900 via-sky-950 to-indigo-950" },
  { bg: "bg-pink-500/10", border: "border-pink-200 dark:border-pink-800", text: "text-pink-950 dark:text-pink-400", ring: "group-hover:border-pink-500", iconGradient: "from-rose-900 via-pink-950 to-rose-950" }
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-rose-800 selection:text-white relative overflow-hidden" style={{ backgroundColor: config.colors?.background }}>
      {/* Inject Dynamic Colors & CSS Custom Utility Rules */}
      <style>{`
        :root {
          --primary: ${config.colors?.primary || '#1e3a8a'};
          --brand: ${config.colors?.primary || '#1e3a8a'};
          --brand-soft: #eff6ff;
          --secondary: ${config.colors?.secondary || '#881337'};
          --background: ${config.colors?.background || '#ffffff'};
          --card: ${config.colors?.card || '#ffffff'};
        }
        .btn-theme-primary {
          background: linear-gradient(135deg, ${config.colors?.primary || '#1e3a8a'} 0%, #2563eb 45%, ${config.colors?.secondary || '#881337'} 100%);
          color: #ffffff;
        }
        .btn-theme-primary:hover {
          filter: brightness(1.1);
          box-shadow: 0 10px 25px -5px rgba(30,58,138,0.35);
        }
        .gradient-text-brand {
          background: linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 40%, #be123c 75%, #881337 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      {/* Decorative Ambient Background Lights - Deep Navy & Rich Maroon */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-blue-400/20 via-indigo-300/10 to-transparent blur-[140px]" />
      <div className="pointer-events-none absolute top-1/3 -left-40 h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-rose-400/20 via-red-300/10 to-transparent blur-[140px]" />
      <div className="pointer-events-none absolute top-2/3 -right-20 h-[500px] w-[500px] rounded-full bg-gradient-to-bl from-blue-500/15 via-rose-400/15 to-transparent blur-[140px]" />

      {/* 1. STICKY HEADER */}
      {config.showHeader !== false && (
        <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/95 backdrop-blur-xl transition-all shadow-xs" style={{ backgroundColor: config.colors?.header ? config.colors.header + 'f0' : undefined }}>
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
                  <span className="text-lg font-black tracking-tight text-slate-900 group-hover:text-blue-900 transition">
                    {config.logoText}
                  </span>
                  <span className="inline-block h-2 w-2 rounded-full bg-rose-600 animate-pulse" />
                </div>
                <span className="text-[11px] text-rose-900 font-bold tracking-wide">
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
                  className="text-xs sm:text-sm font-bold text-slate-700 hover:text-blue-950 hover:bg-blue-50/80 px-3.5 py-1.5 rounded-xl transition-all"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={handleOpenHistoryModal}
                className="text-xs font-bold text-rose-950 transition flex items-center gap-1.5 rounded-2xl bg-rose-100/90 px-3.5 py-2 border border-rose-300/80 hover:bg-rose-200 hover:border-rose-400 shadow-xs hover:scale-105 active:scale-95 ml-2"
              >
                <History className="h-4 w-4 text-rose-800" /> 
                <span>Cek Riwayat</span>
              </button>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="hidden h-10 items-center gap-2 rounded-2xl btn-theme-primary px-5 text-xs sm:text-sm font-bold shadow-md shadow-blue-900/20 transition-all hover:scale-105 active:scale-95 md:inline-flex text-white"
              >
                <LogIn className="h-4 w-4 text-white" />
                <span>{config.btnLoginText}</span>
              </Link>

              {/* Mobile Hamburger Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 border border-blue-200 text-blue-950 md:hidden active:scale-95 transition shadow-xs hover:bg-blue-100"
                aria-label="Menu Mobile"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Drawer */}
          {mobileMenuOpen && (
            <div className="border-t border-blue-200 bg-white p-5 space-y-3 md:hidden shadow-xl animate-in slide-in-from-top duration-200">
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
                  className="block w-full text-left py-2.5 px-3 text-sm font-bold text-slate-800 hover:text-blue-900 hover:bg-blue-50 rounded-xl transition"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={handleOpenHistoryModal}
                className="w-full text-left py-2.5 px-3 text-sm font-bold text-rose-950 bg-rose-100/90 rounded-xl flex items-center gap-2 border border-rose-200"
              >
                <History className="h-4.5 w-4.5 text-rose-800" /> Riwayat Konsultasi
              </button>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl btn-theme-primary py-3 text-sm font-bold shadow-md shadow-blue-900/20 text-white"
              >
                <LogIn className="h-4.5 w-4.5 text-white" />
                <span>{config.btnLoginText}</span>
              </Link>
            </div>
          )}
        </header>
      )}

      {/* 2. HERO SECTION */}
      {config.showHero !== false && (
        <section id="tentang" className="relative pt-10 pb-16 md:pt-16 md:pb-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
              
              {/* Left Column: Teks & CTA */}
              <div className="text-left lg:col-span-7 space-y-6">
                
                {/* Badge */}
                <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/80 bg-gradient-to-r from-blue-50 via-indigo-50 to-rose-50/80 px-4 py-1.5 text-xs font-bold text-blue-950 shadow-xs">
                  <span className="flex h-2 w-2 rounded-full bg-rose-600 animate-ping" />
                  <Sparkles className="h-3.5 w-3.5 text-rose-700" />
                  <span>{config.heroBadge}</span>
                </div>

                {/* Title */}
                <h1 className="text-4xl sm:text-6xl lg:text-6.5xl xl:text-7xl font-black leading-[1.08] tracking-tight text-slate-900">
                  {config.heroTitle?.includes("Untuk Anak") ? (
                    <>
                      Konsultasi & Rekomendasi <br />
                      <span className="gradient-text-brand">Pendidikan Terbaik Anak</span>
                    </>
                  ) : (
                    config.heroTitle
                  )}
                </h1>

                {/* Description */}
                <p className="text-base leading-relaxed text-slate-600 sm:text-lg max-w-2xl">
                  {config.heroDesc}
                </p>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    onClick={() => handleScroll(config.heroBtn1Link || "#jenjang")}
                    className="inline-flex h-13 items-center justify-center gap-2.5 rounded-2xl btn-theme-primary px-8 text-base font-bold shadow-lg transition hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>{config.heroBtn1}</span>
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>

                {/* Trust Metrics Bar */}
                {config.showHeroStats !== false && (
                  <div className="pt-8 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {config.heroStats?.map((stat: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-100/90 text-blue-950 font-bold">
                          <DynamicIcon name={stat.icon || "Award"} className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-lg font-black text-slate-900 leading-none">{stat.value}</p>
                          <p className="text-[11px] font-semibold text-slate-500">{stat.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

              </div>

              {/* Right Column: Hero Graphic */}
              <div className="relative lg:col-span-5 flex justify-center">
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-700 via-indigo-600 to-rose-700 rounded-3xl blur-2xl opacity-30 animate-pulse -z-10" />
                
                <div className="relative w-full max-w-[460px]">
                  {/* Hero Main Image */}
                  <img
                    src={config.heroImg}
                    alt="Konsultasi Pendidikan Anak Sekolah Alam Al-Karim"
                    className="w-full h-[380px] sm:h-[440px] rounded-3xl object-cover shadow-2xl border-4 border-white"
                  />
                </div>
              </div>

            </div>
          </div>
        </section>
      )}

      {/* 3. SECTION KEUNGGULAN (ADVANTAGES) */}
      {config.showAdvantages !== false && (
        <section id="keunggulan" className="py-16 md:py-24 border-t border-slate-200/60 bg-white relative">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            
            {/* Header Section */}
            <div className="mx-auto max-w-3xl text-center space-y-4 mb-10 sm:mb-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-100/90 px-3.5 py-1 text-xs font-bold text-blue-950">
                <Target className="h-3.5 w-3.5 text-rose-700" />
                <span>KEUNGGULAN UTAMA</span>
              </div>
              <h2 className="text-2.5xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                {config.advantagesTitle}
              </h2>
              <p className="text-sm sm:text-base leading-relaxed text-slate-600">
                {config.advantagesSub}
              </p>
            </div>

            {/* List Poin Utama Keunggulan (Tanpa Deskripsi) */}
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 sm:gap-5">
              {config.advantages?.map((adv: any, idx: number) => {
                const theme = ADVANTAGE_THEMES[idx % ADVANTAGE_THEMES.length];
                return (
                  <div
                    key={idx}
                    className={`group flex items-center gap-4 rounded-2xl border ${theme.border} p-4 sm:p-5 bg-white text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${theme.ring}`}
                    style={{ backgroundColor: config.colors?.card }}
                  >
                    {/* Icon Box */}
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${theme.iconGradient} text-white shadow-xs transition-transform duration-300 group-hover:scale-105`}>
                      <DynamicIcon name={adv.icon} className="h-6 w-6" />
                    </div>

                    {/* Main Point Title Only */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight leading-snug group-hover:text-blue-950 transition">
                        {adv.title}
                      </h3>
                    </div>

                    <div className="shrink-0 text-rose-800">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </section>
      )}

      {/* 4. PILIHAN JENJANG PENDIDIKAN */}
      {config.showLevels !== false && (
        <section id="jenjang" className="py-16 md:py-24 bg-gradient-to-b from-slate-100/70 via-blue-50/30 to-slate-50 border-t border-slate-200/60 relative">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            
            {/* Header Section */}
            <div className="mx-auto max-w-3xl text-center space-y-4 mb-10 sm:mb-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-100/90 px-3.5 py-1 text-xs font-bold text-blue-950">
                <School className="h-3.5 w-3.5 text-rose-700" />
                <span>KONSULTASI BERDASARKAN JENJANG</span>
              </div>
              <h2 className="text-2.5xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                {config.levelsTitle}
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                {config.levelsSub || "Pilihlah jenjang pendidikan anak Anda untuk langsung memulai pengisian formulir kuesioner pemetaan potensi."}
              </p>
            </div>

            {/* Layout 3 Baris Sejajar (3 Rows Stacked Cards on Mobile & Desktop) */}
            <div className="flex flex-col gap-3.5 sm:space-y-6 max-w-5xl mx-auto">
              {config.levels?.filter((l: any) => l.active !== false).map((level: any, idx: number) => {
                const cardGradients = [
                  { border: "hover:border-blue-500 hover:shadow-blue-900/10", iconGradient: "from-blue-950 via-indigo-900 to-blue-900", tagBg: "bg-blue-50 text-blue-950 border-blue-200" },
                  { border: "hover:border-rose-500 hover:shadow-rose-900/10", iconGradient: "from-rose-950 via-maroon-900 to-rose-900", tagBg: "bg-rose-50 text-rose-950 border-rose-200" },
                  { border: "hover:border-indigo-500 hover:shadow-indigo-900/10", iconGradient: "from-indigo-950 via-blue-900 to-slate-900", tagBg: "bg-indigo-50 text-indigo-950 border-indigo-200" }
                ];
                const grad = cardGradients[idx % cardGradients.length];

                return (
                  <Link
                    key={level.id}
                    to="/formulir/$jenjang"
                    params={{ jenjang: level.id }}
                    className={`group relative flex items-center justify-between gap-3.5 sm:gap-6 rounded-2xl sm:rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-8 shadow-sm sm:shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${grad.border}`}
                    style={{ backgroundColor: config.colors?.card }}
                  >
                    {/* Left Side: Icon & Details */}
                    <div className="flex items-center gap-3.5 sm:gap-5 flex-1 min-w-0">
                      {/* Icon Box */}
                      <div className={`grid h-12 w-12 sm:h-16 sm:w-16 shrink-0 place-items-center rounded-xl sm:rounded-2xl bg-gradient-to-br ${grad.iconGradient} text-white shadow-md transition-transform duration-300 group-hover:scale-105`}>
                        <DynamicIcon name={level.icon} className="h-6 w-6 sm:h-8 sm:w-8" />
                      </div>

                      <div className="space-y-1 sm:space-y-2.5 text-left flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <h3 className="text-base sm:text-2xl font-black text-slate-900 tracking-tight group-hover:text-blue-950 transition">
                            {level.name}
                          </h3>
                          <span className={`rounded-full px-2.5 py-0.5 sm:px-3 sm:py-1 text-[10px] sm:text-xs font-bold border ${grad.tagBg}`}>
                            {level.tag || level.name}
                          </span>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2 sm:line-clamp-none">
                          {level.desc}
                        </p>

                        {/* Bullet Highlights (Visible on sm+) */}
                        <div className="hidden sm:flex flex-wrap items-center gap-x-6 gap-y-2 pt-1 text-xs font-semibold text-slate-700">
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-rose-700 shrink-0" />
                            <span>Pemetaan Gaya Belajar</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-rose-700 shrink-0" />
                            <span>Analisis Kebutuhan Anak</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <CheckCircle2 className="h-4 w-4 text-rose-700 shrink-0" />
                            <span>Rekomendasi Sekolah</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Side: Action Button */}
                    <div className="shrink-0 flex items-center justify-end">
                      <div className="inline-flex h-10 sm:h-12 items-center justify-center gap-1.5 sm:gap-2 rounded-xl sm:rounded-2xl btn-theme-primary px-4 sm:px-7 text-xs sm:text-sm font-bold shadow-xs sm:shadow-sm transition group-hover:shadow-md">
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

      {/* 5. CARA KERJA (HOW IT WORKS STEP-BY-STEP) */}
      {config.showHowItWorks !== false && (
        <section id="carakerja" className="py-16 md:py-24 bg-white border-t border-slate-200/60 relative">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            
            <div className="mx-auto max-w-3xl text-center space-y-4 mb-10 sm:mb-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-100/90 px-3.5 py-1 text-xs font-bold text-blue-950">
                <Zap className="h-3.5 w-3.5 text-rose-700" />
                <span>PROSES SANGAT MUDAH</span>
              </div>
              <h2 className="text-2.5xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                {config.howItWorksTitle || "4 Langkah Mudah Konsultasi Pendidikan"}
              </h2>
              <p className="text-sm sm:text-base text-slate-600">
                {config.howItWorksSub || "Proses efisien dan terstruktur untuk membantu Anda mendapatkan arahan pendidikan terbaik."}
              </p>
            </div>

            {/* Grid / List Poin Utama 4 Langkah (Tanpa Deskripsi) */}
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
              {config.howItWorksSteps?.map((item: any, idx: number) => {
                const colors = [
                  "from-blue-950 to-indigo-900",
                  "from-rose-950 to-maroon-900",
                  "from-indigo-950 to-slate-900",
                  "from-red-950 to-rose-900"
                ];
                return (
                  <div 
                    key={idx} 
                    className="group relative flex items-center gap-4 p-4 sm:p-5 rounded-2xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-md transition-all duration-300 text-left"
                  >
                    {/* Icon Box */}
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${colors[idx % colors.length]} text-white shadow-xs transition-transform duration-300 group-hover:scale-105`}>
                      <DynamicIcon name={item.icon || "CheckCircle2"} className="h-6 w-6" />
                    </div>

                    {/* Main Point Title & Step Pill */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <span className="inline-block text-[10px] font-black tracking-wider text-rose-950 bg-rose-100/90 px-2.5 py-0.5 rounded-full uppercase">
                        Langkah {item.step || `0${idx+1}`}
                      </span>
                      <h3 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight leading-snug group-hover:text-blue-950 transition">
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

      {/* 6. FAQ SECTION */}
      {config.showFaq !== false && (
        <section id="faq" className="py-16 md:py-24 bg-slate-50/60 border-t border-slate-200/60 relative">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            
            <div className="text-center space-y-4 mb-12">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-100/90 px-3.5 py-1 text-xs font-bold text-blue-950">
                <HelpCircle className="h-3.5 w-3.5 text-rose-700" />
                <span>PERTANYAAN POPULER</span>
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                {config.faqTitle || "Sering Ditanyakan Orang Tua"}
              </h2>
              <p className="text-base text-slate-600">
                {config.faqSub || "Temukan jawaban cepat atas pertanyaan seputar konsultasi pendidikan Sekolah Alam Al-Karim."}
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm" style={{ backgroundColor: config.colors?.card }}>
              <Accordion type="single" collapsible className="w-full space-y-3">
                {config.faqs?.map((faq: any, idx: number) => (
                  <AccordionItem key={idx} value={`item-${idx}`} className={`border-b border-slate-100 pb-3 ${idx === (config.faqs?.length || 0) - 1 ? 'border-none pb-0' : ''}`}>
                    <AccordionTrigger className="text-base font-bold text-slate-900 hover:text-blue-950 text-left">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-slate-600 leading-relaxed pt-2">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

          </div>
        </section>
      )}

      {/* 7. CALL TO ACTION BANNER */}
      {config.showCta !== false && (
        <section className="mx-auto max-w-6xl px-4 py-12 md:py-20">
          <div
            className="rounded-3xl p-8 sm:p-12 text-center text-white relative overflow-hidden shadow-2xl bg-gradient-to-r from-blue-950 via-slate-900 to-rose-950"
            style={{ backgroundColor: config.ctaBg || undefined }}
          >
            {/* Background Decorative Rings */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-xl" />
            <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-rose-500/20 blur-xl" />

            <div className="relative z-10 space-y-6 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-4 py-1.5 text-xs font-bold text-rose-100 border border-white/20">
                <Sparkles className="h-4 w-4 text-rose-300" />
                <span>MULAI LANGKAH AWAL SEKARANG</span>
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
                {config.ctaTitle}
              </h2>

              <p className="text-base md:text-lg text-blue-100/90 max-w-2xl mx-auto leading-relaxed">
                {config.ctaDesc}
              </p>

              <div className="pt-4">
                <button
                  onClick={() => handleScroll(config.ctaBtnLink || "#jenjang")}
                  className="inline-flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-white px-9 text-base font-extrabold text-blue-950 shadow-xl transition-all hover:scale-105 active:scale-95 hover:bg-rose-50"
                >
                  <span>{config.ctaBtn}</span>
                  <ArrowRight className="h-5 w-5 text-rose-800" />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 8. FOOTER */}
      {config.showFooter !== false && (
        <footer className="border-t border-slate-800 bg-slate-950 text-slate-400 py-12 md:py-16 relative" style={{ backgroundColor: config.colors?.footer }}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-10 md:grid-cols-12">
              
              {/* Brand Info */}
              <div className="space-y-4 md:col-span-5 text-left">
                <div className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-900 font-black text-white text-xl shadow-md">
                    {config.logoText?.charAt(0) || "E"}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xl font-black text-white leading-tight">{config.logoText}</span>
                    <span className="text-xs text-rose-400 font-semibold">{config.footerSchool}</span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-slate-400 max-w-md">
                  Membimbing langkah anak menuju masa depan gemilang dengan pemahaman utuh karakter, minat, dan potensi tumbuh kembang alami.
                </p>
                <div className="flex items-center gap-3 pt-2">
                  {config.socialLinks?.map((soc: any, idx: number) => (
                    <a 
                      key={idx}
                      href={soc.url} 
                      target="_blank" 
                      rel="noreferrer" 
                      className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-slate-300 border border-slate-800 hover:bg-rose-900 hover:text-white transition"
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
                    <MapPin className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                    <span className="text-slate-300">{config.footerAddress}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-rose-500 shrink-0" />
                    <a href={`https://wa.me/${config.footerWa}`} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-rose-400 transition font-medium">
                      {config.footerWa}
                    </a>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-rose-500 shrink-0" />
                    <a href={`mailto:${config.footerEmail}`} className="text-slate-300 hover:text-rose-400 transition font-medium">
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
                        className="text-slate-400 hover:text-white transition"
                      >
                        {nav.label}
                      </button>
                    </li>
                  ))}
                  <li>
                    <a href={`https://${config.footerWebsite}`} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline flex items-center gap-1.5 mt-1">
                      <Globe className="h-3.5 w-3.5" />
                      <span>Website Resmi Sekolah</span>
                    </a>
                  </li>
                </ul>
              </div>

            </div>

            <div className="mt-12 border-t border-slate-900 pt-6 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p>{config.footerCopyright}</p>
              <p className="text-[11px] text-slate-600">Sekolah Alam Al-Karim — EduKonsul System v2.0</p>
            </div>
          </div>
        </footer>
      )}

    </div>
  );
}
