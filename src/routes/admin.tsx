import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  isLoggedIn,
  logout,
  useSiteContent,
  setContent,
  resetContent,
  defaultContent,
  type SiteContent,
} from "@/lib/site-content";
import { LogOut, Save, Settings, LinkIcon, Home, Menu, X, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type Tab = "content" | "links";

function AdminPage() {
  const navigate = useNavigate();
  const content = useSiteContent();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("content");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [draft, setDraft] = useState<SiteContent>(content);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate({ to: "/login" });
      return;
    }
    setReady(true);
  }, [navigate]);

  useEffect(() => {
    setDraft(content);
  }, [content]);

  if (!ready) return null;

  function save() {
    setContent(draft);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  function onLogout() {
    logout();
    navigate({ to: "/login" });
  }

  function updateLevel(idx: number, patch: Partial<SiteContent["levels"][number]>) {
    setDraft({
      ...draft,
      levels: draft.levels.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    });
  }

  const nav = [
    { id: "content" as const, label: "Pengaturan Website", icon: Settings },
    { id: "links" as const, label: "Link Rekomendasi", icon: LinkIcon },
  ];

  return (
    <div className="min-h-screen bg-muted/30 font-sans">
      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
        <button
          onClick={() => setSidebarOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-lg hover:bg-muted"
          aria-label="Buka menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-semibold">Dashboard Admin</span>
        <button
          onClick={onLogout}
          className="grid h-10 w-10 place-items-center rounded-lg text-destructive hover:bg-destructive/10"
          aria-label="Keluar"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>

      <div className="flex">
        {/* Sidebar */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-foreground/40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-2">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-brand-foreground font-bold">
                {draft.logo.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{draft.logo}</p>
                <p className="text-xs text-muted-foreground">Admin Panel</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="grid h-9 w-9 place-items-center rounded-lg hover:bg-muted lg:hidden"
              aria-label="Tutup menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setTab(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`flex w-full min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium transition ${
                    active
                      ? "bg-brand text-brand-foreground shadow-sm"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
            <Link
              to="/"
              className="flex min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium text-foreground hover:bg-muted"
            >
              <Home className="h-4 w-4" /> Lihat Website
            </Link>
          </nav>
          <div className="border-t border-border p-3">
            <button
              onClick={onLogout}
              className="flex w-full min-h-[44px] items-center gap-3 rounded-lg px-3 text-sm font-medium text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-4 w-4" /> Logout
            </button>
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold sm:text-3xl">
                  {tab === "content" ? "Pengaturan Website" : "Link Rekomendasi"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {tab === "content"
                    ? "Ubah seluruh konten website tanpa mengubah kode."
                    : "Kelola link tujuan tombol Lihat Rekomendasi."}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (confirm("Reset ke konten default?")) {
                      resetContent();
                      setDraft(defaultContent);
                    }
                  }}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-input bg-background px-4 text-sm font-medium hover:bg-muted"
                >
                  <RotateCcw className="h-4 w-4" /> Reset
                </button>
                <button
                  onClick={save}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-accent-green px-4 text-sm font-semibold text-accent-green-foreground shadow-sm hover:opacity-90 active:scale-[0.98]"
                >
                  <Save className="h-4 w-4" /> Simpan
                </button>
              </div>
            </div>

            {saved && (
              <div className="mb-4 rounded-lg border border-accent-green/30 bg-accent-green/10 px-4 py-2 text-sm text-accent-green-foreground">
                Perubahan berhasil disimpan.
              </div>
            )}

            {tab === "content" && (
              <div className="space-y-4">
                <Card title="Identitas Website">
                  <Field label="Logo / Nama Website">
                    <input
                      className={inputCls}
                      value={draft.logo}
                      onChange={(e) => setDraft({ ...draft, logo: e.target.value })}
                    />
                  </Field>
                  <Field label="Judul Utama">
                    <input
                      className={inputCls}
                      value={draft.title}
                      onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    />
                  </Field>
                  <Field label="Deskripsi Halaman Utama">
                    <textarea
                      rows={3}
                      className={inputCls}
                      value={draft.description}
                      onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                    />
                  </Field>
                </Card>

                <Card title="Jenjang Pendidikan">
                  <div className="space-y-6">
                    {draft.levels.map((lvl, i) => (
                      <div
                        key={lvl.id}
                        className="rounded-xl border border-border bg-muted/30 p-4"
                      >
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {lvl.id}
                        </p>
                        <div className="grid gap-3 sm:grid-cols-[100px_1fr]">
                          <Field label="Emoji">
                            <input
                              className={inputCls}
                              value={lvl.emoji}
                              onChange={(e) => updateLevel(i, { emoji: e.target.value })}
                            />
                          </Field>
                          <Field label="Nama Jenjang">
                            <input
                              className={inputCls}
                              value={lvl.name}
                              onChange={(e) => updateLevel(i, { name: e.target.value })}
                            />
                          </Field>
                        </div>
                        <Field label="Deskripsi">
                          <textarea
                            rows={2}
                            className={inputCls}
                            value={lvl.description}
                            onChange={(e) => updateLevel(i, { description: e.target.value })}
                          />
                        </Field>
                        <Field label="Tulisan Tombol">
                          <input
                            className={inputCls}
                            value={lvl.buttonLabel}
                            onChange={(e) => updateLevel(i, { buttonLabel: e.target.value })}
                          />
                        </Field>
                        <Field label="Link Tombol Lihat Rekomendasi">
                          <input
                            type="url"
                            placeholder="https://..."
                            className={inputCls}
                            value={lvl.link}
                            onChange={(e) => updateLevel(i, { link: e.target.value })}
                          />
                        </Field>
                        {lvl.link && (
                          <a
                            href={lvl.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block text-xs text-brand hover:underline"
                          >
                            Buka link →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>

                <Card title="Footer & Kontak">
                  <Field label="Teks Footer">
                    <input
                      className={inputCls}
                      value={draft.footer}
                      onChange={(e) => setDraft({ ...draft, footer: e.target.value })}
                    />
                  </Field>
                  <Field label="Informasi Kontak">
                    <input
                      className={inputCls}
                      value={draft.contact}
                      onChange={(e) => setDraft({ ...draft, contact: e.target.value })}
                    />
                  </Field>
                </Card>
              </div>
            )}

            {tab === "links" && (
              <Card title="Link Tombol Lihat Rekomendasi">
                <div className="space-y-4">
                  {draft.levels.map((lvl, i) => (
                    <div key={lvl.id} className="rounded-xl border border-border bg-muted/30 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-2xl">{lvl.emoji}</span>
                        <div>
                          <p className="font-semibold">{lvl.name}</p>
                          <p className="text-xs text-muted-foreground">Jenjang: {lvl.id}</p>
                        </div>
                      </div>
                      <Field label="URL Rekomendasi">
                        <input
                          type="url"
                          className={inputCls}
                          placeholder="https://..."
                          value={lvl.link}
                          onChange={(e) => updateLevel(i, { link: e.target.value })}
                        />
                      </Field>
                      {lvl.link && (
                        <a
                          href={lvl.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1 inline-block text-xs text-brand hover:underline"
                        >
                          Buka link →
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

const inputCls =
  "w-full min-h-[44px] rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
