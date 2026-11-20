import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";

const PRIMARY = [
  { href: "/prihodi", label: "Приходи" },
  { href: "/razhodi", label: "Разходи" },
  { href: "/defitsit", label: "Дефицит" },
  { href: "/dalg", label: "Дълг" },
  { href: "/danatsi", label: "Данъци" },
  { href: "/kalkulator", label: "Калкулатор" },
  { href: "/analizi/asen-vasilev", label: "Проверка" },
];

const MORE = [
  { href: "/osigurovki", label: "Осигуровки и социални плащания" },
  { href: "/sektori", label: "Сектори" },
  { href: "/pensii", label: "Пенсии и ДОО" },
  { href: "/zdraveopazvane", label: "Здравеопазване и НЗОК" },
  { href: "/otbrana", label: "Отбрана" },
  { href: "/obrazovanie", label: "Образование" },
  { href: "/zaplati", label: "Заплати" },
  { href: "/biznes", label: "Бизнес" },
  { href: "/riskove", label: "Рискове" },
  { href: "/sravnenia", label: "Сравнения с ЕС" },
  { href: "/investitsii", label: "Инвестиции и проекти" },
  { href: "/institutsii", label: "Институции" },
  { href: "/programi", label: "Бюджетни програми" },
  { href: "/obshtini", label: "Общини" },
  { href: "/izpalnenie", label: "Изпълнение" },
  { href: "/prognozi", label: "Прогнози и ревизии" },
  { href: "/scenarii", label: "Сценарии" },
  { href: "/moeto-tablo", label: "Моето табло" },
  { href: "/vizualizatsii", label: "Студио за карти" },
  { href: "/danni", label: "Отворени данни" },
  { href: "/pod-lupa", label: "Под лупа" },
  { href: "/pozitivni-merki", label: "Положителни мерки" },
  { href: "/zakonodatelstvo", label: "Законодателство" },
  { href: "/dokumenti", label: "Търсене в документите" },
  { href: "/rechnik", label: "Речник" },
  { href: "/metodologia", label: "Методология" },
  { href: "/#merki", label: "Мерки" },
  { href: "/iztochnitsi", label: "Източници и проверки" },
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
        <nav aria-label="Основна навигация" className="order-3 -mx-4 w-[calc(100%+2rem)] overflow-x-auto px-4 lg:order-none lg:mx-0 lg:w-auto lg:overflow-visible lg:px-0">
          <ul className="flex items-center gap-1 text-sm whitespace-nowrap">
            {PRIMARY.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="inline-flex min-h-11 items-center rounded-sm px-2 text-ink-2 hover:bg-surface-2 hover:text-ink">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-xs text-muted 2xl:inline">{status}</span>
          <details className="group relative">
            <summary className="inline-flex min-h-11 items-center gap-1 rounded-sm border border-rule-strong px-3 text-xs text-ink-2 hover:border-ink hover:text-ink">
              Още <span aria-hidden className="transition-transform group-open:rotate-180">▾</span>
            </summary>
            <ul className="absolute right-0 z-50 mt-1 w-64 rounded-sm border border-rule-strong bg-surface py-1 text-sm shadow-lg">
              {MORE.map((n) => (
                <li key={n.href}>
                  <Link href={n.href} className="flex min-h-11 items-center px-3 text-ink-2 hover:bg-surface-2 hover:text-ink">
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
