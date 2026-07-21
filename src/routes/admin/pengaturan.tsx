import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { 
  Save, 
  Loader2, 
  Info, 
  Building2, 
  MessageSquare, 
  TestTube, 
  RotateCcw, 
  Sparkles, 
  Beaker, 
  GitFork, 
  CheckCircle2, 
  Star, 
  FileText, 
  ToggleLeft, 
  ToggleRight, 
  Play, 
  AlertCircle, 
  ShieldCheck, 
  Cpu,
  Layout,
  Globe,
  School,
  BookOpen,
  GraduationCap,
  ArrowRight,
  Eye,
  Sliders,
  MessageCircle,
  Key
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  saveSettingsAction,
  getAiProvidersAction,
  saveAiProviderAction,
  getWaTemplatesAction,
  saveWaTemplatesAction,
  getAiWorkflowConfigAction,
  saveAiWorkflowConfigAction
} from "@/actions/admin-actions";
import { simulateAiWorkflowAction, SimulationResult } from "@/actions/ai-workflow-simulator";
import { simulateWaSend, SimulateWaResult } from "@/actions/simulate-wa";
import { renderWaTemplate } from "@/actions/wa-template-engine";

export const Route = createFileRoute("/admin/pengaturan")({
  component: PengaturanPage,
});

