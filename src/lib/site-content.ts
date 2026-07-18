import { useEffect, useState, useSyncExternalStore } from "react";

export type Level = {
  id: "tksd" | "smp" | "sma";
  emoji: string;
  name: string;
  description: string;
  buttonLabel: string;
  link: string;
};

export type SiteContent = {
  logo: string;
  title: string;
  description: string;
  levels: Level[];
  footer: string;
  contact: string;
};

const CONTENT_KEY = "site_content_v1";
const AUTH_KEY = "site_admin_auth_v1";

export const ADMIN_USER = "mediaalkarim";
export const ADMIN_PASS = "mediaalkarim";

export const defaultContent: SiteContent = {
  logo: "EduKonsul",
  title: "Konsultasi & Rekomendasi Pendidikan Untuk Anak",
  description:
    "Temukan rekomendasi pendidikan terbaik sesuai jenjang pendidikan anak. Pilih jenjang di bawah ini untuk melihat rekomendasi sekolah dan informasi yang sesuai.",
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
    return { ...defaultContent, ...parsed, levels: parsed.levels ?? defaultContent.levels };
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

// Auth
export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AUTH_KEY) === "1";
}
export function login(user: string, pass: string): boolean {
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    localStorage.setItem(AUTH_KEY, "1");
    return true;
  }
  return false;
}
export function logout() {
  localStorage.removeItem(AUTH_KEY);
}
