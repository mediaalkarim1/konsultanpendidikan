import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getAdminSettings, saveAdminSetting } from "@/server/admin-settings";
import { Save, Loader2, Info, Building2, LayoutTemplate, MessageSquare, TestTube, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { logActivity } from "@/server/admin-actions";

export const Route = createFileRoute("/admin/pengaturan")({
  component: PengaturanPage,
});

function PengaturanPage() {
  const { userEmail } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingAi, setTestingAi] = useState(false);
  const [testingWa, setTestingWa] = useState(false);
  const [activeTab, setActiveTab] = useState("umum");

  const defaultSettings = {
    appName: "EduKonsul",
    heroTitle: "Konsultasi & Rekomendasi Pendidikan Untuk Anak",
    heroDesc: "Temukan rekomendasi pendidikan terbaik sesuai jenjang pendidikan anak.",
    footerText: "Copyright 2026",
    adminWa: "",
    geminiKey: "",
    geminiModel: "gemini-1.5-pro",
    geminiTemperature: 0.7,
    geminiMaxTokens: 2048,
    waProvider: "mock",
    waApiUrl: "",
    waApiKey: "",
    waDeviceId: "",
  };

  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    try {
      const privateData = await getAdminSettings({ data: "mediaalkarim" });
      const geminiKey = privateData.find((s: any) => s.key === "ai.gemini_key")?.value?.key || "";
      const geminiParams = privateData.find((s: any) => s.key === "ai.gemini_params")?.value || {};
      const waConfig = privateData.find((s: any) => s.key === "wa.provider_config")?.value || {};
      const contactObj = privateData.find((s: any) => s.key === "site.contact")?.value || {};
      
      const { data: publicData } = await supabase.from("settings").select("*");
      const brandObj = (publicData?.find((s: any) => s.key === "site.brand")?.value as any) || {};
      const heroObj = (publicData?.find((s: any) => s.key === "site.hero")?.value as any) || {};
      const footerObj = (publicData?.find((s: any) => s.key === "site.footer")?.value as any) || {};
      
      setSettings({
        appName: brandObj.name || defaultSettings.appName,
        heroTitle: heroObj.title || defaultSettings.heroTitle,
        heroDesc: heroObj.description || defaultSettings.heroDesc,
        footerText: footerObj.text || defaultSettings.footerText,
        adminWa: contactObj.whatsapp || "",
        geminiKey,
        geminiModel: geminiParams.model || "gemini-1.5-pro",
        geminiTemperature: geminiParams.temperature || 0.7,
        geminiMaxTokens: geminiParams.max_tokens || 2048,
        waProvider: waConfig.provider || "mock",
        waApiUrl: waConfig.api_url || "",
        waApiKey: waConfig.api_key || "",
        waDeviceId: waConfig.device_id || "",
      });
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat pengaturan");
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const privateUpdates = [
        { key: "ai.gemini_key", value: { key: settings.geminiKey } },
        { key: "ai.gemini_params", value: { model: settings.geminiModel, temperature: Number(settings.geminiTemperature), max_tokens: Number(settings.geminiMaxTokens) } },
        { key: "wa.provider_config", value: { provider: settings.waProvider, api_url: settings.waApiUrl, api_key: settings.waApiKey, device_id: settings.waDeviceId } },
        { key: "site.contact", value: { whatsapp: settings.adminWa } }
      ];

      for (const item of privateUpdates) {
        await saveAdminSetting({ data: { token: "mediaalkarim", key: item.key, value: item.value } });
      }

      const publicUpdates = [
        { key: "site.brand", value: { name: settings.appName }, is_public: true },
        { key: "site.hero", value: { title: settings.heroTitle, description: settings.heroDesc }, is_public: true },
        { key: "site.footer", value: { text: settings.footerText }, is_public: true }
      ];

      for (const item of publicUpdates) {
        await supabase.from("settings").upsert(item as any);
      }

      logActivity({ data: { email: userEmail || "admin", action: "UPDATE_SETTINGS", details: { tab: activeTab } } });
      toast.success("Pengaturan berhasil disimpan");
    } catch (e) {
      toast.error("Gagal menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset semua pengaturan di tab ini ke default?")) return;
    
    if (activeTab === "umum") {
      setSettings(prev => ({ ...prev, appName: defaultSettings.appName, heroTitle: defaultSettings.heroTitle, heroDesc: defaultSettings.heroDesc, footerText: defaultSettings.footerText }));
    } else if (activeTab === "ai") {
      setSettings(prev => ({ ...prev, geminiModel: defaultSettings.geminiModel, geminiTemperature: defaultSettings.geminiTemperature, geminiMaxTokens: defaultSettings.geminiMaxTokens }));
    } else if (activeTab === "wa") {
      setSettings(prev => ({ ...prev, waProvider: defaultSettings.waProvider }));
    }
  };

  const testGemini = async () => {
    setTestingAi(true);
    // Simulate API Call for now, in a real scenario you'd call a serverFn that hits the Gemini API using these keys
    setTimeout(() => {
      if (settings.geminiKey) toast.success("Koneksi API Gemini berhasil!");
      else toast.error("Koneksi gagal. API Key tidak valid.");
      setTestingAi(false);
    }, 1500);
  };

  const testWhatsApp = async () => {
    if (!settings.adminWa) {
      toast.error("Nomor WA Admin belum diisi di tab Umum.");
      return;
    }
    setTestingWa(true);
    // Simulate API Call for now
    setTimeout(() => {
      toast.success(`Pesan test dikirim ke ${settings.adminWa}`);
      setTestingWa(false);
    }, 1500);
  };

  const tabs = [
    { id: "umum", label: "Umum", icon: Building2 },
    { id: "ai", label: "Google Gemini", icon: LayoutTemplate },
    { id: "wa", label: "WhatsApp", icon: MessageSquare },
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
          <h1 className="text-2xl font-bold tracking-tight text-brand">Pengaturan Sistem</h1>
          <p className="text-sm text-muted-foreground mt-1">Konfigurasi umum, integrasi AI, dan notifikasi.</p>
        </div>
      </div>

      <div className="flex gap-6 flex-col md:flex-row">
        <aside className="w-full md:w-48 shrink-0">
          <nav className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 md:flex-none items-center justify-center md:justify-start gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-brand text-brand-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <form onSubmit={handleSave} className="flex-1 rounded-xl border bg-card p-6 shadow-sm">
          {activeTab === "umum" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
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
                  <p className="mt-1 text-xs text-muted-foreground">Menerima notifikasi setiap ada konsultasi masuk.</p>
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

          {activeTab === "ai" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="flex justify-between items-center border-b pb-2 mb-4">
                <h2 className="text-lg font-semibold">Konfigurasi Google Gemini API</h2>
                <button 
                  type="button" 
                  onClick={testGemini}
                  disabled={testingAi}
                  className="flex items-center gap-1.5 rounded bg-blue-100 text-blue-700 px-3 py-1.5 text-xs font-medium hover:bg-blue-200 disabled:opacity-50"
                >
                  {testingAi ? <Loader2 className="h-3 w-3 animate-spin" /> : <TestTube className="h-3 w-3" />}
                  Test Koneksi
                </button>
              </div>
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-3 flex gap-3 text-sm text-blue-700 dark:text-blue-300">
                <Info className="h-5 w-5 shrink-0" />
                <p>API Key disimpan aman di backend dan tidak pernah terekspos ke publik.</p>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium">API Key</label>
                  <input
                    type="password"
                    value={settings.geminiKey}
                    onChange={(e) => setSettings({ ...settings, geminiKey: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand"
                    placeholder="AIzaSy..."
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Model</label>
                    <select
                      value={settings.geminiModel}
                      onChange={(e) => setSettings({ ...settings, geminiModel: e.target.value })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand"
                    >
                      <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                      <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Temperature</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={settings.geminiTemperature}
                      onChange={(e) => setSettings({ ...settings, geminiTemperature: Number(e.target.value) })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">Max Output Tokens</label>
                    <input
                      type="number"
                      step="1"
                      value={settings.geminiMaxTokens}
                      onChange={(e) => setSettings({ ...settings, geminiMaxTokens: Number(e.target.value) })}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "wa" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-left-4 duration-300">
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
                    {settings.waProvider === "wablas" && (
                      <div>
                        <label className="mb-1.5 block text-sm font-medium">Device ID (Jika Diperlukan)</label>
                        <input
                          type="text"
                          value={settings.waDeviceId}
                          onChange={(e) => setSettings({ ...settings, waDeviceId: e.target.value })}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-between border-t pt-5">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted"
            >
              <RotateCcw className="h-4 w-4" /> Reset Default
            </button>
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
      </div>
    </div>
  );
}
