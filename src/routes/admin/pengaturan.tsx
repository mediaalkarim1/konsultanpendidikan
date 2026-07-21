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
  Layout 
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { saveHomepageSettingsAction } from "@/actions/admin-actions";

export const Route = createFileRoute("/admin/pengaturan")({
  component: PengaturanPage,
});

export function PengaturanPage() {
  const { userEmail } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Homepage CMS Form State
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
        setHomeForm((prev) => ({ ...prev, ...(homeSetting.value as any) }));
      }
    } catch (e) {
      console.error(e);
      toast.error("Gagal memuat pengaturan Homepage");
    } finally {
      setLoading(false);
    }
  }

  const handleSaveHomepage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await saveHomepageSettingsAction({
        data: {
          config: homeForm,
          email: userEmail || "admin"
        }
      });

      if (res.success) {
        toast.success("Tampilan & Konten Homepage berhasil diperbarui secara Realtime!");
      } else {
        toast.error("Gagal menyimpan tampilan homepage: " + (res.error || "Error server"));
      }
    } catch (err: any) {
      toast.error("Gagal menyimpan tampilan homepage: " + err.message);
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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-brand flex items-center gap-2">
            <Layout className="h-6 w-6 text-brand" /> Pengaturan Tampilan Homepage
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Edit teks, judul banner, kartu jenjang pendidikan, dan footer yang tampil di Halaman Utama secara realtime.
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
    </div>
  );
}
