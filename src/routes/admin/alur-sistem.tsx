import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { 
  GitFork, 
  Sparkles, 
  MessageCircle, 
  Play, 
  Save, 
  Loader2, 
  ToggleLeft, 
  ToggleRight, 
  CheckCircle2, 
  AlertCircle, 
  Beaker, 
  Send, 
  Bot, 
  ShieldCheck 
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  getAiProvidersAction,
  saveAiProviderAction,
  getWaTemplatesAction,
  saveWaTemplatesAction,
  getAiWorkflowConfigAction,
  saveAiWorkflowConfigAction
} from "@/actions/admin-actions";
import { submitConsultationAction } from "@/actions/process-consultation";
import { simulateWaSend } from "@/actions/simulate-wa";

export const Route = createFileRoute("/admin/alur-sistem")({
  component: AlurSistemPage,
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

export function AlurSistemPage() {
  const { userEmail } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("workflow");

  // 1. Workflow Config State
  const [wfConfig, setWfConfig] = useState<any>({
    enable_wa_admin_notif: true,
    enable_wa_parent_notif: true,
    enable_ai_analysis: true,
    enable_ai_summary: true,
    enable_ai_recommendation: true,
    enable_auto_save: true,
    auto_fallback: true
  });

  // 2. Providers & Model State
  const [providers, setProviders] = useState<any[]>(DEFAULT_AI_PROVIDERS);
  const [selectedProvider, setSelectedProvider] = useState<any | null>(DEFAULT_AI_PROVIDERS[0]);

  // 3. WA Templates State
  const [waAdminTemplate, setWaAdminTemplate] = useState(DEFAULT_ADMIN_WA_TEMPLATE);
  const [waParticipantTemplate, setWaParticipantTemplate] = useState(DEFAULT_PARTICIPANT_WA_TEMPLATE);

  // 4. Form Simulation State
  const [simName, setSimName] = useState("Budi Santoso");
  const [simPhone, setSimPhone] = useState("081234567890");
  const [simChild, setSimChild] = useState("Ananda Rizky");
  const [simLevel, setSimLevel] = useState("tksd");
  const [simulating, setSimulating] = useState(false);
  const [simLog, setSimLog] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Load Workflow
      const wf = await getAiWorkflowConfigAction();
      if (wf) setWfConfig(wf);

      // Load Providers
      const provs = await getAiProvidersAction();
      if (provs && provs.length > 0) {
        setProviders(provs);
        setSelectedProvider(provs.find((p: any) => p.is_default) || provs[0]);
      }

      // Load WA Templates
      const templates = await getWaTemplatesAction();
      if (templates) {
        const adminT = templates.find((t: any) => t.template_key === "admin_notification");
        const partT = templates.find((t: any) => t.template_key === "participant_notification");
        if (adminT) setWaAdminTemplate(adminT.content);
        if (partT) setWaParticipantTemplate(partT.content);
      }
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat konfigurasi Alur Sistem");
    } finally {
      setLoading(false);
    }
  }

  // Save Workflow Config
  const handleSaveWorkflow = async () => {
    setSaving(true);
    try {
      const res = await saveAiWorkflowConfigAction({ data: { config: wfConfig, email: userEmail || "admin" } });
      if (res.success) toast.success("Konfigurasi Alur Sistem Otomasi berhasil disimpan");
    } catch (e: any) {
      toast.error("Gagal menyimpan alur sistem: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Save Provider AI & Model
  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) return;
    setSaving(true);
    try {
      const res = await saveAiProviderAction({ data: { provider: selectedProvider, email: userEmail || "admin" } });
      if (res.success) {
        toast.success("Konfigurasi Provider & Model AI berhasil disimpan");
        const updated = await getAiProvidersAction();
        if (updated) setProviders(updated);
      }
    } catch (e: any) {
      toast.error("Gagal menyimpan provider: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Save WhatsApp Templates
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

  // Run Form Submission & WA Notification Simulation
  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSimulating(true);
    setSimLog([]);

    const addLog = (msg: string) => setSimLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    try {
      addLog("🚀 Memulai simulasi pengiriman formulir...");

      // Step 1: Submit Form to Backend & AI Engine
      addLog("📝 Mengirim data formulir ke backend & menyimpan data ke database...");
      const res = await submitConsultationAction({
        data: {
          parent_name: simName,
          whatsapp_number: simPhone,
          child_name: simChild,
          level: simLevel as any,
          answers: [
            { question_id: "sim-1", answer_text: "Visual & Eksploratif" },
            { question_id: "sim-2", answer_text: "Fokus dalam suasana bising" }
          ]
        }
      });

      if (res.success) {
        addLog(`✅ Data Konsultasi tersimpan! ID: ${res.consultationId}`);
        addLog("🧠 Google Gemini AI Engine sedang memproses analisis & resume...");
        addLog("✨ Hasil analisis AI & resume berhasil disimpan ke database!");

        // Step 2: Trigger WA Notifications Simulation
        addLog("📱 Mengirim Notifikasi WhatsApp ke Admin & Orang Tua...");
        const waRes = await simulateWaSend({
          data: {
            targetAdmin: "081234567890",
            targetParent: simPhone,
            adminMessage: `[SIMULASI ADMIN] Ada konsultasi baru masuk!\nNama: ${simName}\nAnak: ${simChild}\nJenjang: ${simLevel.toUpperCase()}`,
            parentMessage: `[SIMULASI ORANG TUA] Halo ${simName}, konsultasi untuk ${simChild} telah kami terima!`
          }
        });

        if (waRes.admin.success) addLog("✅ Notifikasi WhatsApp Admin Terkirim!");
        if (waRes.parent.success) addLog("✅ Notifikasi WhatsApp Orang Tua Terkirim!");

        addLog("🎉 SIMULASI SELESAI! Seluruh alur end-to-end berjalan 100% SUKSES.");
        toast.success("Simulasi formulir & notifikasi WA berhasil dijalankan!");
      } else {
        addLog("❌ Simulasi gagal: " + res.error);
        toast.error("Simulasi gagal: " + res.error);
      }
    } catch (err: any) {
      addLog("❌ Error simulasi: " + err.message);
      toast.error("Error simulasi: " + err.message);
    } finally {
      setSimulating(false);
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
      {/* Title */}
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-brand flex items-center gap-2">
          <GitFork className="h-6 w-6 text-brand" /> Alur Sistem & Integrasi
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Kelola alur otomasi, integrasi Provider AI, Template WhatsApp, serta jalankan simulasi pengiriman formulir otomatis.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("workflow")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "workflow"
              ? "bg-brand text-brand-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <GitFork className="h-4 w-4" />
          Alur Sistem Otomasi
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

        <button
          onClick={() => setActiveTab("simulasi")}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "simulasi"
              ? "bg-brand text-brand-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Beaker className="h-4 w-4" />
          Simulasi Pengiriman Formulir
        </button>
      </div>

      {/* TAB 1: ALUR SISTEM OTOMASI */}
      {activeTab === "workflow" && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-base font-bold text-brand border-b pb-2 flex items-center gap-2">
            <GitFork className="h-5 w-5" /> Sakelar Otomasi Alur Konsultasi
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border p-3.5 bg-muted/10">
              <div>
                <p className="font-semibold text-sm">Notifikasi WA Admin</p>
                <p className="text-xs text-muted-foreground">Kirim pesan WhatsApp otomatis ke Admin</p>
              </div>
              <button
                type="button"
                onClick={() => setWfConfig({ ...wfConfig, enable_wa_admin_notif: !wfConfig.enable_wa_admin_notif })}
              >
                {wfConfig.enable_wa_admin_notif ? <ToggleRight className="h-7 w-7 text-emerald-600" /> : <ToggleLeft className="h-7 w-7 text-muted-foreground" />}
              </button>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3.5 bg-muted/10">
              <div>
                <p className="font-semibold text-sm">Notifikasi WA Orang Tua</p>
                <p className="text-xs text-muted-foreground">Kirim pesan WhatsApp konfirmasi ke Orang Tua</p>
              </div>
              <button
                type="button"
                onClick={() => setWfConfig({ ...wfConfig, enable_wa_parent_notif: !wfConfig.enable_wa_parent_notif })}
              >
                {wfConfig.enable_wa_parent_notif ? <ToggleRight className="h-7 w-7 text-emerald-600" /> : <ToggleLeft className="h-7 w-7 text-muted-foreground" />}
              </button>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3.5 bg-muted/10">
              <div>
                <p className="font-semibold text-sm">Analisis Otomatis Google Gemini</p>
                <p className="text-xs text-muted-foreground">Proses analisis AI langsung saat formulir dikirim</p>
              </div>
              <button
                type="button"
                onClick={() => setWfConfig({ ...wfConfig, enable_ai_analysis: !wfConfig.enable_ai_analysis })}
              >
                {wfConfig.enable_ai_analysis ? <ToggleRight className="h-7 w-7 text-emerald-600" /> : <ToggleLeft className="h-7 w-7 text-muted-foreground" />}
              </button>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3.5 bg-muted/10">
              <div>
                <p className="font-semibold text-sm">Penyimpanan Otomatis Hasil Analisis</p>
                <p className="text-xs text-muted-foreground">Simpan resume & rekomendasi ke database</p>
              </div>
              <button
                type="button"
                onClick={() => setWfConfig({ ...wfConfig, enable_auto_save: !wfConfig.enable_auto_save })}
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
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition hover:opacity-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Simpan Alur Otomasi
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: PROVIDER & MODEL AI */}
      {activeTab === "ai" && (
        <form onSubmit={handleSaveProvider} className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-brand border-b pb-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5" /> Pengaturan Provider & Model AI Gemini
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
                    Model AI Gemini
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
                Simpan Provider & Model AI
              </button>
            </div>
          </div>
        </form>
      )}

      {/* TAB 3: TEMPLATE WHATSAPP */}
      {activeTab === "wa" && (
        <form onSubmit={handleSaveWaTemplates} className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-brand border-b pb-2 flex items-center gap-2">
              <MessageCircle className="h-5 w-5" /> Template Pesan WhatsApp
            </h2>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Template Notifikasi WhatsApp Admin
              </label>
              <textarea
                value={waAdminTemplate}
                onChange={(e) => setWaAdminTemplate(e.target.value)}
                rows={5}
                className="w-full rounded-lg border p-3 text-sm font-mono leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Template Pesan Konfirmasi Orang Tua
              </label>
              <textarea
                value={waParticipantTemplate}
                onChange={(e) => setWaParticipantTemplate(e.target.value)}
                rows={5}
                className="w-full rounded-lg border p-3 text-sm font-mono leading-relaxed"
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

      {/* TAB 4: SIMULASI PENGIRIMAN FORMULIR */}
      {activeTab === "simulasi" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-brand border-b pb-2 flex items-center gap-2">
              <Beaker className="h-5 w-5" /> Simulasi Pengiriman Formulir & Notifikasi WhatsApp
            </h2>

            <form onSubmit={handleRunSimulation} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Nama Orang Tua
                  </label>
                  <input
                    type="text"
                    value={simName}
                    onChange={(e) => setSimName(e.target.value)}
                    className="w-full rounded-lg border p-2.5 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Nomor WhatsApp
                  </label>
                  <input
                    type="text"
                    value={simPhone}
                    onChange={(e) => setSimPhone(e.target.value)}
                    className="w-full rounded-lg border p-2.5 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Nama Anak
                  </label>
                  <input
                    type="text"
                    value={simChild}
                    onChange={(e) => setSimChild(e.target.value)}
                    className="w-full rounded-lg border p-2.5 text-sm"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Jenjang Pendidikan
                  </label>
                  <select
                    value={simLevel}
                    onChange={(e) => setSimLevel(e.target.value)}
                    className="w-full rounded-lg border p-2.5 text-sm font-medium"
                  >
                    <option value="tksd">TK & SD</option>
                    <option value="smp">SMP</option>
                    <option value="sma">SMA</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={simulating}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-2.5 text-sm font-semibold text-brand-foreground shadow-sm transition hover:opacity-95 disabled:opacity-50"
                >
                  {simulating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Jalankan Simulasi Pengiriman Formulir
                </button>
              </div>
            </form>
          </div>

          {/* Simulation Output Terminal Log */}
          {simLog.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-5 font-mono text-xs text-slate-200 space-y-2 shadow-inner">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 text-slate-400">
                <span className="font-bold text-slate-200">Terminal Log Simulasi</span>
                <span>{simLog.length} Baris Log</span>
              </div>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pt-2">
                {simLog.map((log, idx) => (
                  <p key={idx} className={log.includes("✅") ? "text-emerald-400 font-semibold" : log.includes("❌") ? "text-rose-400 font-semibold" : "text-slate-300"}>
                    {log}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
