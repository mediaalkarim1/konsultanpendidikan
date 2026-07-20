import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSiteContent } from "@/lib/site-content";
import { ArrowRight, LogIn } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const c = useSiteContent();

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (c.metaTitle) document.title = c.metaTitle;
    const setMeta = (selector: string, attr: string, value: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        const [a, v] = selector.replace(/[[\]"]/g, "").split("=");
        el.setAttribute(a, v);
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };
    if (c.metaDescription) {
      setMeta('meta[name="description"]', "content", c.metaDescription);
      setMeta('meta[property="og:description"]', "content", c.metaDescription);
    }
    if (c.metaTitle) {
      setMeta('meta[property="og:title"]', "content", c.metaTitle);
    }
  }, [c.metaTitle, c.metaDescription]);

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/90 shadow-sm backdrop-blur">
        <div className="mx-auto flex h-[60px] max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-brand-foreground font-bold shadow-sm">
              {c.logo.charAt(0)}
            </div>
            <span className="truncate text-base font-semibold text-foreground sm:text-lg">
              {c.logo}
            </span>
          </Link>
          <Link
            to="/login"
            className="inline-flex h-[42px] items-center gap-2 rounded-full bg-brand px-4 text-sm font-semibold text-brand-foreground shadow-sm transition-all duration-200 hover:opacity-90 hover:shadow-md active:scale-[0.98] sm:h-[46px] sm:px-5"
          >
            <LogIn className="h-4 w-4" />
            <span>Login Admin</span>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-brand-soft via-brand-soft/40 to-transparent"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-24 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-brand/10 blur-3xl"
        />

        <section className="mx-auto max-w-3xl px-4 pt-10 pb-6 text-center sm:px-6 sm:pt-16">
          {c.heroBadge && (
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-background/70 px-3 py-1 text-xs font-medium text-brand shadow-sm backdrop-blur">
              <span className="h-2 w-2 rounded-full bg-accent-green" />
              {c.heroBadge}
            </span>
          )}
          <h1 className="mt-5 text-[28px] font-bold leading-tight tracking-tight text-foreground sm:text-[36px] lg:text-[40px]">
            {c.title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground sm:text-[17px]">
            {c.description}
          </p>
        </section>

        {/* Cards — always 3 columns */}
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
          <div className="grid grid-cols-3 gap-3 sm:gap-5 lg:gap-6">
            {c.levels.slice(0, 3).map((lvl) => (
              <a
                key={lvl.id}
                href={lvl.link || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-h-[130px] flex-col items-center justify-between rounded-[18px] border border-border/70 bg-card p-3 text-center shadow-[0_4px_16px_-4px_rgba(21,101,216,0.08)] transition-all duration-[250ms] ease-out hover:-translate-y-1 hover:border-brand/30 hover:shadow-[0_12px_28px_-8px_rgba(21,101,216,0.25)] sm:min-h-[220px] sm:p-6"
              >
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-soft text-2xl transition-transform duration-300 group-hover:scale-110 sm:h-16 sm:w-16 sm:text-4xl">
                  {lvl.emoji}
                </div>
                <h2 className="mt-2 line-clamp-2 text-[13px] font-bold leading-tight text-foreground sm:mt-4 sm:text-[18px]">
                  {lvl.name}
                </h2>
                <p className="mt-2 hidden flex-1 text-sm text-muted-foreground sm:block">
                  {lvl.description}
                </p>
                <span className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-brand sm:mt-5 sm:h-[46px] sm:w-full sm:justify-center sm:gap-2 sm:rounded-full sm:bg-brand sm:px-5 sm:text-[15px] sm:text-brand-foreground sm:shadow-sm sm:transition sm:group-hover:shadow-md">
                  <span className="sm:hidden">Lihat</span>
                  <span className="hidden sm:inline">{lvl.buttonLabel}</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 sm:h-4 sm:w-4" />
                </span>
              </a>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center sm:px-6 sm:py-10">
          <p className="text-sm text-muted-foreground">{c.footer}</p>
          {c.contact && (
            <p className="mt-2 text-xs text-muted-foreground/80">{c.contact}</p>
          )}
        </div>
      </footer>
    </div>
  );
}
