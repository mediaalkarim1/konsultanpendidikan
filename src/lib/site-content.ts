import { useEffect, useState, useSyncExternalStore } from "react";

export type Level = {
  id: string;
  emoji: string;
  name: string;
  description: string;
  buttonLabel: string;
  link: string;
};

export type SiteContent = {
  logo: string;
  heroBadge: string;
  title: string;
  description: string;
  metaTitle: string;
  metaDescription: string;
  levels: Level[];
  footer: string;
  contact: string;
};

const CONTENT_KEY = "site_content_v1";
const AUTH_KEY = "site_admin_auth_v1";
const CRED_KEY = "site_admin_cred_v1";

export const DEFAULT_ADMIN_USER = "mediaalkarim";
export const DEFAULT_ADMIN_PASS = "mediaalkarim";

export const defaultContent: SiteContent = {
  logo: "EduKonsul",
  heroBadge: "Konsultasi Pendidikan Anak",
  title: "Konsultasi & Rekomendasi Pendidikan Untuk Anak",
  description:
    "Temukan rekomendasi pendidikan terbaik sesuai jenjang pendidikan anak. Pilih jenjang di bawah ini untuk melihat rekomendasi sekolah dan informasi yang sesuai.",
  metaTitle: "Konsultasi & Rekomendasi Pendidikan Untuk Anak",
  metaDescription:
    "Temukan rekomendasi pendidikan terbaik sesuai jenjang pendidikan anak — TK & SD, SMP, dan SMA.",
  levels: [
    {
      id: "tksd",
      emoji: "🎒",
      name: "Pendidikan Anak Usia Dini (TK & SD)",
      description:
        "Rekomendasi sekolah TK dan SD terbaik untuk membangun fondasi pendidikan anak sejak dini.",
      buttonLabel: "Lihat Rekomendasi",
      link: "https://example.com/tksd",
    },
    {
      id: "smp",
      emoji: "📚",
      name: "SMP",
      description:
        "Pilihan sekolah menengah pertama unggulan yang mendukung perkembangan akademik dan karakter anak.",
      buttonLabel: "Lihat Rekomendasi",
      link: "https://example.com/smp",
    },
    {
      id: "sma",
      emoji: "🎓",
      name: "SMA",
      description:
        "Rekomendasi SMA terbaik untuk mempersiapkan anak menuju jenjang pendidikan tinggi.",
      buttonLabel: "Lihat Rekomendasi",
      link: "https://example.com/sma",
    },
  ],
  footer: "© 2026 EduKonsul. Konsultasi & Rekomendasi Pendidikan.",
  contact: "Email: info@edukonsul.id  •  WhatsApp: +62 812-0000-0000",
};

const listeners = new Set<() => void>();

function read(): SiteContent {
  if (typeof window === "undefined") return defaultContent;
  try {
    const raw = localStorage.getItem(CONTENT_KEY);
    if (!raw) return defaultContent;
    const parsed = JSON.parse(raw);
    return {
      ...defaultContent,
      ...parsed,
      levels: Array.isArray(parsed.levels) ? parsed.levels : defaultContent.levels,
    };
  } catch {
    return defaultContent;
  }
}

export function getContent(): SiteContent {
  return read();
}

export function setContent(next: SiteContent) {
  localStorage.setItem(CONTENT_KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

export function resetContent() {
  localStorage.removeItem(CONTENT_KEY);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = () => cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useSiteContent(): SiteContent {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const content = useSyncExternalStore(
    subscribe,
    () => JSON.stringify(read()),
    () => JSON.stringify(defaultContent),
  );
  if (!hydrated) return defaultContent;
  return JSON.parse(content) as SiteContent;
}

// Credentials
type Cred = { user: string; pass: string };
function readCred(): Cred {
  if (typeof window === "undefined") return { user: DEFAULT_ADMIN_USER, pass: DEFAULT_ADMIN_PASS };
  try {
    const raw = localStorage.getItem(CRED_KEY);
    if (!raw) return { user: DEFAULT_ADMIN_USER, pass: DEFAULT_ADMIN_PASS };
    return JSON.parse(raw);
  } catch {
    return { user: DEFAULT_ADMIN_USER, pass: DEFAULT_ADMIN_PASS };
  }
}
export function getAdminUser(): string {
  return readCred().user;
}
export function updateCredentials(user: string, pass: string) {
  localStorage.setItem(CRED_KEY, JSON.stringify({ user, pass }));
}

// Auth
export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AUTH_KEY) === "1";
}
export function login(user: string, pass: string): boolean {
  const c = readCred();
  if (user === c.user && pass === c.pass) {
    localStorage.setItem(AUTH_KEY, "1");
    return true;
  }
  return false;
}
export function logout() {
  localStorage.removeItem(AUTH_KEY);
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || `item-${Date.now()}`;
}
