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
  ctaBg: "#047857",
  
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
    primary: "#047857",
    secondary: "#059669",
    button: "#047857",
    header: "#ffffff",
    footer: "#0f172a",
    background: "#ffffff",
    card: "#ffffff"
  }
};

const ADVANTAGE_THEMES = [
  { bg: "bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-400", ring: "group-hover:border-emerald-400", iconGradient: "from-emerald-500 to-teal-600" },
  { bg: "bg-sky-500/10", border: "border-sky-200 dark:border-sky-800", text: "text-sky-700 dark:text-sky-400", ring: "group-hover:border-sky-400", iconGradient: "from-sky-500 to-indigo-600" },
  { bg: "bg-amber-500/10", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-400", ring: "group-hover:border-amber-400", iconGradient: "from-amber-500 to-orange-600" },
  { bg: "bg-violet-500/10", border: "border-violet-200 dark:border-violet-800", text: "text-violet-700 dark:text-violet-400", ring: "group-hover:border-violet-400", iconGradient: "from-violet-500 to-purple-600" },
  { bg: "bg-teal-500/10", border: "border-teal-200 dark:border-teal-800", text: "text-teal-700 dark:text-teal-400", ring: "group-hover:border-teal-400", iconGradient: "from-teal-500 to-emerald-600" },
  { bg: "bg-rose-500/10", border: "border-rose-200 dark:border-rose-800", text: "text-rose-700 dark:text-rose-400", ring: "group-hover:border-rose-400", iconGradient: "from-rose-500 to-pink-600" }
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
    <div className="min-h-screen bg-slate-50/40 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white relative overflow-hidden" style={{ backgroundColor: config.colors?.background }}>
      {/* Inject Dynamic Colors & CSS Custom Utility Rules */}
      <style>{`
        :root {
          --primary: ${config.colors?.primary || '#047857'};
          --brand: ${config.colors?.primary || '#047857'};
          --brand-soft: ${config.colors?.primary + '10' || '#ecfdf5'};
          --secondary: ${config.colors?.secondary || '#059669'};
          --background: ${config.colors?.background || '#ffffff'};
          --card: ${config.colors?.card || '#ffffff'};
        }
        .btn-theme-primary {
          background: linear-gradient(135deg, ${config.colors?.primary || '#047857'} 0%, ${config.colors?.secondary || '#059669'} 100%);
          color: #ffffff;
        }
        .btn-theme-primary:hover {
          filter: brightness(1.08);
          box-shadow: 0 10px 25px -5px ${config.colors?.primary + '60' || 'rgba(4,120,87,0.35)'};
        }
        .gradient-text-brand {
          background: linear-gradient(135deg, ${config.colors?.primary || '#047857'} 0%, #0d9488 50%, #d97706 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      {/* Decorative Ambient Background Lights */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-emerald-400/20 blur-[120px]" />
      <div className="pointer-events-none absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-amber-400/15 blur-[120px]" />
      <div className="pointer-events-none absolute top-2/3 -right-20 h-96 w-96 rounded-full bg-teal-400/15 blur-[120px]" />

      {/* 1. STICKY HEADER */}
      {config.showHeader !== false && (
        <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-md transition-all shadow-xs" style={{ backgroundColor: config.colors?.header ? config.colors.header + 'f0' : undefined }}>
          <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <Link to="/" className="flex items-center gap-3 group">
              {config.logoImg ? (
                <img src={config.logoImg} alt={config.siteName} className="h-10 w-auto rounded-xl shadow-xs transition group-hover:scale-105" />
              ) : (
                <div className="grid h-11 w-11 place-items-center rounded-2xl btn-theme-primary font-black shadow-md text-xl transition group-hover:scale-105">
                  {config.logoText ? config.logoText.charAt(0) : "E"}
                </div>
              )}
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-lg font-black tracking-tight text-slate-900 group-hover:text-emerald-700 transition">
                    {config.logoText}
                  </span>
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <span className="text-[11px] text-emerald-800 font-semibold tracking-wide">
                  {config.siteName}
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden items-center gap-7 md:flex">
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
                  className="text-sm font-semibold text-slate-600 transition hover:text-emerald-700 relative py-1 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-0 after:bg-emerald-600 after:transition-all hover:after:w-full"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={handleOpenHistoryModal}
                className="text-sm font-semibold text-slate-700 hover:text-emerald-700 transition flex items-center gap-1.5 rounded-full bg-slate-100/80 px-3.5 py-1.5 border border-slate-200/80 hover:bg-emerald-50 hover:border-emerald-200"
              >
                <History className="h-4 w-4 text-emerald-600" /> 
                <span>Cek Riwayat</span>
              </button>
            </nav>

            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="hidden h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-bold text-slate-700 shadow-xs transition hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/50 md:inline-flex"
              >
                <LogIn className="h-4 w-4 text-emerald-600" />
                <span>{config.btnLoginText}</span>
              </Link>

              {/* Mobile Hamburger Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 md:hidden active:scale-95 transition shadow-xs"
                aria-label="Menu Mobile"
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation Drawer */}
          {mobileMenuOpen && (
            <div className="border-t border-slate-200 bg-white p-5 space-y-3.5 md:hidden shadow-xl animate-in slide-in-from-top duration-200">
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
                  className="block w-full text-left py-2 text-sm font-bold text-slate-700 hover:text-emerald-700 border-b border-slate-100"
                >
                  {item.label}
                </button>
              ))}
              <button
                onClick={handleOpenHistoryModal}
                className="w-full text-left py-2.5 text-sm font-bold text-emerald-800 bg-emerald-50 rounded-xl px-3 flex items-center gap-2"
              >
                <History className="h-4.5 w-4.5 text-emerald-600" /> Riwayat Konsultasi
              </button>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                <LogIn className="h-4.5 w-4.5 text-emerald-600" />
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
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/80 bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50/80 px-4 py-1.5 text-xs font-bold text-emerald-900 shadow-xs">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{config.heroBadge}</span>
                </div>

                {/* Title */}
                <h1 className="text-3.5xl font-black leading-[1.15] tracking-tight text-slate-900 sm:text-5xl lg:text-5.5xl">
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
                        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700 font-bold">
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

              {/* Right Column: Hero Graphic with Badges */}
              <div className="relative lg:col-span-5 flex justify-center">
                <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-400 rounded-3xl blur-2xl opacity-30 animate-pulse -z-10" />
                
                <div className="relative w-full max-w-[460px]">
                  {/* Hero Main Image */}
                  <img
                    src={config.heroImg}
                    alt="Konsultasi Pendidikan Anak Sekolah Alam Al-Karim"
                    className="w-full h-[380px] sm:h-[440px] rounded-3xl object-cover shadow-2xl border-4 border-white"
                  />

                  {/* Floating Glass Overlay Card 1 (Top Right) */}
                  <div className="absolute -top-4 -right-4 sm:-top-6 sm:-right-6 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-700">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500 text-white font-black">
                      <Star className="h-5 w-5 fill-current" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-black text-slate-900">4.9 / 5.0</span>
                        <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-1.5 py-0.5 rounded-full">Sangat Puas</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">Ulasan Orang Tua Murid</p>
                    </div>
                  </div>

                  {/* Floating Glass Overlay Card 2 (Bottom Left) */}
                  <div className="absolute -bottom-5 -left-4 sm:-bottom-6 sm:-left-6 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-slate-100 flex items-center gap-3 max-w-[240px]">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">Analisis Gaya Belajar & Karakter</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Rekomendasi Terpersonalisasi</p>
                    </div>
                  </div>

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
            <div className="mx-auto max-w-3xl text-center space-y-4 mb-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-3.5 py-1 text-xs font-bold text-emerald-800">
                <Target className="h-3.5 w-3.5" />
                <span>KEUNGGULAN UTAMA</span>
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                {config.advantagesTitle}
              </h2>
              <p className="text-base leading-relaxed text-slate-600">
                {config.advantagesSub}
              </p>
            </div>

            {/* Grid 3 Columns */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {config.advantages?.map((adv: any, idx: number) => {
                const theme = ADVANTAGE_THEMES[idx % ADVANTAGE_THEMES.length];
                return (
                  <div
                    key={idx}
                    className={`group relative flex flex-col rounded-3xl border ${theme.border} p-6 sm:p-7 bg-white text-left transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl ${theme.ring}`}
                    style={{ backgroundColor: config.colors?.card }}
                  >
                    {/* Top Icon with Gradient Background */}
                    <div className={`grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${theme.iconGradient} text-white shadow-md transition-transform duration-300 group-hover:scale-110`}>
                      <DynamicIcon name={adv.icon} className="h-7 w-7" />
                    </div>

                    <h3 className="mt-5 text-lg font-bold text-slate-900 tracking-tight">
                      {adv.title}
                    </h3>
                    <p className="mt-2.5 text-sm text-slate-600 leading-relaxed">
                      {adv.desc}
                    </p>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-emerald-600 transition">
                      <span>Standard Al-Karim</span>
                      <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
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
        <section id="jenjang" className="py-16 md:py-24 bg-gradient-to-b from-slate-100/70 via-emerald-50/30 to-slate-50 border-t border-slate-200/60 relative">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            
            {/* Header Section */}
            <div className="mx-auto max-w-3xl text-center space-y-4 mb-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-3.5 py-1 text-xs font-bold text-emerald-800">
                <School className="h-3.5 w-3.5" />
                <span>KONSULTASI BERDASARKAN JENJANG</span>
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                {config.levelsTitle}
              </h2>
              <p className="text-base text-slate-600">
                {config.levelsSub || "Pilihlah jenjang pendidikan anak Anda untuk langsung memulai pengisian formulir kuesioner pemetaan potensi."}
              </p>
            </div>

            {/* Grid 3 Cards */}
            <div className="grid gap-8 md:grid-cols-3">
              {config.levels?.filter((l: any) => l.active !== false).map((level: any, idx: number) => {
                const cardGradients = [
                  { headerBg: "from-emerald-600 to-teal-700", iconBg: "bg-emerald-100 text-emerald-700", badgeBg: "bg-emerald-50 text-emerald-700 border-emerald-200" },
                  { headerBg: "from-sky-600 to-indigo-700", iconBg: "bg-sky-100 text-sky-700", badgeBg: "bg-sky-50 text-sky-700 border-sky-200" },
                  { headerBg: "from-purple-600 to-amber-600", iconBg: "bg-purple-100 text-purple-700", badgeBg: "bg-purple-50 text-purple-700 border-purple-200" }
                ];
                const grad = cardGradients[idx % cardGradients.length];

                return (
                  <Link
                    key={level.id}
                    to="/formulir/$jenjang"
                    params={{ jenjang: level.id }}
                    className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white shadow-md overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-emerald-400"
                    style={{ backgroundColor: config.colors?.card }}
                  >
                    <div>
                      {/* Card Header Gradient Banner */}
                      <div className={`h-24 bg-gradient-to-r ${grad.headerBg} p-6 relative flex items-center justify-between`}>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold border ${grad.badgeBg} shadow-xs`}>
                          {level.tag || level.name}
                        </span>
                        <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md grid place-items-center text-white">
                          <DynamicIcon name={level.icon} className="h-6 w-6" />
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="p-6 space-y-4 text-left">
                        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight group-hover:text-emerald-700 transition">
                          {level.name}
                        </h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                          {level.desc}
                        </p>

                        {/* Bullet Highlights */}
                        <ul className="space-y-2 pt-2 border-t border-slate-100 text-xs font-medium text-slate-700">
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>Pemetaan Gaya Belajar & Karakter</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>Analisis Objektif Kebutuhan Anak</span>
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>Rekomendasi Pendampingan Sekolah</span>
                          </li>
                        </ul>
                      </div>
                    </div>

                    {/* Card Footer Button */}
                    <div className="p-6 pt-0">
                      <div className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl btn-theme-primary text-sm font-bold shadow-sm transition group-hover:shadow-md">
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

      {/* 5. CARA KERJA (HOW IT WORKS STEP-BY-STEP) */}
      {config.showHowItWorks !== false && (
        <section id="carakerja" className="py-16 md:py-24 bg-white border-t border-slate-200/60 relative">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            
            <div className="mx-auto max-w-3xl text-center space-y-4 mb-14">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-3.5 py-1 text-xs font-bold text-emerald-800">
                <Zap className="h-3.5 w-3.5" />
                <span>PROSES SANGAT MUDAH</span>
              </div>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                {config.howItWorksTitle || "4 Langkah Mudah Konsultasi Pendidikan"}
              </h2>
              <p className="text-base text-slate-600">
                {config.howItWorksSub || "Proses efisien dan terstruktur untuk membantu Anda mendapatkan arahan pendidikan terbaik."}
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {config.howItWorksSteps?.map((item: any, idx: number) => {
                const colors = [
                  "from-emerald-500 to-teal-600",
                  "from-sky-500 to-blue-600",
                  "from-purple-500 to-indigo-600",
                  "from-amber-500 to-orange-600"
                ];
                return (
                  <div key={idx} className="relative flex flex-col items-start p-6 rounded-3xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center justify-between w-full mb-4">
                      <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                        LANGKAH {item.step || `0${idx+1}`}
                      </span>
                      <div className={`grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br ${colors[idx % colors.length]} text-white shadow-xs`}>
                        <DynamicIcon name={item.icon || "CheckCircle2"} className="h-5 w-5" />
                      </div>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
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
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 px-3.5 py-1 text-xs font-bold text-emerald-800">
                <HelpCircle className="h-3.5 w-3.5" />
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
                    <AccordionTrigger className="text-base font-bold text-slate-900 hover:text-emerald-700 text-left">
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
            className="rounded-3xl p-8 sm:p-12 text-center text-white relative overflow-hidden shadow-2xl bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-950"
            style={{ backgroundColor: config.ctaBg || undefined }}
          >
            {/* Background Decorative Rings */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-xl" />
            <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-amber-400/20 blur-xl" />

            <div className="relative z-10 space-y-6 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-4 py-1.5 text-xs font-bold text-emerald-100 border border-white/20">
                <Sparkles className="h-4 w-4 text-amber-300" />
                <span>MULAI LANGKAH AWAL SEKARANG</span>
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
                {config.ctaTitle}
              </h2>

              <p className="text-base md:text-lg text-emerald-100/90 max-w-2xl mx-auto leading-relaxed">
                {config.ctaDesc}
              </p>

              <div className="pt-4">
                <button
                  onClick={() => handleScroll(config.ctaBtnLink || "#jenjang")}
                  className="inline-flex h-14 items-center justify-center gap-2.5 rounded-2xl bg-white px-9 text-base font-extrabold text-emerald-950 shadow-xl transition-all hover:scale-105 active:scale-95 hover:bg-emerald-50"
                >
                  <span>{config.ctaBtn}</span>
                  <ArrowRight className="h-5 w-5 text-emerald-800" />
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
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-600 font-black text-white text-xl shadow-md">
                    {config.logoText?.charAt(0) || "E"}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xl font-black text-white leading-tight">{config.logoText}</span>
                    <span className="text-xs text-emerald-400 font-semibold">{config.footerSchool}</span>
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
                      className="grid h-9 w-9 place-items-center rounded-xl bg-slate-900 text-slate-300 border border-slate-800 hover:bg-emerald-600 hover:text-white transition"
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
                    <MapPin className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span className="text-slate-300">{config.footerAddress}</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
                    <a href={`https://wa.me/${config.footerWa}`} target="_blank" rel="noreferrer" className="text-slate-300 hover:text-emerald-400 transition font-medium">
                      {config.footerWa}
                    </a>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-emerald-500 shrink-0" />
                    <a href={`mailto:${config.footerEmail}`} className="text-slate-300 hover:text-emerald-400 transition font-medium">
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
