import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { useSiteContent } from "@/lib/site-content";
import { LogIn } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-b from-brand-soft via-background to-background font-sans">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand text-brand-foreground font-bold">
              {c.logo.charAt(0)}
            </div>
            <span className="truncate text-base font-semibold text-foreground sm:text-lg">
              {c.logo}
            </span>
          </Link>
          <Link
            to="/login"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-brand-foreground shadow-sm transition hover:opacity-90 hover:shadow-md active:scale-[0.98]"
          >
            <LogIn className="h-4 w-4" />
            <span className="hidden sm:inline">Login Admin</span>
            <span className="sm:hidden">Login</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-16">
        <section className="mx-auto max-w-3xl text-center">
          {c.heroBadge && (
            <span className="inline-flex items-center gap-2 rounded-full border border-accent-green/30 bg-accent-green/10 px-3 py-1 text-xs font-medium text-accent-green-foreground">
              <span className="h-2 w-2 rounded-full bg-accent-green" />
              {c.heroBadge}
            </span>
          )}
          <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-foreground sm:text-5xl">
            {c.title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {c.description}
          </p>
        </section>

        <section className="mt-10 grid grid-cols-1 gap-5 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3">
          {c.levels.map((lvl) => (
            <article
              key={lvl.id}
              className="group flex flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-brand/40 hover:shadow-xl"
            >
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-3xl transition group-hover:scale-105">
                {lvl.emoji}
              </div>
              <h2 className="mt-4 text-lg font-bold text-foreground">{lvl.name}</h2>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{lvl.description}</p>
              <a
                href={lvl.link || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-brand px-5 text-sm font-semibold text-brand-foreground shadow-sm transition hover:bg-brand/90 hover:shadow-lg active:scale-[0.98]"
              >
                {lvl.buttonLabel}
              </a>
            </article>
          ))}
        </section>
      </main>

      <footer className="border-t border-border/60 bg-card/50">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-muted-foreground sm:px-6">
          <p>{c.footer}</p>
          <p className="mt-1">{c.contact}</p>
        </div>
      </footer>
    </div>
  );
}
