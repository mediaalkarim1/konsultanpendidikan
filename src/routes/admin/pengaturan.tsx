import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { 
  Save, 
  Loader2, 
  Globe, 
  School, 
  BookOpen, 
  GraduationCap, 
  Eye, 
  Sparkles, 
  FileText, 
  Layout,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Palette,
  Megaphone,
  Upload,
  Link as LinkIcon,
  HelpCircle,
  CheckCircle2,
  History,
  LogIn,
  Target,
  Zap,
  Award,
  Users,
  ShieldCheck,
  MessageSquare,
  EyeOff
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { saveHomepageSettingsAction } from "@/actions/admin-actions";
import { DEFAULT_HOMEPAGE_CONFIG } from "@/routes/index";

export const Route = createFileRoute("/admin/pengaturan")({
  component: PengaturanPage,
});

// Icon list options for select
const POPULAR_ICONS = [
  "Target", "Brain", "UserCheck", "Sprout", "MessageSquare", "Lock", 
  "School", "BookOpen", "GraduationCap", "Award", "ShieldCheck", 
  "Heart", "Activity", "FileText", "Users", "Phone", "Mail", "MapPin",
  "Zap", "Sparkles", "Globe", "CheckCircle2", "Star"
];

// Helper component to render icons
function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
  return <IconComponent className={className} />;
}

