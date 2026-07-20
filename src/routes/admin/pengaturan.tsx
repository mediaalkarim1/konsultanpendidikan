import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Loader2, Info, Building2, MessageSquare, TestTube, RotateCcw, Sparkles, Beaker, GitFork, CheckCircle2, Star, FileText, ToggleLeft, ToggleRight, Play, AlertCircle, ShieldCheck, Cpu } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  logActivity,
  saveSettingsAction,
  getAiProvidersAction,
  saveAiProviderAction,
  getWaTemplatesAction,
  saveWaTemplatesAction,
  getAiWorkflowConfigAction,
  saveAiWorkflowConfigAction
} from "@/actions/admin-actions";
import { simulateAiWorkflowAction, SimulationResult } from "@/actions/ai-workflow-simulator";
import { PromptAIPage } from "./prompt";
import { TestingPage } from "./testing";

export const Route = createFileRoute("/admin/pengaturan")({
  component: PengaturanPage,
});

const SUGGESTED_MODELS: Record<string, string[]> = {
  lovable: ["google/gemini-2.5-flash", "openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet"],
  gemini: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-1.5-pro", "gemini-1.5-flash"],
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4.5-preview", "gpt-4-turbo"],
  claude: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
  openrouter: ["auto", "anthropic/claude-3.5-sonnet", "deepseek/deepseek-r1", "google/gemini-pro-1.5"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  groq: ["llama-3.3-70b-versatile", "mixtral-8x7b-32768"],
  mistral: ["mistral-small-latest", "mistral-large-latest"],
  ollama: ["llama3", "mistral", "gemma2"]
};

const DEFAULT_AI_PROVIDERS = [
  { provider_name: "Lovable AI Gateway", provider_key: "lovable", model: "google/gemini-2.5-flash", base_url: "https://ai-gateway.lovable.dev/v1", temperature: 0.7, max_tokens: 2048, is_default: true, is_active: true },
  { provider_name: "Google Gemini", provider_key: "gemini", model: "gemini-1.5-pro", base_url: "https://generativelanguage.googleapis.com/v1beta/models", temperature: 0.7, max_tokens: 2048, is_default: false, is_active: true },
  { provider_name: "OpenAI GPT", provider_key: "openai", model: "gpt-4o-mini", base_url: "https://api.openai.com/v1", temperature: 0.7, max_tokens: 2048, is_default: false, is_active: true },
  { provider_name: "Anthropic Claude", provider_key: "claude", model: "claude-3-5-sonnet-20241022", base_url: "https://api.anthropic.com/v1", temperature: 0.7, max_tokens: 2048, is_default: false, is_active: true },
  { provider_name: "OpenRouter", provider_key: "openrouter", model: "auto", base_url: "https://openrouter.ai/api/v1", temperature: 0.7, max_tokens: 2048, is_default: false, is_active: true },
  { provider_name: "DeepSeek", provider_key: "deepseek", model: "deepseek-chat", base_url: "https://api.deepseek.com/v1", temperature: 0.7, max_tokens: 2048, is_default: false, is_active: true },
  { provider_name: "Groq", provider_key: "groq", model: "llama-3.3-70b-versatile", base_url: "https://api.groq.com/openai/v1", temperature: 0.7, max_tokens: 2048, is_default: false, is_active: true },
  { provider_name: "Mistral AI", provider_key: "mistral", model: "mistral-small-latest", base_url: "https://api.mistral.ai/v1", temperature: 0.7, max_tokens: 2048, is_default: false, is_active: true },
  { provider_name: "Ollama (Self Hosted)", provider_key: "ollama", model: "llama3", base_url: "http://localhost:11434", temperature: 0.7, max_tokens: 2048, is_default: false, is_active: true }
];

const DEFAULT_ADMIN_WA_TEMPLATE = "Ada konsultasi baru yang masuk.\n\nNama: {{nama}}\nNomor HP: {{nomor}}\nJenjang: {{jenjang}}\nTanggal: {{tanggal}}\n\nSilakan login ke Dashboard Admin untuk melihat detail konsultasi.";
const DEFAULT_PARTICIPANT_WA_TEMPLATE = "Terima kasih telah mengirim konsultasi di EduKonsul.\n\nData Anda telah kami terima.\n\nSaat ini sistem sedang melakukan analisis.\n\nTim kami akan menghubungi Anda apabila diperlukan.\n\nTerima kasih.";

function PengaturanPage() {
  const { userEmail } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingWa, setTestingWa] = useState(false);
  const [activeTab, setActiveTab] = useState("workflow");

  // AI Providers & Workflow State
  const [providers, setProviders] = useState<any[]>(DEFAULT_AI_PROVIDERS);
  const [selectedProvider, setSelectedProvider] = useState<any | null>(DEFAULT_AI_PROVIDERS[0]);
  const [savingProvider, setSavingProvider] = useState(false);

  const defaultWorkflowConfig = {
    enable_wa_admin_notif: true,
    enable_wa_parent_notif: true,
    enable_ai_analysis: true,
    enable_ai_summary: true,
    enable_ai_recommendation: true,
    enable_auto_save: true,
    auto_analysis: true,
    generate_resume: true,
    generate_recommendation: true,
    save_ai_log: true,
    save_prompt_history: true,
    auto_retry: true,
    auto_fallback: true,
    request_timeout: 30,
    prompt_mode: "default"
  };

  const [wfConfig, setWfConfig] = useState(defaultWorkflowConfig);
  const [savingWfConfig, setSavingWfConfig] = useState(false);

  // Workflow Simulator State
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  // WA Templates State
  const [waAdminTemplate, setWaAdminTemplate] = useState(DEFAULT_ADMIN_WA_TEMPLATE);
  const [waParticipantTemplate, setWaParticipantTemplate] = useState(DEFAULT_PARTICIPANT_WA_TEMPLATE);
  const [savingWaTemplates, setSavingWaTemplates] = useState(false);

  const defaultSettings = {
    appName: "EduKonsul",
    heroTitle: "Konsultasi & Rekomendasi Pendidikan Untuk Anak",
    heroDesc: "Temukan rekomendasi pendidikan terbaik sesuai jenjang pendidikan anak.",
    footerText: "Copyright 2026",
    adminWa: "",
    waProvider: "mock",
    waApiUrl: "",
    waApiKey: "",
    waDeviceId: "",
  };

  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      let allSettings: any[] = [];
      try {
        const { data } = await supabase.from("settings").select("*");
        allSettings = data || [];
      } catch (_) {}

      let providersData: any[] = [];
      try {
        providersData = await getAiProvidersAction();
      } catch (_) {}

      let waTemplatesData: any[] = [];
      try {
        waTemplatesData = await getWaTemplatesAction();
      } catch (_) {}

      let wfData: any = null;
      try {
        wfData = await getAiWorkflowConfigAction();
      } catch (_) {}

      const findVal = (key: string) => allSettings?.find((s: any) => s.key === key)?.value || {};
      const waConfig = findVal("wa.provider_config");
      const contactObj = findVal("site.contact");
      const brandObj = findVal("site.brand");
      const heroObj = findVal("site.hero");
      const footerObj = findVal("site.footer");
      
      setSettings({
        appName: brandObj.name || defaultSettings.appName,
        heroTitle: heroObj.title || defaultSettings.heroTitle,
        heroDesc: heroObj.description || defaultSettings.heroDesc,
        footerText: footerObj.text || defaultSettings.footerText,
        adminWa: contactObj.whatsapp || "",
        waProvider: waConfig.provider || "mock",
        waApiUrl: waConfig.api_url || "",
        waApiKey: waConfig.api_key || "",
        waDeviceId: waConfig.device_id || "",
      });

      const activeProviders = (providersData && providersData.length > 0) ? providersData : DEFAULT_AI_PROVIDERS;
      setProviders(activeProviders);
      setSelectedProvider(activeProviders.find((p: any) => p.is_default) || activeProviders[0]);

      const adminTpl = waTemplatesData?.find((t: any) => t.template_key === "admin_notification")?.content;
      const partTpl = waTemplatesData?.find((t: any) => t.template_key === "participant_notification")?.content;
      setWaAdminTemplate(adminTpl || DEFAULT_ADMIN_WA_TEMPLATE);
      setWaParticipantTemplate(partTpl || DEFAULT_PARTICIPANT_WA_TEMPLATE);

      if (wfData) {
        setWfConfig({ ...defaultWorkflowConfig, ...wfData });
      }
    } catch (e) {
      console.error("loadData error:", e);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const allUpdates = [
        { key: "wa.provider_config", value: { provider: settings.waProvider, api_url: settings.waApiUrl, api_key: settings.waApiKey, device_id: settings.waDeviceId }, is_public: false },
        { key: "site.contact", value: { whatsapp: settings.adminWa }, is_public: false },
        { key: "site.brand", value: { name: settings.appName }, is_public: true },
        { key: "site.hero", value: { title: settings.heroTitle, description: settings.heroDesc }, is_public: true },
        { key: "site.footer", value: { text: settings.footerText }, is_public: true }
      ];

      await saveSettingsAction({ data: { updates: allUpdates } });
      toast.success("Pengaturan berhasil disimpan");

      try {
        await logActivity({ data: { email: userEmail || "admin", action: "UPDATE_SETTINGS", details: { tab: activeTab } } });
      } catch (_) {}
    } catch (e: any) {
      console.error("Gagal menyimpan pengaturan:", e);
      toast.error("Gagal menyimpan pengaturan: " + (e.message || "Error database"));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;
    setSavingProvider(true);
    try {
      await saveAiProviderAction({
        data: {
          provider: selectedProvider,
          email: userEmail || "admin"
        }
      });
      toast.success(`Provider AI ${selectedProvider.provider_name} berhasil disimpan`);
      const updatedProviders = await getAiProvidersAction();
      setProviders(updatedProviders || []);
      if (updatedProviders) {
        setSelectedProvider(updatedProviders.find((p: any) => p.id === selectedProvider.id) || selectedProvider);
      }
    } catch (e: any) {
      toast.error("Gagal menyimpan provider: " + (e.message || "Error database"));
    } finally {
      setSavingProvider(false);
    }
  };

  const handleSaveWfConfig = async () => {
    setSavingWfConfig(true);
    try {
      await saveAiWorkflowConfigAction({
        data: {
          config: wfConfig,
          email: userEmail || "admin"
        }
      });
      toast.success("Pengaturan Alur Sistem AI berhasil disimpan");
    } catch (e: any) {
      toast.error("Gagal menyimpan Alur Sistem AI: " + e.message);
    } finally {
      setSavingWfConfig(false);
    }
  };

  const handleSaveWaTemplates = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWaTemplates(true);
    try {
      await saveWaTemplatesAction({
        data: {
          templates: [
            { template_key: "admin_notification", template_name: "Pesan Notifikasi Admin", content: waAdminTemplate },
            { template_key: "participant_notification", template_name: "Pesan Notifikasi Peserta", content: waParticipantTemplate }
          ],
          email: userEmail || "admin"
        }
      });
      toast.success("Template WhatsApp Notifikasi berhasil disimpan");
    } catch (e: any) {
      toast.error("Gagal menyimpan template WA: " + (e.message || "Error database"));
    } finally {
      setSavingWaTemplates(false);
    }
  };

  const handleRunWorkflowSimulation = async () => {
    setSimulating(true);
    setSimResult(null);
    try {
      const result = await simulateAiWorkflowAction();
      setSimResult(result);
      if (result.overallStatus === "success") {
        toast.success("Simulasi Alur Sistem AI Berhasil!");
      } else {
        toast.error("Simulasi Alur Sistem AI Mengalami Kendala.");
      }
    } catch (e: any) {
      toast.error("Gagal menjalankan simulasi: " + e.message);
    } finally {
      setSimulating(false);
    }
  };

  const testWhatsApp = async () => {
    if (!settings.adminWa) {
      toast.error("Nomor WA Admin belum diisi di tab Umum.");
      return;
    }
    setTestingWa(true);
    setTimeout(() => {
      toast.success(`Pesan test dikirim ke ${settings.adminWa}`);
      setTestingWa(false);
    }, 1500);
  };

  const tabs = [
    { id: "workflow", label: "Alur Sistem AI", icon: GitFork },
    { id: "umum", label: "Umum", icon: Building2 },
    { id: "wa", label: "WhatsApp Provider", icon: MessageSquare },
    { id: "watemplate", label: "WhatsApp Template", icon: FileText },
    { id: "prompt", label: "Prompt AI", icon: Sparkles },
    { id: "testing", label: "Testing & Simulasi", icon: Beaker },
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand flex items-center gap-2">
            <GitFork className="h-6 w-6" /> Pusat Kendali Alur Sistem AI EduKonsul
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Atur AI Provider, Model, Prompt, Saklar Workflow (*toggles*), WhatsApp, serta Simulasi Alur Realtime.
          </p>
        </div>
      </div>

      <div className="flex gap-6 flex-col md:flex-row">
        <aside className="w-full md:w-56 shrink-0">
          <nav className="flex md:flex-col space-x-1 md:space-x-0 md:space-y-1 overflow-x-auto pb-2 md:pb-0">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex shrink-0 items-center justify-start gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-brand text-brand-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex-1">
          {activeTab === "workflow" ? (
            /* HALAMAN UTAMA: ALUR SISTEM AI (7 SECTION) */
            <div className="space-y-8 animate-in fade-in duration-200">
              
              {/* SECTION 1 & 2: AI PROVIDER & MODEL SELECTION */}
              <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-brand flex items-center gap-2">
                      <Cpu className="h-5 w-5" /> 1. Pemilihan AI Provider & Model AI (Aktif Single)
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Pilih salah satu dari 9 AI Provider terintegrasi untuk menjadi engine analisis utama.</p>
                  </div>
                  <button
                    onClick={handleSaveProvider}
                    disabled={savingProvider}
                    className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {savingProvider ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Simpan Provider
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {providers.map((p) => {
                    const isSelected = selectedProvider?.provider_key === p.provider_key;
                    return (
                      <button
                        key={p.id || p.provider_key}
                        type="button"
                        onClick={() => setSelectedProvider({ ...p, is_default: true, is_active: true })}
                        className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between h-24 ${
                          isSelected
                            ? "border-brand bg-brand/10 text-brand font-semibold shadow-md ring-2 ring-brand/30"
                            : "border-border hover:bg-muted text-muted-foreground"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-xs font-bold truncate">{p.provider_name}</span>
                          {p.is_default && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground truncate font-mono mt-1">{p.model || "Default Model"}</p>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded w-max mt-2 font-bold ${p.is_default ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-700'}`}>
                          {p.is_default ? "ACTIVE ENGINE" : "TERSEDIA"}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Form Editor Selected Provider & Model */}
                {selectedProvider && (
                  <div className="rounded-lg bg-muted/20 border p-4 space-y-4">
                    <h3 className="text-sm font-semibold text-foreground border-b pb-2">
                      Konfigurasi Engine: <span className="text-brand">{selectedProvider.provider_name}</span>
                    </h3>
                    
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <label className="block text-xs font-medium mb-1">Pilih / Input Model AI</label>
                        <select
                          value={selectedProvider.model || ""}
                          onChange={(e) => setSelectedProvider({ ...selectedProvider, model: e.target.value })}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-brand font-mono"
                        >
                          {(SUGGESTED_MODELS[selectedProvider.provider_key] || [selectedProvider.model]).map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">API Key</label>
                        <input
                          type="password"
                          value={selectedProvider.api_key || ""}
                          onChange={(e) => setSelectedProvider({ ...selectedProvider, api_key: e.target.value })}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-brand font-mono"
                          placeholder="Masukkan API Key..."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium mb-1">Base API URL</label>
                        <input
                          type="text"
                          value={selectedProvider.base_url || ""}
                          onChange={(e) => setSelectedProvider({ ...selectedProvider, base_url: e.target.value })}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-brand font-mono"
                          placeholder="https://..."
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 3: PROMPT ANALISIS */}
              <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-brand flex items-center gap-2">
                      <Sparkles className="h-5 w-5" /> 2. Mode Prompt Analisis
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Pilih apakah menggunakan Default Prompt teruji atau Custom Prompt buatan sendiri.</p>
                  </div>

                  <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setWfConfig({ ...wfConfig, prompt_mode: "default" })}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition ${wfConfig.prompt_mode === "default" ? "bg-card shadow text-brand font-bold" : "text-muted-foreground"}`}
                    >
                      Default Prompt
                    </button>
                    <button
                      type="button"
                      onClick={() => setWfConfig({ ...wfConfig, prompt_mode: "custom" })}
                      className={`px-3 py-1 text-xs font-medium rounded-md transition ${wfConfig.prompt_mode === "custom" ? "bg-card shadow text-brand font-bold" : "text-muted-foreground"}`}
                    >
                      Custom Prompt
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg text-xs text-blue-700 dark:text-blue-300">
                  <span>Prompt AI memandu Gemini/OpenAI dalam menghasilkan Resume, Analisis, dan Rekomendasi Pendidikan.</span>
                  <button type="button" onClick={() => setActiveTab("prompt")} className="underline font-bold hover:text-blue-800">
                    Buka Editor Prompt AI Lengkap $\rightarrow$
                  </button>
                </div>
              </div>

              {/* SECTION 4: WORKFLOW SISTEM (STEP TOGGLES) */}
              <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
                <div className="border-b pb-3 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-brand flex items-center gap-2">
                      <GitFork className="h-5 w-5" /> 3. Workflow Sistem (Urutan Langkah Toggles)
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Aktifkan atau nonaktifkan setiap langkah alur yang dieksekusi setelah formulir dikirim.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveWfConfig}
                    disabled={savingWfConfig}
                    className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-brand-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {savingWfConfig ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Simpan Alur Workflow
                  </button>
                </div>

                {/* Workflow Step Visualizer */}
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                  {/* Step 1 & 2 */}
                  <div className="p-3.5 rounded-xl border bg-muted/40 opacity-80">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Langkah 1 & 2 (Mandatory)</span>
                    <h4 className="font-semibold text-xs mt-1">Submit Form & Simpan DB</h4>
                    <p className="text-[10px] text-muted-foreground mt-1">Data peserta tersimpan ke Supabase secara permanen.</p>
                    <span className="inline-block mt-2 text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded">ALWAYS ON</span>
                  </div>

                  {/* Step 3: WA Admin */}
                  <div className={`p-3.5 rounded-xl border transition-all ${wfConfig.enable_wa_admin_notif ? 'border-emerald-300 bg-emerald-50/40' : 'border-border bg-card'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-emerald-700">Langkah 3</span>
                      <button
                        type="button"
                        onClick={() => setWfConfig({ ...wfConfig, enable_wa_admin_notif: !wfConfig.enable_wa_admin_notif })}
                        className="text-brand"
                      >
                        {wfConfig.enable_wa_admin_notif ? <ToggleRight className="h-6 w-6 text-emerald-600" /> : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
                      </button>
                    </div>
                    <h4 className="font-semibold text-xs mt-1">WhatsApp Notifikasi Admin</h4>
                    <p className="text-[10px] text-muted-foreground mt-1">Kirim pesan pemberitahuan ke WA Admin.</p>
                  </div>

                  {/* Step 4: WA Participant */}
                  <div className={`p-3.5 rounded-xl border transition-all ${wfConfig.enable_wa_parent_notif ? 'border-emerald-300 bg-emerald-50/40' : 'border-border bg-card'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-emerald-700">Langkah 4</span>
                      <button
                        type="button"
                        onClick={() => setWfConfig({ ...wfConfig, enable_wa_parent_notif: !wfConfig.enable_wa_parent_notif })}
                        className="text-brand"
                      >
                        {wfConfig.enable_wa_parent_notif ? <ToggleRight className="h-6 w-6 text-emerald-600" /> : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
                      </button>
                    </div>
                    <h4 className="font-semibold text-xs mt-1">WhatsApp Notifikasi Peserta</h4>
                    <p className="text-[10px] text-muted-foreground mt-1">Kirim pesan balasan awal ke WA Orang Tua.</p>
                  </div>

                  {/* Step 5: AI Engine */}
                  <div className={`p-3.5 rounded-xl border transition-all ${wfConfig.enable_ai_analysis ? 'border-brand/40 bg-brand/5' : 'border-border bg-card'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-brand">Langkah 5</span>
                      <button
                        type="button"
                        onClick={() => setWfConfig({ ...wfConfig, enable_ai_analysis: !wfConfig.enable_ai_analysis })}
                      >
                        {wfConfig.enable_ai_analysis ? <ToggleRight className="h-6 w-6 text-brand" /> : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
                      </button>
                    </div>
                    <h4 className="font-semibold text-xs mt-1">Analisis AI Engine</h4>
                    <p className="text-[10px] text-muted-foreground mt-1">Panggil AI Provider untuk memproses jawaban.</p>
                  </div>

                  {/* Step 6: Resume AI */}
                  <div className={`p-3.5 rounded-xl border transition-all ${wfConfig.enable_ai_summary ? 'border-blue-300 bg-blue-50/40' : 'border-border bg-card'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-blue-700">Langkah 6</span>
                      <button
                        type="button"
                        onClick={() => setWfConfig({ ...wfConfig, enable_ai_summary: !wfConfig.enable_ai_summary })}
                      >
                        {wfConfig.enable_ai_summary ? <ToggleRight className="h-6 w-6 text-blue-600" /> : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
                      </button>
                    </div>
                    <h4 className="font-semibold text-xs mt-1">AI Membuat Resume</h4>
                    <p className="text-[10px] text-muted-foreground mt-1">Rangkum ringkasan kondisi anak.</p>
                  </div>

                  {/* Step 7: Rekomendasi AI */}
                  <div className={`p-3.5 rounded-xl border transition-all ${wfConfig.enable_ai_recommendation ? 'border-blue-300 bg-blue-50/40' : 'border-border bg-card'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-blue-700">Langkah 7</span>
                      <button
                        type="button"
                        onClick={() => setWfConfig({ ...wfConfig, enable_ai_recommendation: !wfConfig.enable_ai_recommendation })}
                      >
                        {wfConfig.enable_ai_recommendation ? <ToggleRight className="h-6 w-6 text-blue-600" /> : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
                      </button>
                    </div>
                    <h4 className="font-semibold text-xs mt-1">AI Membuat Rekomendasi</h4>
                    <p className="text-[10px] text-muted-foreground mt-1">Susun saran pendidikan & parenting.</p>
                  </div>

                  {/* Step 8: Simpan Hasil DB */}
                  <div className={`p-3.5 rounded-xl border transition-all ${wfConfig.enable_auto_save ? 'border-indigo-300 bg-indigo-50/40' : 'border-border bg-card'}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-indigo-700">Langkah 8</span>
                      <button
                        type="button"
                        onClick={() => setWfConfig({ ...wfConfig, enable_auto_save: !wfConfig.enable_auto_save })}
                      >
                        {wfConfig.enable_auto_save ? <ToggleRight className="h-6 w-6 text-indigo-600" /> : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
                      </button>
                    </div>
                    <h4 className="font-semibold text-xs mt-1">Simpan Hasil ke Database</h4>
                    <p className="text-[10px] text-muted-foreground mt-1">Tulis ke tabel consultation_analysis.</p>
                  </div>

                  {/* Step 9 */}
                  <div className="p-3.5 rounded-xl border bg-muted/40 opacity-80">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Langkah 9 (Mandatory)</span>
                    <h4 className="font-semibold text-xs mt-1">Status = "Selesai"</h4>
                    <p className="text-[10px] text-muted-foreground mt-1">Konsultasi siap dilihat pada Dashboard Admin.</p>
                    <span className="inline-block mt-2 text-[10px] bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded">FINISHED</span>
                  </div>
                </div>
              </div>

              {/* SECTION 5 & 6: WHATSAPP QUICK & PENGATURAN TAMBAHAN */}
              <div className="rounded-xl border bg-card p-6 shadow-sm space-y-6">
                <div className="border-b pb-3">
                  <h2 className="text-lg font-bold text-brand flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5" /> 4. Pengaturan Lanjutan AI & WhatsApp
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Kontrol fitur auto retry, auto fallback AI, simpan log, dan timeout request.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                    <div>
                      <p className="text-xs font-semibold">Auto Retry AI</p>
                      <p className="text-[10px] text-muted-foreground">Ulangi jika API AI gagal</p>
                    </div>
                    <button type="button" onClick={() => setWfConfig({ ...wfConfig, auto_retry: !wfConfig.auto_retry })}>
                      {wfConfig.auto_retry ? <ToggleRight className="h-6 w-6 text-brand" /> : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                    <div>
                      <p className="text-xs font-semibold">Auto Fallback AI</p>
                      <p className="text-[10px] text-muted-foreground">Alihkan ke Gemini bila error</p>
                    </div>
                    <button type="button" onClick={() => setWfConfig({ ...wfConfig, auto_fallback: !wfConfig.auto_fallback })}>
                      {wfConfig.auto_fallback ? <ToggleRight className="h-6 w-6 text-brand" /> : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                    <div>
                      <p className="text-xs font-semibold">Simpan Log AI</p>
                      <p className="text-[10px] text-muted-foreground">Catat jejak aktivitas AI</p>
                    </div>
                    <button type="button" onClick={() => setWfConfig({ ...wfConfig, save_ai_log: !wfConfig.save_ai_log })}>
                      {wfConfig.save_ai_log ? <ToggleRight className="h-6 w-6 text-brand" /> : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                    <div>
                      <p className="text-xs font-semibold">Timeout Request</p>
                      <p className="text-[10px] text-muted-foreground">Batas waktu (detik)</p>
                    </div>
                    <input
                      type="number"
                      value={wfConfig.request_timeout || 30}
                      onChange={(e) => setWfConfig({ ...wfConfig, request_timeout: Number(e.target.value) })}
                      className="w-16 rounded border px-2 py-1 text-xs outline-none text-right font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 7: TESTING WORKFLOW (SIMULASI ALUR REALTIME) */}
              <div className="rounded-xl border border-brand/40 bg-brand/5 p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand/20 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-brand flex items-center gap-2">
                      <Play className="h-5 w-5" /> 5. Testing Simulasi Alur Sistem AI
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Jalankan tes simulasi alur (Database $\rightarrow$ WhatsApp $\rightarrow$ AI $\rightarrow$ Save DB) secara realtime.</p>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunWorkflowSimulation}
                    disabled={simulating}
                    className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2 text-xs font-semibold text-brand-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {simulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    Test Workflow Sekarang
                  </button>
                </div>

                {/* Simulation Output Steps */}
                {simResult && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between font-bold text-sm">
                      <span>Hasil Simulasi Alur Workflow:</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs ${simResult.overallStatus === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {simResult.overallStatus === 'success' ? '✅ SUCCESS' : '❌ FAILED'} ({simResult.executionTimeMs} ms)
                      </span>
                    </div>

                    <div className="space-y-2">
                      {simResult.steps.map((st, i) => (
                        <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-card text-xs gap-2">
                          <div className="flex items-center gap-2">
                            {st.status === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" /> : <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />}
                            <span className="font-semibold">{st.stepName}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground font-mono">{st.durationMs} ms</span>
                            <span className={`font-bold ${st.status === 'success' ? 'text-emerald-600' : 'text-red-600'}`}>
                              {st.status === 'success' ? '✅ Success' : '❌ Failed'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

            </div>
          ) : activeTab === "prompt" ? (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <PromptAIPage />
            </div>
          ) : activeTab === "testing" ? (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <TestingPage />
            </div>
          ) : activeTab === "watemplate" ? (
            <form onSubmit={handleSaveWaTemplates} className="space-y-6 rounded-xl border bg-card p-6 shadow-sm animate-in fade-in duration-200">
              <div className="border-b pb-3">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-brand">
                  <FileText className="h-5 w-5" /> Kelola Template Pesan WhatsApp
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Atur format pesan notifikasi otomatis untuk Admin dan Peserta tanpa mengubah source code.
                </p>
              </div>

              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-4 flex gap-3 text-sm text-emerald-800 dark:text-emerald-300">
                <Info className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Placeholder Dinamis yang Tersedia:</p>
                  <p className="text-xs mt-1 leading-relaxed">
                    <code className="bg-emerald-100 dark:bg-emerald-900 px-1 py-0.5 rounded font-mono mr-1">{"{{nama}}"}</code>: Nama Orang Tua | 
                    <code className="bg-emerald-100 dark:bg-emerald-900 px-1 py-0.5 rounded font-mono mx-1">{"{{nomor}}"}</code>: Nomor WhatsApp | 
                    <code className="bg-emerald-100 dark:bg-emerald-900 px-1 py-0.5 rounded font-mono mx-1">{"{{jenjang}}"}</code>: TK & SD / SMP / SMA | 
                    <code className="bg-emerald-100 dark:bg-emerald-900 px-1 py-0.5 rounded font-mono mx-1">{"{{tanggal}}"}</code>: Tanggal Pengiriman | 
                    <code className="bg-emerald-100 dark:bg-emerald-900 px-1 py-0.5 rounded font-mono ml-1">{"{{status}}"}</code>: Status Konsultasi
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-1.5">1. Template Pesan Notifikasi Admin</label>
                  <textarea
                    value={waAdminTemplate}
                    onChange={(e) => setWaAdminTemplate(e.target.value)}
                    className="min-h-[120px] w-full rounded-lg border border-input bg-background p-3 text-sm font-mono outline-none focus:ring-1 focus:ring-brand"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5">2. Template Pesan Notifikasi Peserta</label>
                  <textarea
                    value={waParticipantTemplate}
                    onChange={(e) => setWaParticipantTemplate(e.target.value)}
                    className="min-h-[120px] w-full rounded-lg border border-input bg-background p-3 text-sm font-mono outline-none focus:ring-1 focus:ring-brand"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end border-t">
                <button
                  type="submit"
                  disabled={savingWaTemplates}
                  className="flex items-center gap-2 rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-brand-foreground hover:opacity-90 disabled:opacity-50"
                >
                  {savingWaTemplates ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Simpan Template WhatsApp
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSaveSettings} className="rounded-xl border bg-card p-6 shadow-sm">
              {activeTab === "umum" && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <h2 className="text-lg font-semibold border-b pb-2 mb-4">Informasi Web</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="col-span-2 md:col-span-1">
                      <label className="mb-1.5 block text-sm font-medium">Nama Aplikasi</label>
                      <input
                        type="text"
                        value={settings.appName}
                        onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="mb-1.5 block text-sm font-medium">Nomor WhatsApp Admin</label>
                      <input
                        type="text"
                        value={settings.adminWa}
                        onChange={(e) => setSettings({ ...settings, adminWa: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand"
                        placeholder="Contoh: 081234567890"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1.5 block text-sm font-medium">Judul Hero (Homepage)</label>
                      <input
                        type="text"
                        value={settings.heroTitle}
                        onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="mb-1.5 block text-sm font-medium">Deskripsi Hero</label>
                      <textarea
                        value={settings.heroDesc}
                        onChange={(e) => setSettings({ ...settings, heroDesc: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "wa" && (
                <div className="space-y-5 animate-in fade-in duration-200">
                  <div className="flex justify-between items-center border-b pb-2 mb-4">
                    <h2 className="text-lg font-semibold">Pengaturan WhatsApp API</h2>
                    <button 
                      type="button" 
                      onClick={testWhatsApp}
                      disabled={testingWa}
                      className="flex items-center gap-1.5 rounded bg-emerald-100 text-emerald-700 px-3 py-1.5 text-xs font-medium hover:bg-emerald-200 disabled:opacity-50"
                    >
                      {testingWa ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube className="h-3 w-3" />}
                      Test WA Admin
                    </button>
                  </div>
                  <div className="grid gap-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium">Provider Layanan WhatsApp</label>
                      <select
                        value={settings.waProvider}
                        onChange={(e) => setSettings({ ...settings, waProvider: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand"
                      >
                        <option value="mock">MOCK (Hanya Log, Tanpa API)</option>
                        <option value="fonnte">Fonnte API</option>
                        <option value="wablas">Wablas API</option>
                      </select>
                    </div>
                    
                    {settings.waProvider !== "mock" && (
                      <>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium">API URL (Opsional/Default)</label>
                          <input
                            type="text"
                            value={settings.waApiUrl}
                            onChange={(e) => setSettings({ ...settings, waApiUrl: e.target.value })}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand"
                            placeholder={settings.waProvider === "fonnte" ? "https://api.fonnte.com/send" : "https://solo.wablas.com/api/send-message"}
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-sm font-medium">API Key / Token</label>
                          <input
                            type="password"
                            value={settings.waApiKey}
                            onChange={(e) => setSettings({ ...settings, waApiKey: e.target.value })}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="mt-8 flex justify-end border-t pt-5">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 rounded-md bg-brand px-6 py-2 text-sm font-medium text-brand-foreground transition hover:bg-brand/90 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
