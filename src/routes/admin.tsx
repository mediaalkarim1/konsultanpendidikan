import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  isLoggedIn,
  logout,
  useSiteContent,
  setContent,
  resetContent,
  defaultContent,
  getAdminUser,
  updateCredentials,
  slugify,
  type SiteContent,
  type Level,
} from "@/lib/site-content";
import {
  LogOut,
  Save,
  Settings,
  LinkIcon,
  Home,
  Menu,
  X,
  RotateCcw,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  KeyRound,
  Search,
} from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type Tab = "content" | "levels" | "links" | "seo" | "account";

function AdminPage() {
  const navigate = useNavigate();
  const content = useSiteContent();
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<Tab>("content");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [draft, setDraft] = useState<SiteContent>(content);
  const [saved, setSaved] = useState(false);

  // account tab state
  const [curUser, setCurUser] = useState("");
  const [newUser, setNewUser] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [accMsg, setAccMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate({ to: "/login" });
      return;
    }
    setReady(true);
    const u = getAdminUser();
    setCurUser(u);
    setNewUser(u);
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

  function updateLevel(idx: number, patch: Partial<Level>) {
    setDraft({
      ...draft,
      levels: draft.levels.map((l, i) => (i === idx ? { ...l, ...patch } : l)),
    });
  }

  function addLevel() {
    const newLvl: Level = {
      id: `jenjang-${Date.now()}`,
      emoji: "✨",
      name: "Jenjang Baru",
      description: "Deskripsi singkat jenjang.",
      buttonLabel: "Lihat Rekomendasi",
      link: "",
    };
    setDraft({ ...draft, levels: [...draft.levels, newLvl] });
  }

  function removeLevel(idx: number) {
    if (!confirm("Hapus jenjang ini?")) return;
    setDraft({ ...draft, levels: draft.levels.filter((_, i) => i !== idx) });
  }

  function moveLevel(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= draft.levels.length) return;
    const arr = [...draft.levels];
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    setDraft({ ...draft, levels: arr });
  }

  function saveAccount() {
    setAccMsg(null);
    if (!newUser.trim()) {
      setAccMsg({ type: "err", text: "Username tidak boleh kosong." });
      return;
    }
    if (!newPass || newPass.length < 4) {
      setAccMsg({ type: "err", text: "Password minimal 4 karakter." });
      return;
    }
    if (newPass !== confirmPass) {
      setAccMsg({ type: "err", text: "Konfirmasi password tidak sama." });
      return;
    }
    updateCredentials(newUser.trim(), newPass);
    setCurUser(newUser.trim());
    setNewPass("");
    setConfirmPass("");
    setAccMsg({ type: "ok", text: "Akun admin berhasil diperbarui." });
  }

  const nav: { id: Tab; label: string; icon: typeof Settings }[] = [
    { id: "content", label: "Konten Halaman", icon: Settings },
    { id: "levels", label: "Jenjang Pendidikan", icon: Menu },
    { id: "links", label: "Link Rekomendasi", icon: LinkIcon },
    { id: "seo", label: "SEO & Meta", icon: Search },
    { id: "account", label: "Akun Admin", icon: KeyRound },
  ];

  const heading = nav.find((n) => n.id === tab)?.label ?? "";

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

        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-10">
          <div className="mx-auto max-w-4xl">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold sm:text-3xl">{heading}</h1>
                <p className="text-sm text-muted-foreground">
                  Kelola seluruh konten website tanpa mengubah kode.
                </p>
              </div>
              {tab !== "account" && (
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
              )}
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
                  <Field label="Badge di Atas Judul (Hero)">
                    <input
                      className={inputCls}
                      value={draft.heroBadge}
                      placeholder="Contoh: Konsultasi Pendidikan Anak"
                      onChange={(e) => setDraft({ ...draft, heroBadge: e.target.value })}
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

            {tab === "levels" && (
              <Card title="Jenjang Pendidikan">
                <div className="mb-4 flex justify-end">
                  <button
                    onClick={addLevel}
                    className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-brand px-3 text-sm font-semibold text-brand-foreground shadow-sm hover:opacity-90"
                  >
                    <Plus className="h-4 w-4" /> Tambah Jenjang
                  </button>
                </div>
                <div className="space-y-6">
                  {draft.levels.map((lvl, i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border bg-muted/30 p-4"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          #{i + 1} · {lvl.id}
                        </p>
                        <div className="flex items-center gap-1">
                          <IconBtn
                            label="Naikkan"
                            onClick={() => moveLevel(i, -1)}
                            disabled={i === 0}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </IconBtn>
                          <IconBtn
                            label="Turunkan"
                            onClick={() => moveLevel(i, 1)}
                            disabled={i === draft.levels.length - 1}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </IconBtn>
                          <IconBtn label="Hapus" onClick={() => removeLevel(i)} danger>
                            <Trash2 className="h-4 w-4" />
                          </IconBtn>
                        </div>
                      </div>
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
                            onChange={(e) =>
                              updateLevel(i, {
                                name: e.target.value,
                                id: slugify(e.target.value),
                              })
                            }
                          />
                        </Field>
                      </div>
                      <Field label="ID / Slug">
                        <input
                          className={inputCls}
                          value={lvl.id}
                          onChange={(e) => updateLevel(i, { id: slugify(e.target.value) })}
                        />
                      </Field>
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
                  {draft.levels.length === 0 && (
                    <p className="text-center text-sm text-muted-foreground">
                      Belum ada jenjang. Klik "Tambah Jenjang".
                    </p>
                  )}
                </div>
              </Card>
            )}

            {tab === "links" && (
              <Card title="Link Tombol Lihat Rekomendasi">
                <div className="space-y-4">
                  {draft.levels.map((lvl, i) => (
                    <div key={i} className="rounded-xl border border-border bg-muted/30 p-4">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-2xl">{lvl.emoji}</span>
                        <div>
                          <p className="font-semibold">{lvl.name}</p>
                          <p className="text-xs text-muted-foreground">ID: {lvl.id}</p>
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

            {tab === "seo" && (
              <Card title="SEO & Meta Tag">
                <Field label="Meta Title (judul tab browser & hasil pencarian)">
                  <input
                    className={inputCls}
                    value={draft.metaTitle}
                    maxLength={70}
                    onChange={(e) => setDraft({ ...draft, metaTitle: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {draft.metaTitle.length}/70 karakter (disarankan &lt; 60)
                  </p>
                </Field>
                <Field label="Meta Description">
                  <textarea
                    rows={3}
                    className={inputCls}
                    value={draft.metaDescription}
                    maxLength={200}
                    onChange={(e) => setDraft({ ...draft, metaDescription: e.target.value })}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {draft.metaDescription.length}/200 karakter (disarankan &lt; 160)
                  </p>
                </Field>
              </Card>
            )}

            {tab === "account" && (
              <Card title="Ubah Akun Admin">
                <p className="mb-4 text-sm text-muted-foreground">
                  Username saat ini: <span className="font-semibold text-foreground">{curUser}</span>
                </p>
                <Field label="Username Baru">
                  <input
                    className={inputCls}
                    value={newUser}
                    onChange={(e) => setNewUser(e.target.value)}
                  />
                </Field>
                <Field label="Password Baru">
                  <input
                    type="password"
                    className={inputCls}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                  />
                </Field>
                <Field label="Konfirmasi Password">
                  <input
                    type="password"
                    className={inputCls}
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                  />
                </Field>
                {accMsg && (
                  <div
                    className={`mb-3 rounded-lg border px-3 py-2 text-sm ${
                      accMsg.type === "ok"
                        ? "border-accent-green/30 bg-accent-green/10 text-accent-green-foreground"
                        : "border-destructive/30 bg-destructive/10 text-destructive"
                    }`}
                  >
                    {accMsg.text}
                  </div>
                )}
                <button
                  onClick={saveAccount}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-brand-foreground shadow-sm hover:opacity-90"
                >
                  <KeyRound className="h-4 w-4" /> Simpan Akun
                </button>
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

function IconBtn({
  children,
  onClick,
  label,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={`grid h-9 w-9 place-items-center rounded-lg border border-input bg-background transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 ${
        danger ? "text-destructive hover:bg-destructive/10" : ""
      }`}
    >
      {children}
    </button>
  );
}