export function PengaturanPage() {
  const { userEmail } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("header-footer");
  const [previewOpen, setPreviewOpen] = useState(false);

  // Homepage CMS Form State
  const [homeForm, setHomeForm] = useState<typeof DEFAULT_HOMEPAGE_CONFIG>(DEFAULT_HOMEPAGE_CONFIG);

  useEffect(() => {
    loadHomeData();
  }, []);

  async function loadHomeData() {
    setLoading(true);
    try {
      const { data: homeSetting } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "site.homepage_config")
        .maybeSingle();

      if (homeSetting && homeSetting.value) {
        const val = homeSetting.value as any;
        setHomeForm({
          ...DEFAULT_HOMEPAGE_CONFIG,
          ...val,
          showHeader: val.showHeader !== undefined ? val.showHeader : DEFAULT_HOMEPAGE_CONFIG.showHeader,
          showHero: val.showHero !== undefined ? val.showHero : DEFAULT_HOMEPAGE_CONFIG.showHero,
          showHeroStats: val.showHeroStats !== undefined ? val.showHeroStats : DEFAULT_HOMEPAGE_CONFIG.showHeroStats,
          showAdvantages: val.showAdvantages !== undefined ? val.showAdvantages : DEFAULT_HOMEPAGE_CONFIG.showAdvantages,
          showLevels: val.showLevels !== undefined ? val.showLevels : DEFAULT_HOMEPAGE_CONFIG.showLevels,
          showHowItWorks: val.showHowItWorks !== undefined ? val.showHowItWorks : DEFAULT_HOMEPAGE_CONFIG.showHowItWorks,
          showFaq: val.showFaq !== undefined ? val.showFaq : DEFAULT_HOMEPAGE_CONFIG.showFaq,
          showCta: val.showCta !== undefined ? val.showCta : DEFAULT_HOMEPAGE_CONFIG.showCta,
          showFooter: val.showFooter !== undefined ? val.showFooter : DEFAULT_HOMEPAGE_CONFIG.showFooter,
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
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat pengaturan Homepage");
    } finally {
      setLoading(false);
    }
  }

  // Handle Base64 Image Upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1500000) {
      toast.error("File terlalu besar. Maksimum ukuran file gambar adalah 1.5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setHomeForm((prev) => ({
        ...prev,
        [fieldName]: reader.result as string
      }));
      toast.success("Gambar berhasil dimuat!");
    };
    reader.readAsDataURL(file);
  };

  // Reorder Item in Array helper
  const moveItem = (index: number, direction: "up" | "down", listName: keyof typeof DEFAULT_HOMEPAGE_CONFIG) => {
    const arr = [...(homeForm[listName] as any[])];
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === arr.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const temp = arr[index];
    arr[index] = arr[targetIndex];
    arr[targetIndex] = temp;

    setHomeForm((prev) => ({
      ...prev,
      [listName]: arr
    }));
  };

  // Toggle Visibility Helper Component
  const VisibilityToggleBanner = ({ 
    flagKey, 
    label 
  }: { 
    flagKey: keyof typeof DEFAULT_HOMEPAGE_CONFIG; 
    label: string 
  }) => {
    const isVisible = homeForm[flagKey] !== false;
    return (
      <div className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${isVisible ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900' : 'bg-slate-100/80 border-slate-200 text-slate-600'}`}>
        <div className="flex items-center gap-2.5">
          {isVisible ? (
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <Eye className="h-4 w-4" />
            </div>
          ) : (
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-slate-400 text-white">
              <EyeOff className="h-4 w-4" />
            </div>
          )}
          <div>
            <p className="text-xs font-bold">{label}</p>
            <p className="text-[11px] opacity-80">
              {isVisible ? "Status: TAMPIL di Homepage" : "Status: DISEMBUYIKAN (Tidak tampil di Homepage)"}
            </p>
          </div>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isVisible}
            onChange={(e) => setHomeForm({ ...homeForm, [flagKey]: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600" />
        </label>
      </div>
    );
  };

  // Save changes
  const handleSaveHomepage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    try {
      const res = await saveHomepageSettingsAction({
        data: {
          config: homeForm,
          email: userEmail || "admin"
        }
      });

      if (res.success) {
        toast.success("Tampilan & Konten Homepage berhasil disimpan dan dipublikasikan!");
      } else {
        toast.error("Gagal menyimpan: " + (res.error || "Error server"));
      }
    } catch (err: any) {
      toast.error("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header Title */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand flex items-center gap-2">
            <Layout className="h-6 w-6 text-brand" /> Pengaturan CMS Homepage
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola konten, susunan menu, warna branding, serta status tampil/sembunyi setiap section homepage.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setPreviewOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition cursor-pointer"
          >
            <Eye className="h-4 w-4 text-brand" />
            Preview Draft
          </button>
          
          <button
            onClick={() => handleSaveHomepage()}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg btn-theme-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 shadow-sm cursor-pointer"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Perubahan
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-border overflow-x-auto scrollbar-none gap-2">
        <button
          onClick={() => setActiveTab("header-footer")}
          className={`whitespace-nowrap px-4 py-2 text-sm font-bold border-b-2 transition cursor-pointer ${activeTab === "header-footer" ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Header, Navigasi, Footer & Tema
        </button>
        <button
          onClick={() => setActiveTab("hero-banner")}
          className={`whitespace-nowrap px-4 py-2 text-sm font-bold border-b-2 transition cursor-pointer ${activeTab === "hero-banner" ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Hero Banner, Stats & CTA
        </button>
        <button
          onClick={() => setActiveTab("advantages")}
          className={`whitespace-nowrap px-4 py-2 text-sm font-bold border-b-2 transition cursor-pointer ${activeTab === "advantages" ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Daftar Keunggulan
        </button>
        <button
          onClick={() => setActiveTab("levels")}
          className={`whitespace-nowrap px-4 py-2 text-sm font-bold border-b-2 transition cursor-pointer ${activeTab === "levels" ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Jenjang Pendidikan
        </button>
        <button
          onClick={() => setActiveTab("how-faq")}
          className={`whitespace-nowrap px-4 py-2 text-sm font-bold border-b-2 transition cursor-pointer ${activeTab === "how-faq" ? "border-brand text-brand" : "border-transparent text-muted-foreground hover:text-foreground"}`}
        >
          Cara Kerja & FAQ
        </button>
      </div>

      {/* Tabs Content */}
      <div className="space-y-6">
        
        {/* TAB 1: HEADER, FOOTER & COLORS */}
        {activeTab === "header-footer" && (
          <div className="space-y-6">
            
            {/* Master Kontrol Visibilitas 9 Section Homepage */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-brand flex items-center gap-2 border-b pb-2">
                <Layout className="h-5 w-5" /> 1. Kontrol Visibilitas Seluruh Section Homepage
              </h2>
              <p className="text-xs text-slate-500">
                Aktifkan atau nonaktifkan tampilan bagian mana saja yang ingin dimunculkan di halaman utama (Homepage).
              </p>
              
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <VisibilityToggleBanner flagKey="showHeader" label="1. Header Navigasi Top Bar" />
                <VisibilityToggleBanner flagKey="showHero" label="2. Banner Hero Utama" />
                <VisibilityToggleBanner flagKey="showHeroStats" label="3. Strip Metrik / Stat Hero" />
                <VisibilityToggleBanner flagKey="showAdvantages" label="4. Section Keunggulan" />
                <VisibilityToggleBanner flagKey="showLevels" label="5. Section Pilihan Jenjang" />
                <VisibilityToggleBanner flagKey="showHowItWorks" label="6. Section Cara Kerja (4 Steps)" />
                <VisibilityToggleBanner flagKey="showFaq" label="7. Section FAQ (Pertanyaan)" />
                <VisibilityToggleBanner flagKey="showCta" label="8. Banner Call To Action (CTA)" />
                <VisibilityToggleBanner flagKey="showFooter" label="9. Footer & Kontak" />
              </div>
            </div>

            {/* Tema Warna */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-brand flex items-center gap-2 border-b pb-2">
                <Palette className="h-5 w-5" /> 2. Skema & Tema Warna Website
              </h2>
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Warna Primer</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={homeForm.colors?.primary}
                      onChange={(e) => setHomeForm({ ...homeForm, colors: { ...homeForm.colors, primary: e.target.value } })}
                      className="h-9 w-9 rounded cursor-pointer border"
                    />
                    <input
                      type="text"
                      value={homeForm.colors?.primary}
                      onChange={(e) => setHomeForm({ ...homeForm, colors: { ...homeForm.colors, primary: e.target.value } })}
                      className="flex-1 rounded border px-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Warna Sekunder</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={homeForm.colors?.secondary}
                      onChange={(e) => setHomeForm({ ...homeForm, colors: { ...homeForm.colors, secondary: e.target.value } })}
                      className="h-9 w-9 rounded cursor-pointer border"
                    />
                    <input
                      type="text"
                      value={homeForm.colors?.secondary}
                      onChange={(e) => setHomeForm({ ...homeForm, colors: { ...homeForm.colors, secondary: e.target.value } })}
                      className="flex-1 rounded border px-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Warna Tombol</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={homeForm.colors?.button}
                      onChange={(e) => setHomeForm({ ...homeForm, colors: { ...homeForm.colors, button: e.target.value } })}
                      className="h-9 w-9 rounded cursor-pointer border"
                    />
                    <input
                      type="text"
                      value={homeForm.colors?.button}
                      onChange={(e) => setHomeForm({ ...homeForm, colors: { ...homeForm.colors, button: e.target.value } })}
                      className="flex-1 rounded border px-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Warna Background</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={homeForm.colors?.background}
                      onChange={(e) => setHomeForm({ ...homeForm, colors: { ...homeForm.colors, background: e.target.value } })}
                      className="h-9 w-9 rounded cursor-pointer border"
                    />
                    <input
                      type="text"
                      value={homeForm.colors?.background}
                      onChange={(e) => setHomeForm({ ...homeForm, colors: { ...homeForm.colors, background: e.target.value } })}
                      className="flex-1 rounded border px-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Warna Background Header</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={homeForm.colors?.header || "#ffffff"}
                      onChange={(e) => setHomeForm({ ...homeForm, colors: { ...homeForm.colors, header: e.target.value } })}
                      className="h-9 w-9 rounded cursor-pointer border"
                    />
                    <input
                      type="text"
                      value={homeForm.colors?.header || "#ffffff"}
                      onChange={(e) => setHomeForm({ ...homeForm, colors: { ...homeForm.colors, header: e.target.value } })}
                      className="flex-1 rounded border px-2 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Warna Background Footer</label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={homeForm.colors?.footer || "#0f172a"}
                      onChange={(e) => setHomeForm({ ...homeForm, colors: { ...homeForm.colors, footer: e.target.value } })}
                      className="h-9 w-9 rounded cursor-pointer border"
                    />
                    <input
                      type="text"
                      value={homeForm.colors?.footer || "#0f172a"}
                      onChange={(e) => setHomeForm({ ...homeForm, colors: { ...homeForm.colors, footer: e.target.value } })}
                      className="flex-1 rounded border px-2 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Header CMS & Menu Links */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-base font-bold text-brand flex items-center gap-2">
                  <Globe className="h-5 w-5" /> 3. Tampilan Header & Menu Navigasi
                </h2>
                <VisibilityToggleBanner flagKey="showHeader" label="Header Navigasi" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Nama Website / Brand Logo
                  </label>
                  <input
                    type="text"
                    value={homeForm.logoText}
                    onChange={(e) => setHomeForm({ ...homeForm, logoText: e.target.value })}
                    className="w-full rounded-lg border p-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand/40"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Teks Tombol Login Admin
                  </label>
                  <input
                    type="text"
                    value={homeForm.btnLoginText}
                    onChange={(e) => setHomeForm({ ...homeForm, btnLoginText: e.target.value })}
                    className="w-full rounded-lg border p-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-brand/40"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Upload Logo Brand (Image file)
                  </label>
                  <div className="flex items-center gap-4 border border-dashed rounded-lg p-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "logoImg")}
                      className="text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-brand/10 file:text-brand hover:file:bg-brand/20 cursor-pointer"
                    />
                    {homeForm.logoImg && (
                      <img src={homeForm.logoImg} alt="Preview Logo" className="h-10 w-auto rounded object-contain border" />
                    )}
                  </div>
                </div>
              </div>

              {/* Menu Navigasi Header Manager */}
              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-brand">Menu Navigasi Top Header</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...(homeForm.navItems || [])];
                      updated.push({ label: "Menu Baru", link: "#section" });
                      setHomeForm({ ...homeForm, navItems: updated });
                    }}
                    className="inline-flex items-center gap-1 rounded bg-brand/10 hover:bg-brand/20 px-3 py-1.5 text-xs font-bold text-brand transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Tambah Menu Navigasi
                  </button>
                </div>

                <div className="space-y-2">
                  {homeForm.navItems?.map((nav: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 border p-2 rounded-lg bg-slate-50">
                      <input
                        type="text"
                        placeholder="Label Menu"
                        value={nav.label}
                        onChange={(e) => {
                          const updated = [...(homeForm.navItems || [])];
                          updated[idx].label = e.target.value;
                          setHomeForm({ ...homeForm, navItems: updated });
                        }}
                        className="flex-1 rounded border p-1.5 text-xs font-bold"
                      />
                      <input
                        type="text"
                        placeholder="Link / #section"
                        value={nav.link}
                        onChange={(e) => {
                          const updated = [...(homeForm.navItems || [])];
                          updated[idx].link = e.target.value;
                          setHomeForm({ ...homeForm, navItems: updated });
                        }}
                        className="flex-1 rounded border p-1.5 text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => moveItem(idx, "up", "navItems")}
                        className="p-1 rounded hover:bg-slate-200 text-slate-500"
                        title="Atas"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(idx, "down", "navItems")}
                        className="p-1 rounded hover:bg-slate-200 text-slate-500"
                        title="Bawah"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = homeForm.navItems?.filter((_, i) => i !== idx);
                          setHomeForm({ ...homeForm, navItems: updated });
                        }}
                        className="p-1 rounded hover:bg-red-50 text-red-500"
                        title="Hapus"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer & Social Media CMS */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-base font-bold text-brand flex items-center gap-2">
                  <FileText className="h-5 w-5" /> 4. Tampilan Footer, Kontak & Sosial Media
                </h2>
                <VisibilityToggleBanner flagKey="showFooter" label="Footer & Kontak" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Nama Sekolah / Instansi
                  </label>
                  <input
                    type="text"
                    value={homeForm.footerSchool}
                    onChange={(e) => setHomeForm({ ...homeForm, footerSchool: e.target.value })}
                    className="w-full rounded-lg border p-2.5 text-sm outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    WhatsApp Official
                  </label>
                  <input
                    type="text"
                    value={homeForm.footerWa}
                    onChange={(e) => setHomeForm({ ...homeForm, footerWa: e.target.value })}
                    className="w-full rounded-lg border p-2.5 text-sm outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Email Official
                  </label>
                  <input
                    type="email"
                    value={homeForm.footerEmail}
                    onChange={(e) => setHomeForm({ ...homeForm, footerEmail: e.target.value })}
                    className="w-full rounded-lg border p-2.5 text-sm outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Alamat Lengkap
                  </label>
                  <input
                    type="text"
                    value={homeForm.footerAddress}
                    onChange={(e) => setHomeForm({ ...homeForm, footerAddress: e.target.value })}
                    className="w-full rounded-lg border p-2.5 text-sm outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Domain Website Resmi
                  </label>
                  <input
                    type="text"
                    value={homeForm.footerWebsite}
                    onChange={(e) => setHomeForm({ ...homeForm, footerWebsite: e.target.value })}
                    className="w-full rounded-lg border p-2.5 text-sm outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Teks Hak Cipta (Copyright)
                  </label>
                  <input
                    type="text"
                    value={homeForm.footerCopyright}
                    onChange={(e) => setHomeForm({ ...homeForm, footerCopyright: e.target.value })}
                    className="w-full rounded-lg border p-2.5 text-sm outline-none"
                    required
                  />
                </div>
              </div>

              {/* Social Media Links Manager */}
              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-brand">Link Media Sosial Footer</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...(homeForm.socialLinks || [])];
                      updated.push({ platform: "Instagram", url: "https://instagram.com" });
                      setHomeForm({ ...homeForm, socialLinks: updated });
                    }}
                    className="inline-flex items-center gap-1 rounded bg-brand/10 hover:bg-brand/20 px-3 py-1.5 text-xs font-bold text-brand transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Tambah Media Sosial
                  </button>
                </div>

                <div className="space-y-2">
                  {homeForm.socialLinks?.map((soc: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 border p-2 rounded-lg bg-slate-50">
                      <input
                        type="text"
                        placeholder="Platform (Instagram, FB)"
                        value={soc.platform}
                        onChange={(e) => {
                          const updated = [...(homeForm.socialLinks || [])];
                          updated[idx].platform = e.target.value;
                          setHomeForm({ ...homeForm, socialLinks: updated });
                        }}
                        className="w-1/3 rounded border p-1.5 text-xs font-bold"
                      />
                      <input
                        type="text"
                        placeholder="URL https://..."
                        value={soc.url}
                        onChange={(e) => {
                          const updated = [...(homeForm.socialLinks || [])];
                          updated[idx].url = e.target.value;
                          setHomeForm({ ...homeForm, socialLinks: updated });
                        }}
                        className="flex-1 rounded border p-1.5 text-xs font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = homeForm.socialLinks?.filter((_, i) => i !== idx);
                          setHomeForm({ ...homeForm, socialLinks: updated });
                        }}
                        className="p-1 rounded hover:bg-red-50 text-red-500"
                        title="Hapus"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: HERO BANNER, STATS & CTA */}
        {activeTab === "hero-banner" && (
          <div className="space-y-6">
            
            {/* Hero Section */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-base font-bold text-brand flex items-center gap-2">
                  <Sparkles className="h-5 w-5" /> 1. Hero Banner Utama
                </h2>
                <VisibilityToggleBanner flagKey="showHero" label="Banner Hero" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Teks Lencana Atas (Hero Badge)
                  </label>
                  <input
                    type="text"
                    value={homeForm.heroBadge}
                    onChange={(e) => setHomeForm({ ...homeForm, heroBadge: e.target.value })}
                    className="w-full rounded-lg border p-2.5 text-sm outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Link / Source Gambar Banner Hero
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={homeForm.heroImg}
                      onChange={(e) => setHomeForm({ ...homeForm, heroImg: e.target.value })}
                      className="flex-1 rounded-lg border p-2.5 text-sm outline-none"
                      placeholder="https://..."
                    />
                    <label className="h-10 px-3 flex items-center gap-1 bg-brand/10 hover:bg-brand/20 text-brand text-xs font-bold rounded-lg cursor-pointer transition">
                      <Upload className="h-4 w-4" /> Upload
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, "heroImg")}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Judul Utama Banner (Hero Title)
                  </label>
                  <input
                    type="text"
                    value={homeForm.heroTitle}
                    onChange={(e) => setHomeForm({ ...homeForm, heroTitle: e.target.value })}
                    className="w-full rounded-lg border p-2.5 text-sm font-bold text-foreground outline-none"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Deskripsi Banner (Hero Description)
                  </label>
                  <textarea
                    value={homeForm.heroDesc}
                    onChange={(e) => setHomeForm({ ...homeForm, heroDesc: e.target.value })}
                    rows={3}
                    className="w-full rounded-lg border p-2.5 text-sm outline-none"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Tombol Utama Hero Banner (Hero Button 1)
                  </label>
                  <input
                    type="text"
                    value={homeForm.heroBtn1}
                    onChange={(e) => setHomeForm({ ...homeForm, heroBtn1: e.target.value })}
                    className="w-full rounded-lg border p-2.5 text-sm outline-none"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Link Tujuan Tombol Utama (Hero Button 1 Link)
                  </label>
                  <input
                    type="text"
                    value={homeForm.heroBtn1Link}
                    onChange={(e) => setHomeForm({ ...homeForm, heroBtn1Link: e.target.value })}
                    className="w-full rounded-lg border p-2.5 text-sm outline-none"
                    required
                  />
                </div>
              </div>

              {/* Hero Stats Strip Manager */}
              <div className="pt-4 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-brand">Item Statistik di Bawah Hero Banner</span>
                  <VisibilityToggleBanner flagKey="showHeroStats" label="Strip Metrik Hero" />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 pt-2">
                  {homeForm.heroStats?.map((stat: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 border p-2.5 rounded-lg bg-slate-50">
                      <select
                        value={stat.icon}
                        onChange={(e) => {
                          const updated = [...(homeForm.heroStats || [])];
                          updated[idx].icon = e.target.value;
                          setHomeForm({ ...homeForm, heroStats: updated });
                        }}
                        className="rounded border p-1.5 text-xs font-semibold text-slate-700"
                      >
                        {POPULAR_ICONS.map(ic => (
                          <option key={ic} value={ic}>{ic}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Nilai (e.g. 1.000+)"
                        value={stat.value}
                        onChange={(e) => {
                          const updated = [...(homeForm.heroStats || [])];
                          updated[idx].value = e.target.value;
                          setHomeForm({ ...homeForm, heroStats: updated });
                        }}
                        className="w-1/3 rounded border p-1.5 text-xs font-bold"
                      />
                      <input
                        type="text"
                        placeholder="Label Keterangan"
                        value={stat.label}
                        onChange={(e) => {
                          const updated = [...(homeForm.heroStats || [])];
                          updated[idx].label = e.target.value;
                          setHomeForm({ ...homeForm, heroStats: updated });
                        }}
                        className="flex-1 rounded border p-1.5 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = homeForm.heroStats?.filter((_, i) => i !== idx);
                          setHomeForm({ ...homeForm, heroStats: updated });
                        }}
                        className="p-1 rounded hover:bg-red-50 text-red-500"
                        title="Hapus"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Call To Action */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-base font-bold text-brand flex items-center gap-2">
                  <Megaphone className="h-5 w-5" /> 2. Call To Action (Banner Bawah)
                </h2>
                <VisibilityToggleBanner flagKey="showCta" label="Banner CTA" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Judul Banner CTA
                  </label>
                  <input
                    type="text"
                    value={homeForm.ctaTitle}
                    onChange={(e) => setHomeForm({ ...homeForm, ctaTitle: e.target.value })}
                    className="w-full rounded-lg border p-2.5 text-sm font-bold outline-none"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Teks Paragraf CTA
                  </label>
                  <textarea
                    value={homeForm.ctaDesc}
                    onChange={(e) => setHomeForm({ ...homeForm, ctaDesc: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border p-2.5 text-sm outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Label Tombol CTA
                  </label>
                  <input
                    type="text"
                    value={homeForm.ctaBtn}
                    onChange={(e) => setHomeForm({ ...homeForm, ctaBtn: e.target.value })}
                    className="w-full rounded-lg border p-2.5 text-sm outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Link Tujuan Tombol CTA
                  </label>
                  <input
                    type="text"
                    value={homeForm.ctaBtnLink}
                    onChange={(e) => setHomeForm({ ...homeForm, ctaBtnLink: e.target.value })}
                    className="w-full rounded-lg border p-2.5 text-sm outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Warna Background Banner CTA (Hex Color)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={homeForm.ctaBg}
                      onChange={(e) => setHomeForm({ ...homeForm, ctaBg: e.target.value })}
                      className="h-9 w-9 rounded cursor-pointer border"
                    />
                    <input
                      type="text"
                      value={homeForm.ctaBg}
                      onChange={(e) => setHomeForm({ ...homeForm, ctaBg: e.target.value })}
                      className="flex-1 rounded border px-2 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DAFTAR KEUNGGULAN */}
        {activeTab === "advantages" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-base font-bold text-brand flex items-center gap-2">
                  <Target className="h-5 w-5" /> Kelola Keunggulan Konsultasi
                </h2>
                <VisibilityToggleBanner flagKey="showAdvantages" label="Section Keunggulan" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Judul Utama Section Keunggulan
                  </label>
                  <input
                    type="text"
                    value={homeForm.advantagesTitle}
                    onChange={(e) => setHomeForm({ ...homeForm, advantagesTitle: e.target.value })}
                    className="w-full rounded-lg border p-2.5 text-sm font-bold text-foreground outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Subjudul Deskripsi Section Keunggulan
                  </label>
                  <input
                    type="text"
                    value={homeForm.advantagesSub}
                    onChange={(e) => setHomeForm({ ...homeForm, advantagesSub: e.target.value })}
                    className="w-full rounded-lg border p-2.5 text-sm text-foreground outline-none"
                    required
                  />
                </div>
              </div>

              {/* Item Manager */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm font-bold text-brand">Item Keunggulan ({homeForm.advantages?.length || 0})</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...(homeForm.advantages || [])];
                      updated.push({ icon: "Award", title: "Keunggulan Baru", desc: "Tuliskan deskripsi keunggulan di sini secara detail." });
                      setHomeForm({ ...homeForm, advantages: updated });
                      toast.success("Keunggulan baru ditambahkan!");
                    }}
                    className="inline-flex items-center gap-1 rounded bg-brand/10 hover:bg-brand/20 px-3 py-1.5 text-xs font-bold text-brand transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Tambah Keunggulan
                  </button>
                </div>

                <div className="space-y-3">
                  {homeForm.advantages?.map((adv, idx) => (
                    <div key={idx} className="rounded-xl border p-4 bg-muted/10 space-y-3 relative group">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                        <span className="text-xs font-bold text-slate-500">Keunggulan #{idx + 1}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveItem(idx, "up", "advantages")}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500"
                            title="Pindahkan Ke Atas"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem(idx, "down", "advantages")}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500"
                            title="Pindahkan Ke Bawah"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = homeForm.advantages?.filter((_, i) => i !== idx);
                              setHomeForm({ ...homeForm, advantages: updated });
                              toast.info("Keunggulan berhasil dihapus.");
                            }}
                            className="p-1 rounded hover:bg-red-50 text-red-500"
                            title="Hapus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Pilih Icon Lucide</label>
                          <select
                            value={adv.icon}
                            onChange={(e) => {
                              const updated = [...(homeForm.advantages || [])];
                              updated[idx].icon = e.target.value;
                              setHomeForm({ ...homeForm, advantages: updated });
                            }}
                            className="w-full rounded border p-2 text-xs font-semibold text-slate-700"
                          >
                            {POPULAR_ICONS.map(ic => (
                              <option key={ic} value={ic}>{ic}</option>
                            ))}
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Judul Keunggulan</label>
                          <input
                            type="text"
                            value={adv.title}
                            onChange={(e) => {
                              const updated = [...(homeForm.advantages || [])];
                              updated[idx].title = e.target.value;
                              setHomeForm({ ...homeForm, advantages: updated });
                            }}
                            className="w-full rounded border p-2 text-xs font-bold"
                            required
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Deskripsi Singkat Keunggulan</label>
                          <textarea
                            value={adv.desc}
                            onChange={(e) => {
                              const updated = [...(homeForm.advantages || [])];
                              updated[idx].desc = e.target.value;
                              setHomeForm({ ...homeForm, advantages: updated });
                            }}
                            rows={2}
                            className="w-full rounded border p-2 text-xs"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: JENJANG PENDIDIKAN */}
        {activeTab === "levels" && (
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-base font-bold text-brand flex items-center gap-2">
                  <School className="h-5 w-5" /> Kelola Pilihan Jenjang Pendidikan
                </h2>
                <VisibilityToggleBanner flagKey="showLevels" label="Section Jenjang" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Judul Section Jenjang
                  </label>
                  <input
                    type="text"
                    value={homeForm.levelsTitle}
                    onChange={(e) => setHomeForm({ ...homeForm, levelsTitle: e.target.value })}
                    className="w-full rounded-lg border p-2.5 text-sm font-bold text-foreground outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Subjudul Deskripsi Section Jenjang
                  </label>
                  <input
                    type="text"
                    value={homeForm.levelsSub || ""}
                    onChange={(e) => setHomeForm({ ...homeForm, levelsSub: e.target.value })}
                    className="w-full rounded-lg border p-2.5 text-sm text-foreground outline-none"
                  />
                </div>
              </div>

              {/* Item Manager */}
              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm font-bold text-brand">Kartu Jenjang ({homeForm.levels?.length || 0})</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...(homeForm.levels || [])];
                      updated.push({
                        id: `level-${Date.now()}`,
                        name: "Jenjang Baru",
                        tag: "TAG",
                        desc: "Deskripsi kartu jenjang baru.",
                        icon: "School",
                        btnText: "Mulai Konsultasi",
                        active: true
                      });
                      setHomeForm({ ...homeForm, levels: updated });
                      toast.success("Jenjang baru ditambahkan!");
                    }}
                    className="inline-flex items-center gap-1 rounded bg-brand/10 hover:bg-brand/20 px-3 py-1.5 text-xs font-bold text-brand transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Tambah Jenjang Baru
                  </button>
                </div>

                <div className="space-y-3">
                  {homeForm.levels?.map((lvl: any, idx: number) => (
                    <div key={lvl.id || idx} className="rounded-xl border p-4 bg-muted/10 space-y-3 relative group">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500">Jenjang #{idx + 1}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${lvl.active !== false ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500"}`}>
                            {lvl.active !== false ? "Aktif" : "Non-aktif"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...(homeForm.levels || [])];
                              updated[idx].active = lvl.active === false ? true : false;
                              setHomeForm({ ...homeForm, levels: updated });
                            }}
                            className={`px-2 py-0.5 text-[10px] font-bold rounded ${lvl.active !== false ? "bg-slate-200 hover:bg-slate-300 text-slate-700" : "bg-green-600 hover:bg-green-700 text-white"}`}
                          >
                            {lvl.active !== false ? "Nonaktifkan" : "Aktifkan"}
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem(idx, "up", "levels")}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500"
                            title="Pindahkan Ke Atas"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem(idx, "down", "levels")}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500"
                            title="Pindahkan Ke Bawah"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = homeForm.levels?.filter((_, i) => i !== idx);
                              setHomeForm({ ...homeForm, levels: updated });
                              toast.info("Jenjang berhasil dihapus.");
                            }}
                            className="p-1 rounded hover:bg-red-50 text-red-500"
                            title="Hapus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Kode ID Jenjang (tanpa spasi)</label>
                          <input
                            type="text"
                            value={lvl.id}
                            onChange={(e) => {
                              const updated = [...(homeForm.levels || [])];
                              updated[idx].id = e.target.value;
                              setHomeForm({ ...homeForm, levels: updated });
                            }}
                            className="w-full rounded border p-2 text-xs font-mono"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Nama Jenjang</label>
                          <input
                            type="text"
                            value={lvl.name}
                            onChange={(e) => {
                              const updated = [...(homeForm.levels || [])];
                              updated[idx].name = e.target.value;
                              setHomeForm({ ...homeForm, levels: updated });
                            }}
                            className="w-full rounded border p-2 text-xs font-bold"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Label Tag Kategori</label>
                          <input
                            type="text"
                            value={lvl.tag}
                            onChange={(e) => {
                              const updated = [...(homeForm.levels || [])];
                              updated[idx].tag = e.target.value;
                              setHomeForm({ ...homeForm, levels: updated });
                            }}
                            className="w-full rounded border p-2 text-xs font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Pilih Icon Lucide</label>
                          <select
                            value={lvl.icon}
                            onChange={(e) => {
                              const updated = [...(homeForm.levels || [])];
                              updated[idx].icon = e.target.value;
                              setHomeForm({ ...homeForm, levels: updated });
                            }}
                            className="w-full rounded border p-2 text-xs font-semibold text-slate-700"
                          >
                            {POPULAR_ICONS.map(ic => (
                              <option key={ic} value={ic}>{ic}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Label Tombol</label>
                          <input
                            type="text"
                            value={lvl.btnText}
                            onChange={(e) => {
                              const updated = [...(homeForm.levels || [])];
                              updated[idx].btnText = e.target.value;
                              setHomeForm({ ...homeForm, levels: updated });
                            }}
                            className="w-full rounded border p-2 text-xs font-bold"
                            required
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Deskripsi Singkat Jenjang</label>
                          <textarea
                            value={lvl.desc}
                            onChange={(e) => {
                              const updated = [...(homeForm.levels || [])];
                              updated[idx].desc = e.target.value;
                              setHomeForm({ ...homeForm, levels: updated });
                            }}
                            rows={2}
                            className="w-full rounded border p-2 text-xs"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CARA KERJA & FAQ */}
        {activeTab === "how-faq" && (
          <div className="space-y-6">
            
            {/* Cara Kerja CMS */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-base font-bold text-brand flex items-center gap-2">
                  <Zap className="h-5 w-5" /> 1. Section Cara Kerja (4 Steps Pipeline)
                </h2>
                <VisibilityToggleBanner flagKey="showHowItWorks" label="Section Cara Kerja" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Judul Section Cara Kerja
                  </label>
                  <input
                    type="text"
                    value={homeForm.howItWorksTitle || ""}
                    onChange={(e) => setHomeForm({ ...homeForm, howItWorksTitle: e.target.value })}
                    className="w-full rounded-lg border p-2.5 text-sm font-bold outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Subjudul Deskripsi Cara Kerja
                  </label>
                  <input
                    type="text"
                    value={homeForm.howItWorksSub || ""}
                    onChange={(e) => setHomeForm({ ...homeForm, howItWorksSub: e.target.value })}
                    className="w-full rounded-lg border p-2.5 text-sm outline-none"
                    required
                  />
                </div>
              </div>

              {/* Steps Manager */}
              <div className="space-y-3 pt-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm font-bold text-brand">Langkah Cara Kerja ({homeForm.howItWorksSteps?.length || 0})</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...(homeForm.howItWorksSteps || [])];
                      updated.push({
                        step: `0${updated.length + 1}`,
                        title: "Langkah Baru",
                        desc: "Deskripsi singkat langkah kerja.",
                        icon: "CheckCircle2"
                      });
                      setHomeForm({ ...homeForm, howItWorksSteps: updated });
                    }}
                    className="inline-flex items-center gap-1 rounded bg-brand/10 hover:bg-brand/20 px-3 py-1.5 text-xs font-bold text-brand transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Tambah Langkah
                  </button>
                </div>

                <div className="space-y-3">
                  {homeForm.howItWorksSteps?.map((step: any, idx: number) => (
                    <div key={idx} className="rounded-xl border p-4 bg-muted/10 space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-xs font-bold text-slate-500">Langkah #{idx + 1}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveItem(idx, "up", "howItWorksSteps")}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem(idx, "down", "howItWorksSteps")}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = homeForm.howItWorksSteps?.filter((_, i) => i !== idx);
                              setHomeForm({ ...homeForm, howItWorksSteps: updated });
                            }}
                            className="p-1 rounded hover:bg-red-50 text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Nomor Step (e.g. 01)</label>
                          <input
                            type="text"
                            value={step.step}
                            onChange={(e) => {
                              const updated = [...(homeForm.howItWorksSteps || [])];
                              updated[idx].step = e.target.value;
                              setHomeForm({ ...homeForm, howItWorksSteps: updated });
                            }}
                            className="w-full rounded border p-2 text-xs font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Pilih Icon</label>
                          <select
                            value={step.icon}
                            onChange={(e) => {
                              const updated = [...(homeForm.howItWorksSteps || [])];
                              updated[idx].icon = e.target.value;
                              setHomeForm({ ...homeForm, howItWorksSteps: updated });
                            }}
                            className="w-full rounded border p-2 text-xs font-semibold text-slate-700"
                          >
                            {POPULAR_ICONS.map(ic => (
                              <option key={ic} value={ic}>{ic}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Judul Langkah</label>
                          <input
                            type="text"
                            value={step.title}
                            onChange={(e) => {
                              const updated = [...(homeForm.howItWorksSteps || [])];
                              updated[idx].title = e.target.value;
                              setHomeForm({ ...homeForm, howItWorksSteps: updated });
                            }}
                            className="w-full rounded border p-2 text-xs font-bold"
                          />
                        </div>

                        <div className="sm:col-span-3">
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Deskripsi Langkah</label>
                          <textarea
                            value={step.desc}
                            onChange={(e) => {
                              const updated = [...(homeForm.howItWorksSteps || [])];
                              updated[idx].desc = e.target.value;
                              setHomeForm({ ...homeForm, howItWorksSteps: updated });
                            }}
                            rows={2}
                            className="w-full rounded border p-2 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* FAQ CMS */}
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-base font-bold text-brand flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" /> 2. Section FAQ (Pertanyaan Umum)
                </h2>
                <VisibilityToggleBanner flagKey="showFaq" label="Section FAQ" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Judul Section FAQ
                  </label>
                  <input
                    type="text"
                    value={homeForm.faqTitle || ""}
                    onChange={(e) => setHomeForm({ ...homeForm, faqTitle: e.target.value })}
                    className="w-full rounded-lg border p-2.5 text-sm font-bold outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Subjudul Deskripsi FAQ
                  </label>
                  <input
                    type="text"
                    value={homeForm.faqSub || ""}
                    onChange={(e) => setHomeForm({ ...homeForm, faqSub: e.target.value })}
                    className="w-full rounded-lg border p-2.5 text-sm outline-none"
                    required
                  />
                </div>
              </div>

              {/* FAQ Items Manager */}
              <div className="space-y-3 pt-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-sm font-bold text-brand">Daftar Tanya Jawab FAQ ({homeForm.faqs?.length || 0})</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...(homeForm.faqs || [])];
                      updated.push({
                        question: "Pertanyaan Baru?",
                        answer: "Jawaban penjelasan untuk pertanyaan ini."
                      });
                      setHomeForm({ ...homeForm, faqs: updated });
                    }}
                    className="inline-flex items-center gap-1 rounded bg-brand/10 hover:bg-brand/20 px-3 py-1.5 text-xs font-bold text-brand transition cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> Tambah Pertanyaan FAQ
                  </button>
                </div>

                <div className="space-y-3">
                  {homeForm.faqs?.map((faq: any, idx: number) => (
                    <div key={idx} className="rounded-xl border p-4 bg-muted/10 space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <span className="text-xs font-bold text-slate-500">FAQ #{idx + 1}</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveItem(idx, "up", "faqs")}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveItem(idx, "down", "faqs")}
                            className="p-1 rounded hover:bg-slate-200 text-slate-500"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const updated = homeForm.faqs?.filter((_, i) => i !== idx);
                              setHomeForm({ ...homeForm, faqs: updated });
                            }}
                            className="p-1 rounded hover:bg-red-50 text-red-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Pertanyaan</label>
                          <input
                            type="text"
                            value={faq.question}
                            onChange={(e) => {
                              const updated = [...(homeForm.faqs || [])];
                              updated[idx].question = e.target.value;
                              setHomeForm({ ...homeForm, faqs: updated });
                            }}
                            className="w-full rounded border p-2 text-xs font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Jawaban</label>
                          <textarea
                            value={faq.answer}
                            onChange={(e) => {
                              const updated = [...(homeForm.faqs || [])];
                              updated[idx].answer = e.target.value;
                              setHomeForm({ ...homeForm, faqs: updated });
                            }}
                            rows={3}
                            className="w-full rounded border p-2 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* --- PREVIEW DRAFT DIALOG --- */}
      {previewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="bg-brand text-xs font-bold px-2 py-0.5 rounded uppercase">LIVE PREVIEW DRAFT</span>
                <span className="text-xs text-slate-400">Mockup rendering tampilan homepage terbaru</span>
              </div>
              <button
                onClick={() => setPreviewOpen(false)}
                className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Simulated Live Frame */}
            <div className="flex-1 overflow-y-auto bg-slate-100 p-4">
              <div className="bg-white rounded-xl shadow-inner overflow-hidden border max-w-4xl mx-auto pb-12 font-sans" style={{ backgroundColor: homeForm.colors?.background }}>
                
                {/* Header Preview */}
                {homeForm.showHeader !== false && (
                  <header className="border-b border-slate-100 bg-white/95 px-6 py-3 flex items-center justify-between" style={{ backgroundColor: homeForm.colors?.header }}>
                    <div className="flex items-center gap-2">
                      {homeForm.logoImg ? (
                        <img src={homeForm.logoImg} alt="logo" className="h-8 w-auto" />
                      ) : (
                        <div className="h-8 w-8 rounded-lg bg-emerald-700 text-white font-bold grid place-items-center text-sm" style={{ backgroundColor: homeForm.colors?.button }}>
                          {homeForm.logoText?.charAt(0)}
                        </div>
                      )}
                      <span className="font-bold text-sm text-slate-800">{homeForm.logoText}</span>
                    </div>
                    <button className="rounded-full border border-slate-200 px-3.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-1">
                      <LogIn className="h-3 w-3" /> Login Admin
                    </button>
                  </header>
                )}

                {/* Hero Preview */}
                {homeForm.showHero !== false && (
                  <section className="px-6 py-10 text-center space-y-4 bg-gradient-to-b from-emerald-50/50 to-transparent">
                    <span className="inline-block rounded-full bg-emerald-50 border border-emerald-100 px-3 py-0.5 text-[10px] font-bold text-emerald-800">
                      {homeForm.heroBadge}
                    </span>
                    <h1 className="text-2xl sm:text-3.5xl font-extrabold text-slate-900 max-w-2xl mx-auto leading-tight">
                      {homeForm.heroTitle}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
                      {homeForm.heroDesc}
                    </p>
                    <div className="flex justify-center pt-1">
                      <button className="h-10 px-6 rounded-full bg-emerald-700 text-white text-xs font-bold shadow" style={{ backgroundColor: homeForm.colors?.button }}>
                        {homeForm.heroBtn1}
                      </button>
                    </div>

                    {/* Hero Stats Preview */}
                    {homeForm.showHeroStats !== false && (
                      <div className="pt-6 grid grid-cols-4 gap-2 border-t border-slate-100">
                        {homeForm.heroStats?.map((s, i) => (
                          <div key={i} className="text-center">
                            <p className="font-bold text-xs text-slate-900">{s.value}</p>
                            <p className="text-[9px] text-slate-400">{s.label}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* Keunggulan Preview */}
                {homeForm.showAdvantages !== false && (
                  <section className="px-6 py-10 space-y-6">
                    <div className="text-center space-y-2 max-w-lg mx-auto">
                      <h2 className="font-bold text-slate-900 text-base sm:text-lg">{homeForm.advantagesTitle}</h2>
                      <p className="text-xs text-slate-400">{homeForm.advantagesSub}</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {homeForm.advantages?.map((adv, i) => (
                        <div key={i} className="border rounded-xl p-3 bg-white space-y-2 text-left" style={{ backgroundColor: homeForm.colors?.card }}>
                          <div className="h-9 w-9 bg-emerald-50 rounded-lg text-emerald-600 grid place-items-center">
                            <DynamicIcon name={adv.icon} className="h-5 w-5" />
                          </div>
                          <h4 className="font-bold text-xs text-slate-800">{adv.title}</h4>
                          <p className="text-[10.5px] text-slate-400 leading-normal">{adv.desc}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Jenjang Preview */}
                {homeForm.showLevels !== false && (
                  <section className="px-6 py-10 bg-slate-50/50 space-y-6">
                    <h3 className="font-bold text-slate-900 text-center text-base">{homeForm.levelsTitle}</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {homeForm.levels?.filter((l: any) => l.active !== false).map((lvl: any) => (
                        <div key={lvl.id} className="border rounded-xl p-3 bg-white flex flex-col justify-between" style={{ backgroundColor: homeForm.colors?.card }}>
                          <div>
                            <div className="h-9 w-9 bg-emerald-50 rounded-lg text-emerald-600 grid place-items-center">
                              <DynamicIcon name={lvl.icon} className="h-5 w-5" />
                            </div>
                            <h4 className="font-bold text-xs text-slate-800 mt-2">{lvl.name}</h4>
                            <p className="text-[10px] text-slate-400 leading-normal line-clamp-2 mt-1">{lvl.desc}</p>
                          </div>
                          <div className="text-[10px] font-bold text-emerald-700 mt-3 pt-1.5 border-t text-right">
                            {lvl.btnText} →
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Cara Kerja Preview */}
                {homeForm.showHowItWorks !== false && (
                  <section className="px-6 py-8 space-y-4 text-center border-t border-slate-100">
                    <h3 className="font-bold text-slate-900 text-sm">{homeForm.howItWorksTitle}</h3>
                    <div className="grid grid-cols-4 gap-2 text-left">
                      {homeForm.howItWorksSteps?.map((s, i) => (
                        <div key={i} className="border rounded-lg p-2.5 bg-slate-50">
                          <span className="text-[9px] font-bold text-emerald-700">STEP {s.step}</span>
                          <h5 className="font-bold text-xs text-slate-800 mt-1">{s.title}</h5>
                          <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{s.desc}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* FAQ Preview */}
                {homeForm.showFaq !== false && (
                  <section className="px-6 py-8 space-y-3 text-center bg-slate-50">
                    <h3 className="font-bold text-slate-900 text-sm">{homeForm.faqTitle}</h3>
                    <div className="space-y-1.5 text-left max-w-xl mx-auto">
                      {homeForm.faqs?.map((f, i) => (
                        <div key={i} className="border rounded-lg p-2.5 bg-white text-xs font-semibold text-slate-700">
                          ❓ {f.question}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* CTA Preview */}
                {homeForm.showCta !== false && (
                  <section className="mx-6 my-6 rounded-2xl p-6 text-center text-white space-y-2.5" style={{ backgroundColor: homeForm.ctaBg }}>
                    <h3 className="font-bold text-base">{homeForm.ctaTitle}</h3>
                    <p className="text-[11px] text-emerald-50">{homeForm.ctaDesc}</p>
                    <button className="h-8 px-4 bg-white text-emerald-900 rounded-full text-[11px] font-extrabold shadow mt-1">
                      {homeForm.ctaBtn}
                    </button>
                  </section>
                )}

                {/* Footer Preview */}
                {homeForm.showFooter !== false && (
                  <footer className="border-t border-slate-100 bg-slate-900 text-slate-400 px-6 py-8 text-left space-y-3" style={{ backgroundColor: homeForm.colors?.footer }}>
                    <div className="text-white font-bold text-xs flex items-center gap-1.5">
                      <div className="h-6 w-6 bg-emerald-700 text-white rounded font-bold text-center leading-6 text-xs">
                        {homeForm.logoText?.charAt(0)}
                      </div>
                      {homeForm.logoText}
                    </div>
                    <p className="text-[10px]">{homeForm.footerAddress}</p>
                    <p className="text-[10px] text-slate-500 border-t border-slate-800 pt-3">{homeForm.footerCopyright}</p>
                  </footer>
                )}

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