const SUGGESTED_MODELS: Record<string, string[]> = {
  lovable: ["google/gemini-3.5-flash", "google/gemini-3.1-flash-lite", "google/gemini-2.5-flash", "google/gemini-2.5-pro", "google/gemini-3.1-pro-preview", "openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet"],
  gemini: ["google/gemini-3.5-flash", "google/gemini-3.1-flash-lite", "google/gemini-2.5-flash", "google/gemini-2.5-pro", "google/gemini-3.1-pro-preview", "gemini-1.5-pro", "gemini-1.5-flash"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.5-preview", "gpt-4-turbo"],
  claude: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
  openrouter: ["auto", "anthropic/claude-3.5-sonnet", "deepseek/deepseek-r1", "google/gemini-pro-1.5"],
};

const DEFAULT_AI_PROVIDERS = [
  { provider_name: "Lovable AI Gateway", provider_key: "lovable", api_key: "lovable-gateway-auto", model: "google/gemini-3.5-flash", base_url: "https://ai-gateway.lovable.dev/v1", temperature: 0.7, max_tokens: 2048, is_default: true, is_active: true },
  { provider_name: "Google Gemini", provider_key: "gemini", model: "google/gemini-3.5-flash", base_url: "https://generativelanguage.googleapis.com/v1beta/models", temperature: 0.7, max_tokens: 2048, is_default: false, is_active: true },
];

const DEFAULT_ADMIN_WA_TEMPLATE = "Ada konsultasi baru yang masuk.\n\nNama: {{nama}}\nNomor HP: {{nomor}}\nJenjang: {{jenjang}}\nTanggal: {{tanggal}}\n\nSilakan login ke Dashboard Admin untuk melihat detail konsultasi.";
const DEFAULT_PARTICIPANT_WA_TEMPLATE = "Terima kasih telah mengirim konsultasi di EduKonsul.\n\nData Anda telah kami terima.\n\nSaat ini sistem sedang melakukan analisis.\n\nTim kami akan menghubungi Anda apabila diperlukan.\n\nTerima kasih.";

export function PengaturanPage() {
  const { userEmail } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("homepage");

  // --- 1. Homepage CMS Config State ---
  const [homeForm, setHomeForm] = useState({
    siteName: "EduKonsul",
    badgeText: "Konsultasi Pendidikan Anak",
    heroTitle: "Konsultasi & Rekomendasi Pendidikan Untuk Anak",
    heroDesc: "Temukan rekomendasi pendidikan terbaik sesuai jenjang pendidikan anak. Pilih jenjang di bawah ini untuk memulai konsultasi.",
    btnText: "Mulai Konsultasi",
    tksdTag: "Usia Dini",
    tksdDesc: "Selamat datang di jenjang TK & SD! Konsultasikan kebutuhan tumbuh kembang anak usia dini untuk rekomendasi pendidikan terbaik.",
    smpTag: "Menengah Pertama",
    smpDesc: "Selamat datang di jenjang SMP! Petakan potensi, karakter, dan minat belajar remaja untuk sekolah menengah yang sesuai.",
    smaTag: "Menengah Atas",
    smaDesc: "Selamat datang di jenjang SMA! Temukan pemetaan jurusan, kesiapan perkuliahan, dan arah karier masa depan anak secara optimal.",
    footerText: `© ${new Date().getFullYear()} EduKonsul — Sekolah Alam Al-Karim.`
  });

  // --- 2. Workflow Config State ---
  const [wfConfig, setWfConfig] = useState<any>({
    enable_wa_admin_notif: true,
    enable_wa_parent_notif: true,
    enable_ai_analysis: true,
    enable_ai_summary: true,
    enable_ai_recommendation: true,
    enable_auto_save: true,
    auto_fallback: true
  });

  // --- 3. Providers State ---
  const [providers, setProviders] = useState<any[]>(DEFAULT_AI_PROVIDERS);
  const [selectedProvider, setSelectedProvider] = useState<any | null>(DEFAULT_AI_PROVIDERS[0]);

  // --- 4. WA Templates State ---
  const [waAdminTemplate, setWaAdminTemplate] = useState(DEFAULT_ADMIN_WA_TEMPLATE);
  const [waParticipantTemplate, setWaParticipantTemplate] = useState(DEFAULT_PARTICIPANT_WA_TEMPLATE);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    try {
      // 1. Load Homepage Config from settings table
      const { data: homeSetting } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "site.homepage_config")
        .maybeSingle();

      if (homeSetting && homeSetting.value) {
        setHomeForm((prev) => ({ ...prev, ...(homeSetting.value as any) }));
      }

      // 2. Load Workflow Config
      const wf = await getAiWorkflowConfigAction();
      if (wf) setWfConfig(wf);

      // 3. Load AI Providers
      const provs = await getAiProvidersAction();
      if (provs && provs.length > 0) {
        setProviders(provs);
        setSelectedProvider(provs.find((p: any) => p.is_default) || provs[0]);
      }

      // 4. Load WA Templates
      const templates = await getWaTemplatesAction();
      if (templates) {
        const adminT = templates.find((t: any) => t.template_key === "admin_notification");
        const partT = templates.find((t: any) => t.template_key === "participant_notification");
        if (adminT) setWaAdminTemplate(adminT.content);
        if (partT) setWaParticipantTemplate(partT.content);
      }
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat pengaturan");
    } finally {
      setLoading(false);
    }
  }

  // --- Save Homepage CMS Settings ---
  const handleSaveHomepage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase.from("settings").upsert({
        key: "site.homepage_config",
        value: homeForm as any,
        is_public: true,
        updated_at: new Date().toISOString()
      }, { onConflict: "key" });

      if (error) throw error;
      toast.success("Tampilan & Konten Homepage berhasil diperbarui secara Realtime!");
    } catch (err: any) {
      toast.error("Gagal menyimpan tampilan homepage: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // --- Save Workflow Settings ---
  const handleSaveWorkflow = async () => {
    setSaving(true);
    try {
      const res = await saveAiWorkflowConfigAction({ data: { config: wfConfig, email: userEmail || "admin" } });
      if (res.success) toast.success("Konfigurasi Alur Sistem berhasil disimpan");
    } catch (e: any) {
      toast.error("Gagal menyimpan workflow: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // --- Save AI Provider Settings ---
  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;
    setSaving(true);
    try {
      const res = await saveAiProviderAction({ data: { provider: selectedProvider, email: userEmail || "admin" } });
      if (res.success) {
        toast.success("Konfigurasi Provider AI berhasil disimpan");
        const updated = await getAiProvidersAction();
        if (updated) setProviders(updated);
      }
    } catch (e: any) {
      toast.error("Gagal menyimpan provider: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // --- Save WA Templates ---
  const handleSaveWaTemplates = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await saveWaTemplatesAction({
        data: {
          templates: [
            { template_key: "admin_notification", template_name: "Notifikasi Admin", content: waAdminTemplate },
            { template_key: "participant_notification", template_name: "Notifikasi Orang Tua", content: waParticipantTemplate }
          ],
          email: userEmail || "admin"
        }
      });
      if (res.success) toast.success("Template Notifikasi WhatsApp berhasil disimpan");
    } catch (e: any) {
      toast.error("Gagal menyimpan template WhatsApp: " + e.message);
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
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand flex items-center gap-2">
            <Layout className="h-6 w-6 text-brand" /> Pengaturan Tampilan & Sistem
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kelola teks & tampilan visual Halaman Utama (Homepage) serta konfigurasi sistem AI & WhatsApp.
          </p>
        </div>

        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted transition"
        >
          <Eye className="h-4 w-4 text-brand" />
          Lihat Homepage
        </a>
      </div>

      {/* Tabs Bar */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("homepage")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "homepage"
              ? "bg-brand text-brand-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Globe className="h-4 w-4" />
          Edit Tampilan Homepage
        </button>

        <button
          onClick={() => setActiveTab("workflow")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "workflow"
              ? "bg-brand text-brand-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <GitFork className="h-4 w-4" />
          Alur Sistem & Otomasi
        </button>

        <button
          onClick={() => setActiveTab("ai")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "ai"
              ? "bg-brand text-brand-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Provider & Model AI
        </button>

        <button
          onClick={() => setActiveTab("wa")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "wa"
              ? "bg-brand text-brand-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <MessageCircle className="h-4 w-4" />
          Template WhatsApp
        </button>
      </div>

      {/* TAB 1: EDIT TAMPILAN HOMEPAGE (CMS) */}
      {activeTab === "homepage" && (
        <form onSubmit={handleSaveHomepage} className="space-y-6">
          {/* Section 1: Header & Branding */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-brand flex items-center gap-2 border-b pb-2">
              <Globe className="h-5 w-5" /> 1. Header & Brand Logo
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Nama Aplikasi / Brand
                </label>
                <input
                  type="text"
                  value={homeForm.siteName}
                  onChange={(e) => setHomeForm({ ...homeForm, siteName: e.target.value })}
                  className="w-full rounded-lg border p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand/40"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Teks Lencana Atas (Pill Badge)
                </label>
                <input
                  type="text"
                  value={homeForm.badgeText}
                  onChange={(e) => setHomeForm({ ...homeForm, badgeText: e.target.value })}
                  className="w-full rounded-lg border p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand/40"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 2: Hero Banner */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-brand flex items-center gap-2 border-b pb-2">
              <Sparkles className="h-5 w-5" /> 2. Hero Banner Utama (Headline & Subtitle)
            </h2>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Judul Utama Banner (Hero Title)
              </label>
              <input
                type="text"
                value={homeForm.heroTitle}
                onChange={(e) => setHomeForm({ ...homeForm, heroTitle: e.target.value })}
                className="w-full rounded-lg border p-2.5 text-sm font-bold text-foreground outline-none focus:ring-2 focus:ring-brand/40"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Deskripsi Paragraf Banner (Hero Subtitle)
              </label>
              <textarea
                value={homeForm.heroDesc}
                onChange={(e) => setHomeForm({ ...homeForm, heroDesc: e.target.value })}
                rows={3}
                className="w-full rounded-lg border p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/40"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Teks Tombol Konsultasi (Button Label)
              </label>
              <input
                type="text"
                value={homeForm.btnText}
                onChange={(e) => setHomeForm({ ...homeForm, btnText: e.target.value })}
                className="w-full rounded-lg border p-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-brand/40"
                required
              />
            </div>
          </div>

          {/* Section 3: Kartu Jenjang Pendidikan */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-6">
            <h2 className="text-base font-bold text-brand flex items-center gap-2 border-b pb-2">
              <School className="h-5 w-5" /> 3. Kartu Jenjang Pendidikan (TK/SD, SMP, SMA)
            </h2>

            {/* TK & SD */}
            <div className="space-y-3 rounded-lg border p-4 bg-muted/20">
              <h3 className="text-sm font-bold text-brand flex items-center gap-2">
                <School className="h-4 w-4" /> Kartu Jenjang TK & SD
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Label Tag</label>
                  <input
                    type="text"
                    value={homeForm.tksdTag}
                    onChange={(e) => setHomeForm({ ...homeForm, tksdTag: e.target.value })}
                    className="w-full rounded border p-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Deskripsi Kartu</label>
                  <textarea
                    value={homeForm.tksdDesc}
                    onChange={(e) => setHomeForm({ ...homeForm, tksdDesc: e.target.value })}
                    rows={2}
                    className="w-full rounded border p-2 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* SMP */}
            <div className="space-y-3 rounded-lg border p-4 bg-muted/20">
              <h3 className="text-sm font-bold text-brand flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> Kartu Jenjang SMP
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Label Tag</label>
                  <input
                    type="text"
                    value={homeForm.smpTag}
                    onChange={(e) => setHomeForm({ ...homeForm, smpTag: e.target.value })}
                    className="w-full rounded border p-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Deskripsi Kartu</label>
                  <textarea
                    value={homeForm.smpDesc}
                    onChange={(e) => setHomeForm({ ...homeForm, smpDesc: e.target.value })}
                    rows={2}
                    className="w-full rounded border p-2 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* SMA */}
            <div className="space-y-3 rounded-lg border p-4 bg-muted/20">
              <h3 className="text-sm font-bold text-brand flex items-center gap-2">
                <GraduationCap className="h-4 w-4" /> Kartu Jenjang SMA
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Label Tag</label>
                  <input
                    type="text"
                    value={homeForm.smaTag}
                    onChange={(e) => setHomeForm({ ...homeForm, smaTag: e.target.value })}
                    className="w-full rounded border p-2 text-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Deskripsi Kartu</label>
                  <textarea
                    value={homeForm.smaDesc}
                    onChange={(e) => setHomeForm({ ...homeForm, smaDesc: e.target.value })}
                    rows={2}
                    className="w-full rounded border p-2 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Footer */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-brand flex items-center gap-2 border-b pb-2">
              <FileText className="h-5 w-5" /> 4. Teks Footer & Hak Cipta
            </h2>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Teks Footer Copyright
              </label>
              <input
                type="text"
                value={homeForm.footerText}
                onChange={(e) => setHomeForm({ ...homeForm, footerText: e.target.value })}
                className="w-full rounded-lg border p-2.5 text-sm outline-none focus:ring-2 focus:ring-brand/40"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-4 border-t">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition hover:opacity-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan Tampilan Homepage
            </button>
          </div>
        </form>
      )}

      {/* TAB 2: ALUR SISTEM (PIPELINE) */}
      {activeTab === "workflow" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-brand border-b pb-2 flex items-center gap-2">
              <GitFork className="h-5 w-5" /> Konfigurasi Sakelar Otomasi Workflow
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center justify-between rounded-lg border p-3.5 bg-muted/10">
                <div>
                  <p className="font-semibold text-sm">Notifikasi WA Admin</p>
                  <p className="text-xs text-muted-foreground">Kirim WhatsApp ke admin saat ada konsultasi</p>
                </div>
                <button
                  type="button"
                  onClick={() => setWfConfig({ ...wfConfig, enable_wa_admin_notif: !wfConfig.enable_wa_admin_notif })}
                  className="text-brand"
                >
                  {wfConfig.enable_wa_admin_notif ? <ToggleRight className="h-7 w-7 text-emerald-600" /> : <ToggleLeft className="h-7 w-7 text-muted-foreground" />}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3.5 bg-muted/10">
                <div>
                  <p className="font-semibold text-sm">Notifikasi WA Orang Tua</p>
                  <p className="text-xs text-muted-foreground">Kirim WhatsApp konfirmasi ke orang tua</p>
                </div>
                <button
                  type="button"
                  onClick={() => setWfConfig({ ...wfConfig, enable_wa_parent_notif: !wfConfig.enable_wa_parent_notif })}
                  className="text-brand"
                >
                  {wfConfig.enable_wa_parent_notif ? <ToggleRight className="h-7 w-7 text-emerald-600" /> : <ToggleLeft className="h-7 w-7 text-muted-foreground" />}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3.5 bg-muted/10">
                <div>
                  <p className="font-semibold text-sm">Analisis Otomatis AI</p>
                  <p className="text-xs text-muted-foreground">Jalankan AI Engine otomatis saat form dikirim</p>
                </div>
                <button
                  type="button"
                  onClick={() => setWfConfig({ ...wfConfig, enable_ai_analysis: !wfConfig.enable_ai_analysis })}
                  className="text-brand"
                >
                  {wfConfig.enable_ai_analysis ? <ToggleRight className="h-7 w-7 text-emerald-600" /> : <ToggleLeft className="h-7 w-7 text-muted-foreground" />}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3.5 bg-muted/10">
                <div>
                  <p className="font-semibold text-sm">Simpan Otomatis ke Database</p>
                  <p className="text-xs text-muted-foreground">Simpan hasil analisis AI ke database</p>
                </div>
                <button
                  type="button"
                  onClick={() => setWfConfig({ ...wfConfig, enable_auto_save: !wfConfig.enable_auto_save })}
                  className="text-brand"
                >
                  {wfConfig.enable_auto_save ? <ToggleRight className="h-7 w-7 text-emerald-600" /> : <ToggleLeft className="h-7 w-7 text-muted-foreground" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button
                type="button"
                onClick={handleSaveWorkflow}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition hover:opacity-95"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan Alur Sistem
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PROVIDER & MODEL AI */}
      {activeTab === "ai" && (
        <form onSubmit={handleSaveProvider} className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-brand border-b pb-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Pengaturan Provider & Model AI
            </h2>

            {selectedProvider && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Pilih Provider AI
                  </label>
                  <select
                    value={selectedProvider.provider_key}
                    onChange={(e) => {
                      const found = providers.find((p) => p.provider_key === e.target.value);
                      if (found) setSelectedProvider(found);
                    }}
                    className="w-full rounded-lg border p-2.5 text-sm font-medium"
                  >
                    {providers.map((p) => (
                      <option key={p.provider_key} value={p.provider_key}>
                        {p.provider_name} {p.is_default ? "(Default Aktif)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    API Key Provider
                  </label>
                  <input
                    type="password"
                    value={selectedProvider.api_key || ""}
                    onChange={(e) => setSelectedProvider({ ...selectedProvider, api_key: e.target.value })}
                    className="w-full rounded-lg border p-2.5 text-sm font-mono"
                    placeholder="Masukkan API Key..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Model AI
                  </label>
                  <select
                    value={selectedProvider.model || ""}
                    onChange={(e) => setSelectedProvider({ ...selectedProvider, model: e.target.value })}
                    className="w-full rounded-lg border p-2.5 text-sm font-medium"
                  >
                    {(SUGGESTED_MODELS[selectedProvider.provider_key] || ["google/gemini-3.5-flash"]).map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition hover:opacity-95"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan Provider AI
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 4: TEMPLATE WHATSAPP */}
      {activeTab === "wa" && (
        <form onSubmit={handleSaveWaTemplates} className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-brand border-b pb-2 flex items-center gap-2">
              <MessageCircle className="h-5 w-5" /> Template Pesan WhatsApp
            </h2>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Template Notifikasi Admin
              </label>
              <textarea
                value={waAdminTemplate}
                onChange={(e) => setWaAdminTemplate(e.target.value)}
                rows={5}
                className="w-full rounded-lg border p-3 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Template Konfirmasi Orang Tua
              </label>
              <textarea
                value={waParticipantTemplate}
                onChange={(e) => setWaParticipantTemplate(e.target.value)}
                rows={5}
                className="w-full rounded-lg border p-3 text-sm font-mono"
              />
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition hover:opacity-95"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan Template WhatsApp
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
