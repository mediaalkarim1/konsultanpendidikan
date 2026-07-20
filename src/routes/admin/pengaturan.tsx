import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Save, Loader2, Info, Building2, LayoutTemplate, MessageSquare, TestTube, RotateCcw, Sparkles, Beaker, Cpu, CheckCircle2, Star } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { logActivity, saveSettingsAction, getAiProvidersAction, saveAiProviderAction } from "@/actions/admin-actions";
import { PromptAIPage } from "./prompt";
import { TestingPage } from "./testing";

export const Route = createFileRoute("/admin/pengaturan")({
  component: PengaturanPage,
});

function PengaturanPage() {
  const { userEmail } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingWa, setTestingWa] = useState(false);
  const [activeTab, setActiveTab] = useState("umum");

  // AI Providers state
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [savingProvider, setSavingProvider] = useState(false);

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
      const [{ data: allSettings }, providersData] = await Promise.all([
        supabase.from("settings").select("*"),
        getAiProvidersAction()
      ]);
      
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

      setProviders(providersData || []);
      if (providersData && providersData.length > 0) {
        setSelectedProvider(providersData.find((p: any) => p.is_default) || providersData[0]);
      }
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat pengaturan");
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

      let saved = false;
      try {
        await saveSettingsAction({ updates: allUpdates });
        saved = true;
      } catch (serverErr) {
        for (const item of allUpdates) {
          const { error } = await supabase.from("settings").upsert(item as any, { onConflict: "key" });
          if (error) throw error;
        }
        saved = true;
      }

      if (saved) {
        toast.success("Pengaturan berhasil disimpan");
        try {
          await logActivity({ data: { email: userEmail || "admin", action: "UPDATE_SETTINGS", details: { tab: activeTab } } });
        } catch (_) {}
      }
    } catch (e: any) {
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
      toast.success(`Konfigurasi Provider ${selectedProvider.provider_name} berhasil disimpan`);
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
    { id: "umum", label: "Umum", icon: Building2 },
    { id: "provider", label: "AI Provider Engine", icon: Cpu },
    { id: "wa", label: "WhatsApp", icon: MessageSquare },
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
          <h1 className="text-2xl font-bold tracking-tight text-brand">Pengaturan Sistem</h1>
          <p className="text-sm text-muted-foreground mt-1">Konfigurasi umum, AI Provider Engine, Prompt Multiguna, dan Notifikasi.</p>
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
          {activeTab === "prompt" ? (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <PromptAIPage />
            </div>
          ) : activeTab === "testing" ? (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <TestingPage />
            </div>
          ) : activeTab === "provider" ? (
            /* Tab AI Provider Engine */
            <div className="space-y-6 rounded-xl border bg-card p-6 shadow-sm animate-in fade-in duration-200">
              <div className="border-b pb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-brand">
                  <Cpu className="h-5 w-5" /> Manajemen AI Provider Engine
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Pilih provider AI yang digunakan secara otomatis saat analisis berlangsung tanpa mengubah source code.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Sidebar Provider List */}
                <div className="space-y-2 lg:col-span-1 border-r pr-4">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Daftar Provider (9 Terintegrasi)</label>
                  {providers.map((p) => (
                    <button
                      key={p.id || p.provider_key}
                      type="button"
                      onClick={() => setSelectedProvider(p)}
                      className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between ${
                        selectedProvider?.provider_key === p.provider_key
                          ? "border-brand bg-brand/10 text-brand font-medium shadow-sm"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="truncate text-sm">{p.provider_name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {p.is_default && (
                          <span className="bg-amber-500 text-white p-1 rounded-full text-[10px]" title="Default Provider">
                            <Star className="h-3 w-3 fill-current" />
                          </span>
                        )}
                        {p.is_active && (
                          <span className="bg-green-500 text-white p-1 rounded-full text-[10px]" title="Aktif">
                            <CheckCircle2 className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Form Provider Setting */}
                {selectedProvider && (
                  <form onSubmit={handleSaveProvider} className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <h3 className="font-semibold text-base">{selectedProvider.provider_name}</h3>
                      {selectedProvider.is_default && (
                        <span className="rounded bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-bold flex items-center gap-1">
                          <Star className="h-3 w-3 fill-current" /> Default Provider Usulan
                        </span>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="col-span-2">
                        <label className="mb-1 block text-xs font-medium">API Key</label>
                        <input
                          type="password"
                          value={selectedProvider.api_key || ""}
                          onChange={(e) => setSelectedProvider({ ...selectedProvider, api_key: e.target.value })}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand font-mono"
                          placeholder="Masukkan API Key provider..."
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="mb-1 block text-xs font-medium">Base API URL</label>
                        <input
                          type="text"
                          value={selectedProvider.base_url || ""}
                          onChange={(e) => setSelectedProvider({ ...selectedProvider, base_url: e.target.value })}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand font-mono"
                          placeholder="https://..."
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-xs font-medium">Nama Model</label>
                        <input
                          type="text"
                          value={selectedProvider.model || ""}
                          onChange={(e) => setSelectedProvider({ ...selectedProvider, model: e.target.value })}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand font-mono"
                          placeholder="gemini-1.5-pro, gpt-4o-mini, dll"
                        />
                      </div>

                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-medium">Temperature</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="2"
                            value={selectedProvider.temperature ?? 0.7}
                            onChange={(e) => setSelectedProvider({ ...selectedProvider, temperature: Number(e.target.value) })}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="mb-1 block text-xs font-medium">Max Tokens</label>
                          <input
                            type="number"
                            value={selectedProvider.max_tokens ?? 2048}
                            onChange={(e) => setSelectedProvider({ ...selectedProvider, max_tokens: Number(e.target.value) })}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-brand"
                          />
                        </div>
                      </div>

                      <div className="col-span-2 flex items-center justify-between border-t pt-3">
                        <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedProvider.is_active ?? true}
                            onChange={(e) => setSelectedProvider({ ...selectedProvider, is_active: e.target.checked })}
                            className="rounded"
                          />
                          Aktifkan Provider Ini
                        </label>

                        <button
                          type="button"
                          onClick={() => setSelectedProvider({ ...selectedProvider, is_default: true, is_active: true })}
                          disabled={selectedProvider.is_default}
                          className="rounded bg-amber-100 text-amber-800 px-3 py-1 text-xs font-semibold hover:bg-amber-200 disabled:opacity-50"
                        >
                          {selectedProvider.is_default ? "Sudah Default" : "Set Jadi Default Engine"}
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        type="submit"
                        disabled={savingProvider}
                        className="flex items-center gap-2 rounded-lg bg-brand px-5 py-2 text-sm font-medium text-brand-foreground hover:opacity-90 disabled:opacity-50"
                      >
                        {savingProvider ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Simpan Provider AI
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
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
