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
  Home as HomeIcon,
  Layers,
  History,
  User,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Globe
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  component: Home,
});

// Dynamic Icon Component
function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
  return <IconComponent className={className} />;
}

const DEFAULT_HOMEPAGE_CONFIG = {
  siteName: "Sekolah Alam Al-Karim",
  logoText: "EduKonsul",
  logoImg: "",
  btnLoginText: "Login Admin",
  
  // Section Visibility flags
  showHero: true,
  showAdvantages: true,
  showLevels: true,
  showCta: true,
  showFooter: true,
  
  heroBadge: "Konsultasi Pendidikan Anak",
  heroTitle: "Konsultasi & Rekomendasi Pendidikan Untuk Anak",
  heroDesc: "Bantu pahami potensi, karakter, dan kebutuhan belajar anak melalui konsultasi pendidikan yang didampingi Tim Konsultan Sekolah Alam Al-Karim.",
  heroImg: "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=800&q=80",
  heroBtn1: "Mulai Konsultasi",
  heroBtn1Link: "#jenjang",
  heroBtn2: "Pelajari Layanan",
  heroBtn2Link: "#keunggulan",
  
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
      title: "Analisis Cerdas",
      desc: "Didukung teknologi cerdas untuk membantu menganalisis jawaban orang tua secara cepat, sistematis, dan objektif sebelum ditinjau kembali oleh Tim Konsultan Sekolah Alam Al-Karim."
    },
    {
      icon: "UserCheck",
      title: "Dikaji Tim Konsultan",
      desc: "Seluruh hasil analisis ditinjau kembali oleh Tim Konsultan sehingga rekomendasi lebih tepat dan sesuai dengan kondisi anak."
    },
    {
      icon: "Sprout",
      title: "Rekomendasi Pendidikan",
      desc: "Prinsip pendidikan holistik yang disesuaikan dengan minat, gaya belajar, dan bakat alami anak."
    },
    {
      icon: "MessageSquare",
      title: "Konsultasi Gratis",
      desc: "Orang tua dapat berkonsultasi langsung dengan Tim Sekolah Alam Al-Karim melalui WhatsApp tanpa biaya."
    },
    {
      icon: "Lock",
      title: "Data Aman & Rahasia",
      desc: "Seluruh data konsultasi dijaga kerahasiaannya dan hanya digunakan untuk kebutuhan konsultasi pendidikan."
    }
  ],
  
  levelsTitle: "Pilih Jenjang Pendidikan",
  levels: [
    {
      id: "tksd",
      name: "TK & SD",
      tag: "TK / SD",
      desc: "Selamat datang di jenjang TK & SD! Konsultasikan kebutuhan tumbuh kembang anak usia dini untuk rekomendasi pendidikan terbaik.",
      icon: "School",
      btnText: "Mulai Konsultasi",
      active: true
    },
    {
      id: "smp",
      name: "SMP",
      tag: "SMP",
      desc: "Selamat datang di jenjang SMP! Petakan potensi, karakter, dan minat belajar remaja untuk sekolah menengah yang sesuai.",
      icon: "BookOpen",
      btnText: "Mulai Konsultasi",
      active: true
    },
    {
      id: "sma",
      name: "SMA",
      tag: "SMA",
      desc: "Selamat datang di jenjang SMA! Temukan pemetaan jurusan, kesiapan perkuliahan, dan arah karier masa depan anak secara optimal.",
      icon: "GraduationCap",
      btnText: "Mulai Konsultasi",
      active: true
    }
  ],
  
  ctaTitle: "Siap Menemukan Pendidikan Terbaik untuk Anak Anda?",
  ctaDesc: "Konsultasikan kebutuhan pendidikan anak bersama Tim Sekolah Alam Al-Karim.",
  ctaBtn: "Mulai Konsultasi Sekarang",
  ctaBtnLink: "#jenjang",
  ctaBg: "#047857",
  
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
    const element = document.getElementById(idStr.replace("#", ""));
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Open global history check modal
  const handleOpenHistoryModal = () => {
    setMobileMenuOpen(false);
    window.dispatchEvent(new Event("open-history-modal"));
  };

  return (
    <div className="min-h-screen bg-background font-sans" style={{ backgroundColor: config.colors?.background }}>
      {/* Inject Dynamic Colors */}
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
          background-color: ${config.colors?.button || '#047857'};
          color: #ffffff;
        }
        .btn-theme-primary:hover {
          opacity: 0.95;
        }
      `}</style>

      {/* 1. STICKY HEADER */}
      <header className="sticky top-0 z-30 border-b border-border/60 backdrop-blur" style={{ backgroundColor: config.colors?.header + 'f0' }}>
        <div className="mx-auto flex h-[70px] max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-3">
            {config.logoImg ? (
              <img src={config.logoImg} alt={config.siteName} className="h-10 w-auto rounded-lg" />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-xl btn-theme-primary font-extrabold shadow-md text-lg">
                {config.logoText ? config.logoText.charAt(0) : "E"}
              </div>
            )}
            <div className="flex flex-col text-left">
              <span className="text-base font-bold leading-tight tracking-tight text-slate-800">
                {config.logoText}
              </span>
              <span className="text-[10px] text-muted-foreground font-semibold">
                {config.siteName}
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-6 md:flex">
            {config.navItems?.map((item: any, idx: number) => (
              <button
                key={idx}
                onClick={() => {
                  if (item.link.startsWith("#")) {
                    handleScroll(item.link);
                  }
                }}
                className="text-sm font-semibold text-slate-600 transition hover:text-[var(--primary)]"
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={handleOpenHistoryModal}
              className="text-sm font-semibold text-slate-600 transition hover:text-[var(--primary)] flex items-center gap-1"
            >
              <History className="h-4 w-4" /> Riwayat
            </button>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="hidden h-10 items-center gap-2 rounded-full border border-border bg-card px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-[var(--primary)] hover:text-[var(--primary)] md:inline-flex"
            >
              <LogIn className="h-4 w-4" />
              <span>{config.btnLoginText}</span>
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="grid h-10 w-10 place-items-center rounded-lg border border-border bg-card text-slate-700 md:hidden active:scale-95 transition"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-border/60 bg-white p-5 space-y-4 md:hidden shadow-lg animate-in slide-in-from-top duration-200">
            {config.navItems?.map((item: any, idx: number) => (
              <button
                key={idx}
                onClick={() => {
                  if (item.link.startsWith("#")) {
                    handleScroll(item.link);
                  }
                }}
                className="block w-full text-left py-2 text-sm font-bold text-slate-700 hover:text-[var(--primary)]"
              >
                {item.label}
              </button>
            ))}
            <button
              onClick={handleOpenHistoryModal}
              className="w-full text-left py-2 text-sm font-bold text-slate-700 hover:text-[var(--primary)] flex items-center gap-2"
            >
              <History className="h-4.5 w-4.5 text-emerald-600" /> Riwayat Konsultasi
            </button>
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold text-slate-700 hover:bg-muted"
            >
              <LogIn className="h-4.5 w-4.5" />
              <span>{config.btnLoginText}</span>
            </Link>
          </div>
        )}
      </header>

      {/* 2. HERO SECTION */}
      {config.showHero !== false && (
        <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 bg-gradient-to-b from-emerald-50/50 via-white to-transparent animate-in fade-in duration-500">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-12 md:grid-cols-12 md:items-center">
              {/* Teks Hero */}
              <div className="text-left md:col-span-7 space-y-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                  {config.heroBadge}
                </span>
                <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl">
                  {config.heroTitle}
                </h1>
                <p className="text-[15px] leading-relaxed text-slate-600 sm:text-lg">
                  {config.heroDesc}
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    onClick={() => handleScroll(config.heroBtn1Link)}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full btn-theme-primary px-7 text-sm font-bold shadow-md transition hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {config.heroBtn1}
                    <ArrowRight className="h-4.5 w-4.5" />
                  </button>
                  <button
                    onClick={() => handleScroll(config.heroBtn2Link)}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-7 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {config.heroBtn2}
                  </button>
                </div>
              </div>

              {/* Gambar Hero */}
              <div className="relative md:col-span-5 flex justify-center">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full blur-3xl opacity-20 -z-10 animate-pulse" />
                <img
                  src={config.heroImg}
                  alt="Konsultasi Anak"
                  className="w-full max-w-[420px] rounded-3xl object-cover shadow-[0_20px_50px_-12px_rgba(4,120,87,0.25)] border-4 border-white"
                />
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. SECTION KEUNGGULAN */}
      {config.showAdvantages !== false && (
        <section id="keunggulan" className="py-16 md:py-24 border-t border-border/50 animate-in slide-in-from-bottom duration-500">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center space-y-4 mb-12 md:mb-16">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3.5xl">
                {config.advantagesTitle}
              </h2>
              <p className="text-[15px] leading-relaxed text-slate-500">
                {config.advantagesSub}
              </p>
            </div>

            {/* Desktop Advantage Grid 3x2, Mobile 2 Columns */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
              {config.advantages?.map((adv: any, idx: number) => (
                <div
                  key={idx}
                  className="group flex flex-col rounded-2xl border border-slate-200/80 p-5 bg-card text-left transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg"
                  style={{ backgroundColor: config.colors?.card }}
                >
                  <div className="grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600 transition-transform group-hover:scale-110">
                    <DynamicIcon name={adv.icon} className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 font-bold text-slate-800 text-sm sm:text-base">{adv.title}</h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-500 line-clamp-2 md:line-clamp-none">
                    {adv.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. PILIHAN JENJANG */}
      {config.showLevels !== false && (
        <section id="jenjang" className="py-16 md:py-24 bg-slate-50/50 border-t border-border/50 animate-in slide-in-from-bottom duration-550">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-3xl text-center space-y-3 mb-10 md:mb-14">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3.5xl">
                {config.levelsTitle}
              </h2>
              <p className="text-sm text-slate-500">Pilihlah jenjang pendidikan anak Anda untuk langsung memulai pengisian formulir kuesioner.</p>
            </div>

            {/* Grid Layout: Desktop 3 Card, Mobile 3 Columns */}
            <div className="grid grid-cols-3 gap-3 md:gap-6">
              {config.levels?.filter((l: any) => l.active !== false).map((level: any) => (
                <Link
                  key={level.id}
                  to="/formulir/$jenjang"
                  params={{ jenjang: level.id }}
                  className="group flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-card p-4 sm:p-6 text-left transition-all duration-300 hover:-translate-y-1.5 hover:border-emerald-300 hover:shadow-[0_15px_30px_-10px_rgba(4,120,87,0.15)]"
                  style={{ backgroundColor: config.colors?.card }}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="grid h-10 w-10 sm:h-12 sm:w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:scale-115 transition">
                        <DynamicIcon name={level.icon} className="h-5.5 w-5.5 sm:h-6 sm:w-6" />
                      </div>
                      <span className="hidden sm:inline-block rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-[10px] font-bold tracking-wider text-emerald-700 uppercase">
                        {level.tag}
                      </span>
                    </div>
                    <h3 className="mt-4 text-base sm:text-xl font-bold text-slate-800 tracking-tight">{level.name}</h3>
                    <p className="mt-2 text-[11px] sm:text-sm text-slate-500 leading-relaxed line-clamp-3 sm:line-clamp-none">
                      {level.desc}
                    </p>
                  </div>
                  <div className="mt-5 flex items-center justify-between text-xs sm:text-sm font-bold text-emerald-700 group-hover:text-emerald-800 pt-2 border-t border-slate-100">
                    <span>{level.btnText || "Mulai"}</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 5. CALL TO ACTION */}
      {config.showCta !== false && (
        <section className="mx-auto max-w-5xl px-4 py-8 md:py-12 animate-in duration-600">
          <div
            className="rounded-3xl p-8 md:p-12 text-center text-white relative overflow-hidden shadow-xl"
            style={{ backgroundColor: config.ctaBg }}
          >
            <div className="absolute inset-0 bg-black/10" />
            <div className="relative z-10 space-y-5 max-w-2xl mx-auto">
              <h2 className="text-2xl md:text-3.5xl font-extrabold leading-tight">{config.ctaTitle}</h2>
              <p className="text-[15px] md:text-base text-emerald-50/90 leading-relaxed">{config.ctaDesc}</p>
              <div className="pt-2">
                <button
                  onClick={() => handleScroll(config.ctaBtnLink)}
                  className="inline-flex h-12 items-center justify-center rounded-full bg-white px-8 text-sm font-extrabold text-emerald-900 shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                  {config.ctaBtn}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6. FOOTER */}
      {config.showFooter !== false && (
        <footer className="border-t border-border/60 bg-slate-900 text-slate-400 py-12 md:py-16" style={{ backgroundColor: config.colors?.footer }}>
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="grid gap-8 md:grid-cols-4">
              {/* Logo & School Name */}
              <div className="space-y-4 md:col-span-2">
                <div className="flex items-center gap-2.5">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-700 font-extrabold text-white text-base">
                    {config.logoText?.charAt(0)}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-base font-bold text-white leading-tight">{config.logoText}</span>
                    <span className="text-xs text-slate-400">{config.footerSchool}</span>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-slate-400 max-w-sm">
                  Membimbing langkah anak menuju masa depan gemilang dengan pemahaman utuh karakter, minat, dan potensi tumbuh kembang.
                </p>
              </div>

              {/* Hubungi Kami */}
              <div className="space-y-3 text-left">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Hubungi Kami</h4>
                <ul className="space-y-2.5 text-xs">
                  <li className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>{config.footerAddress}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-emerald-500 shrink-0" />
                    <a href={`https://wa.me/${config.footerWa}`} target="_blank" rel="noreferrer" className="hover:text-white transition">
                      {config.footerWa}
                    </a>
                  </li>
                  <li className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-emerald-500 shrink-0" />
                    <a href={`mailto:${config.footerEmail}`} className="hover:text-white transition">
                      {config.footerEmail}
                    </a>
                  </li>
                </ul>
              </div>

              {/* Tautan Resmi */}
              <div className="space-y-3 text-left">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">Sosial Media & Tautan</h4>
                <ul className="space-y-2 text-xs">
                  {config.socialLinks?.map((soc: any, idx: number) => (
                    <li key={idx}>
                      <a href={soc.url} target="_blank" rel="noreferrer" className="hover:text-white transition flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-emerald-500" />
                        {soc.platform}
                      </a>
                    </li>
                  ))}
                  <li>
                    <a href={`https://${config.footerWebsite}`} target="_blank" rel="noreferrer" className="hover:text-white transition flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-emerald-500" />
                      Website Sekolah
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <div className="mt-12 border-t border-slate-800 pt-6 text-center text-xs">
              <p>{config.footerCopyright}</p>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
