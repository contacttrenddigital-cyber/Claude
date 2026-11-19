import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

const NAV = [
  { href: "/#pokazateli", label: "Показатели" },
  { href: "/#merki", label: "Мерки" },
  { href: "/kalkulator", label: "Калкулатор" },
  { href: "/#defitsit-i-dalg", label: "Дефицит и дълг" },
  { href: "/#promeni", label: "Промени" },
  { href: "/iztochnitsi", label: "Източници" },
];

export function SiteHeader({ status }: { status: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/85">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2 sm:px-6">
        <Link href="/" className="flex min-h-11 items-center gap-2 font-semibold tracking-tight">
          <span aria-hidden className="inline-block h-4 w-1.5 bg-accent-fill" />
          <span>БЮДЖЕТ 2027</span>
          <span className="hidden text-muted sm:inline">· под лупа</span>
        </Link>
        <nav aria-label="Основна навигация" className="order-3 -mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 sm:order-none sm:mx-0 sm:w-auto sm:px-0">
          <ul className="flex gap-1 text-sm whitespace-nowrap">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="inline-flex min-h-11 items-center rounded-sm px-2 text-ink-2 hover:bg-surface-2 hover:text-ink">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-xs text-muted xl:inline">{status}</span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
