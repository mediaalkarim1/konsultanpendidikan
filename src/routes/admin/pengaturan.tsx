import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getAdminSettings, saveAdminSetting } from "@/server/admin-settings";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pengaturan")({
  component: PengaturanPage,
});

function PengaturanPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Public settings
  const [settings, setSettings] = useState({
    appName: "EduKonsul",
    heroTitle: "Konsultasi & Rekomendasi Pendidikan Untuk Anak",
    heroDesc: "Temukan rekomendasi pendidikan terbaik sesuai jenjang pendidikan anak.",
    adminWa: "",
    footerText: "© EduKonsul — Sekolah Alam Al-Karim.",
  });

  // Private settings
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-1.5-pro");
  const [waProviderName, setWaProviderName] = useState("mock");
  const [waApiKey, setWaApiKey] = useState("");

  useEffect(() => {
    async function fetchSettings() {
      // 1. Fetch public settings directly via client
      const { data: publicData } = await supabase.from("settings").select("*");
      if (publicData) {
        const brandObj = publicData.find(s => s.key === "site.brand")?.value || {};
        const heroObj = publicData.find(s => s.key === "site.hero")?.value || {};
        const contactObj = publicData.find(s => s.key === "site.contact")?.value || {};
        const footerObj = publicData.find(s => s.key === "site.footer")?.value || {};
        
        setSettings(prev => ({
          appName: brandObj.name || prev.appName,
          heroTitle: heroObj.title || prev.heroTitle,
          heroDesc: heroObj.description || prev.heroDesc,
          adminWa: contactObj.whatsapp || prev.adminWa,
          footerText: footerObj.text || prev.footerText,
        }));
      }

      // 2. Fetch private settings via secure server function
      try {
        const privateData = await getAdminSettings({ data: "mediaalkarim" });
        const aiKey = privateData.find((s: any) => s.key === "ai.gemini_key")?.value?.key;
        const aiModel = privateData.find((s: any) => s.key === "ai.gemini_model")?.value?.model;
        const wa = privateData.find((s: any) => s.key === "wa.provider")?.value;
        
        if (aiKey) setGeminiKey(aiKey);
        if (aiModel) setGeminiModel(aiModel);
        if (wa) {
          setWaProviderName(wa.name || "mock");
          setWaApiKey(wa.api_key || "");
        }
      } catch (e) {
        console.error("Gagal mengambil pengaturan privat", e);
      }

      setLoading(false);
    }
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Save public settings directly
    const publicUpdates = [
      { key: "site.brand", value: { name: settings.appName }, is_public: true },
      { key: "site.hero", value: { title: settings.heroTitle, description: settings.heroDesc }, is_public: true },
      { key: "site.contact", value: { whatsapp: settings.adminWa }, is_public: true },
      { key: "site.footer", value: { text: settings.footerText }, is_public: true },
    ];

    let success = true;
    for (const item of publicUpdates) {
      const { error } = await supabase.from("settings").upsert(item);
      if (error) success = false;
    }

    // Save private settings via server function
    try {
      await saveAdminSetting({ data: { token: "mediaalkarim", key: "ai.gemini_key", value: { key: geminiKey } } });
      await saveAdminSetting({ data: { token: "mediaalkarim", key: "ai.gemini_model", value: { model: geminiModel } } });
      await saveAdminSetting({ data: { token: "mediaalkarim", key: "wa.provider", value: { name: waProviderName, api_key: waApiKey } } });
    } catch (e) {
      success = false;
    }

    if (success) {
      toast.success("Pengaturan berhasil disimpan");
    } else {
      toast.error("Gagal menyimpan beberapa pengaturan");
    }
    setSaving(false);
  };

  if (loading) return <div className="py-10 text-center">Memuat pengaturan...</div>;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan Aplikasi</h1>
        <p className="text-sm text-muted-foreground">Konfigurasi situs, Google Gemini, dan Notifikasi WA.</p>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Kolom Kiri: Tampilan Situs */}
        <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-bold">Tampilan Situs</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Nama Aplikasi</label>
              <input type="text" value={settings.appName} onChange={(e) => setSettings({ ...settings, appName: e.target.value })} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand" />
            </div>
            
            <div>
              <label className="mb-1.5 block text-sm font-medium">Judul Hero</label>
              <input type="text" value={settings.heroTitle} onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand" />
            </div>
            
            <div>
              <label className="mb-1.5 block text-sm font-medium">Deskripsi Hero</label>
              <textarea rows={3} value={settings.heroDesc} onChange={(e) => setSettings({ ...settings, heroDesc: e.target.value })} className="w-full resize-none rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand" />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Nomor WhatsApp Admin (Utama)</label>
              <input type="text" placeholder="Contoh: +628123456789" value={settings.adminWa} onChange={(e) => setSettings({ ...settings, adminWa: e.target.value })} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand" />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Teks Footer</label>
              <input type="text" value={settings.footerText} onChange={(e) => setSettings({ ...settings, footerText: e.target.value })} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand" />
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Integrasi Pihak Ketiga */}
        <div className="space-y-6">
          <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold">Integrasi Google Gemini</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Gemini API Key</label>
                <input type="password" placeholder="AIzaSy..." value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand" />
                <p className="mt-1 text-xs text-muted-foreground">Kunci API tersimpan secara rahasia di backend.</p>
              </div>
              
              <div>
                <label className="mb-1.5 block text-sm font-medium">Gemini Model</label>
                <select value={geminiModel} onChange={(e) => setGeminiModel(e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand">
                  <option value="gemini-1.5-pro">gemini-1.5-pro (Rekomendasi)</option>
                  <option value="gemini-1.5-flash">gemini-1.5-flash (Cepat)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-bold">API WhatsApp (Notifikasi)</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">WhatsApp Provider</label>
                <select value={waProviderName} onChange={(e) => setWaProviderName(e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand">
                  <option value="mock">Tanpa API (Hanya Log Server)</option>
                  <option value="fonnte">Fonnte</option>
                  <option value="wablas">Wablas</option>
                </select>
              </div>
              
              {waProviderName !== "mock" && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium">API Key / Token WhatsApp</label>
                  <input type="password" value={waApiKey} onChange={(e) => setWaApiKey(e.target.value)} className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand" />
                </div>
              )}
            </div>
          </div>

          <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-3 text-sm font-medium text-brand-foreground shadow-sm hover:opacity-90 disabled:opacity-70">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Simpan Semua Pengaturan
          </button>
        </div>
      </form>
    </div>
  );
}
