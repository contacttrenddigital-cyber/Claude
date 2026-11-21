"use client";

/**
 * Site header. Desktop: four menus (За мен, Бюджетът, Анализи, Данни) and the calculator as the one
 * call to action. Phone: logo, calculator and a full-screen menu with the same four groups.
 * Menus close on navigation, on Escape and on an outside click.
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { ABOUT, NAV } from "./nav";
import { ThemeToggle } from "./ThemeToggle";

export function Logo() {
  return (
    <Link href="/" className="group flex min-h-11 items-center gap-2.5" aria-label="Бюджет 2027 — начало">
      <span aria-hidden className="grid h-9 w-9 place-items-center rounded-xl bg-card-dark text-[14px] font-bold text-white">
        27
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-semibold tracking-tight">Бюджет 2027</span>
        <span className="mt-0.5 text-[11px] text-muted">под лупа</span>
      </span>
    </Link>
  );
}

/** `status` is accepted for compatibility; the legal status is shown in the page itself. */
export function SiteHeader(props: { status?: string }) {
  void props;
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null); // desktop menu id
  const [mobile, setMobile] = useState(false);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(null);
    setMobile(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        setMobile(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (bar.current && !bar.current.contains(e.target as Node)) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = mobile ? "hidden" : "";
  }, [mobile]);

  const active = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href + "/"));
  const groupActive = (id: string) => NAV.find((g) => g.id === id)!.items.some((i) => active(i.href));

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-rule bg-bg/90 backdrop-blur-md supports-[backdrop-filter]:bg-bg/75">
      <div ref={bar} className="relative mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Основна навигация" className="ml-6 hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  aria-expanded={open === g.id}
                  aria-controls={`menu-${g.id}`}
                  onClick={() => setOpen(open === g.id ? null : g.id)}
                  className={`inline-flex min-h-11 items-center gap-1 rounded-full px-4 text-[15px] transition-colors hover:bg-surface-2 hover:text-ink ${
                    open === g.id || groupActive(g.id) ? "text-ink" : "text-ink-2"
                  } ${groupActive(g.id) ? "font-medium" : ""}`}
                >
                  {g.label}
                  <Icon name="chevron" className={`h-4 w-4 transition-transform ${open === g.id ? "rotate-180" : ""}`} />
                </button>
                {open === g.id && (
                  <div
                    id={`menu-${g.id}`}
                    className="absolute top-full right-4 left-4 mt-2 rounded-3xl border border-rule bg-surface p-3 shadow-2xl shadow-black/30 sm:right-6 sm:left-6"
                  >
                    <ul className="grid gap-1 md:grid-cols-2 xl:grid-cols-3">
                      {g.items.map((i) => (
                        <li key={i.href}>
                          <Link
                            href={i.href}
                            aria-current={active(i.href) ? "page" : undefined}
                            className="flex items-start gap-3 rounded-xl p-3 transition-colors hover:bg-surface-2"
                          >
                            <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tint-blue text-tint-blue-ink">
                              <Icon name={i.icon} />
                            </span>
                            <span>
                              <span className="block text-[15px] font-medium text-ink">{i.label}</span>
                              <span className="block text-sm text-muted">{i.hint}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link href={ABOUT.href} className="hidden min-h-11 items-center rounded-full px-3 text-[15px] text-ink-2 hover:bg-surface-2 hover:text-ink xl:inline-flex">
            За платформата
          </Link>
          <span className="hidden lg:inline-flex">
            <ThemeToggle />
          </span>
          <Link
            href="/kalkulator"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-card-dark px-4 text-[15px] font-semibold text-white transition hover:opacity-90"
          >
            <Icon name="calculator" className="h-4.5 w-4.5" />
            <span className="hidden sm:inline">Как ме засяга?</span>
            <span className="sm:hidden">Калкулатор</span>
          </Link>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-surface-2 lg:hidden"
            aria-expanded={mobile}
            aria-controls="mobile-menu"
            aria-label={mobile ? "Затвори менюто" : "Отвори менюто"}
            onClick={() => setMobile(!mobile)}
          >
            <Icon name={mobile ? "close" : "menu"} className="h-6 w-6" />
          </button>
        </div>
      </div>

    </header>
      {mobile && (
        <div id="mobile-menu" className="fixed inset-x-0 top-16 bottom-0 z-50 overflow-y-auto bg-bg lg:hidden">
          <nav aria-label="Мобилна навигация" className="mx-auto flex max-w-2xl flex-col gap-7 px-4 pt-5 pb-16">
            {NAV.map((g) => (
              <section key={g.id} aria-labelledby={`m-${g.id}`}>
                <h2 id={`m-${g.id}`} className="mb-2 text-xs font-semibold tracking-[0.14em] text-muted uppercase">
                  {g.label}
                </h2>
                <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {g.items.map((i) => (
                    <li key={i.href}>
                      <Link
                        href={i.href}
                        aria-current={active(i.href) ? "page" : undefined}
                        className={`flex min-h-12 items-center gap-3 rounded-xl px-3 py-2 ${active(i.href) ? "bg-surface-2" : "hover:bg-surface-2"}`}
                      >
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tint-blue text-tint-blue-ink">
                          <Icon name={i.icon} />
                        </span>
                        <span className="flex flex-col">
                          <span className="text-[16px] font-medium text-ink">{i.label}</span>
                          <span className="text-[13px] text-muted">{i.hint}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-5">
              <Link href={ABOUT.href} className="inline-flex min-h-11 items-center rounded-full border border-rule-strong px-4 text-sm text-ink">
                За платформата
              </Link>
              <ThemeToggle variant="full" />
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
