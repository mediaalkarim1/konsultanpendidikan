import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/pengaturan")({
  component: PengaturanPage,
});

function PengaturanPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    appName: "EduKonsul",
    heroTitle: "Konsultasi & Rekomendasi Pendidikan Untuk Anak",
    heroDesc: "Temukan rekomendasi pendidikan terbaik sesuai jenjang pendidikan anak.",
    adminWa: "",
    footerText: "© EduKonsul — Sekolah Alam Al-Karim.",
  });

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase.from("settings").select("*");
      if (data) {
        const brandObj = data.find(s => s.key === "site.brand")?.value || {};
        const heroObj = data.find(s => s.key === "site.hero")?.value || {};
        const contactObj = data.find(s => s.key === "site.contact")?.value || {};
        const footerObj = data.find(s => s.key === "site.footer")?.value || {};
        
        setSettings(prev => ({
          appName: brandObj.name || prev.appName,
          heroTitle: heroObj.title || prev.heroTitle,
          heroDesc: heroObj.description || prev.heroDesc,
          adminWa: contactObj.whatsapp || prev.adminWa,
          footerText: footerObj.text || prev.footerText,
        }));
      }
      setLoading(false);
    }
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    const updates = [
      { key: "site.brand", value: { name: settings.appName }, is_public: true },
      { key: "site.hero", value: { title: settings.heroTitle, description: settings.heroDesc }, is_public: true },
      { key: "site.contact", value: { whatsapp: settings.adminWa }, is_public: true },
      { key: "site.footer", value: { text: settings.footerText }, is_public: true },
    ];

    let success = true;
    for (const item of updates) {
      const { error } = await supabase.from("settings").upsert(item);
      if (error) success = false;
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
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pengaturan Aplikasi</h1>
        <p className="text-sm text-muted-foreground">Ubah informasi umum terkait situs web EduKonsul.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">Nama Aplikasi</label>
            <input
              type="text"
              value={settings.appName}
              onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          
          <div>
            <label className="mb-1.5 block text-sm font-medium">Judul Hero (Halaman Depan)</label>
            <input
              type="text"
              value={settings.heroTitle}
              onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
          
          <div>
            <label className="mb-1.5 block text-sm font-medium">Deskripsi Hero</label>
            <textarea
              rows={3}
              value={settings.heroDesc}
              onChange={(e) => setSettings({ ...settings, heroDesc: e.target.value })}
              className="w-full resize-none rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Nomor WhatsApp Admin</label>
            <input
              type="text"
              placeholder="Contoh: +628123456789"
              value={settings.adminWa}
              onChange={(e) => setSettings({ ...settings, adminWa: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium">Teks Footer</label>
            <input
              type="text"
              value={settings.footerText}
              onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
              className="w-full rounded-lg border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-sm font-medium text-brand-foreground shadow-sm hover:opacity-90 disabled:opacity-70 sm:w-auto"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan Pengaturan
        </button>
      </form>
    </div>
  );
}
