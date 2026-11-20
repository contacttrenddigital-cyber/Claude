import Link from "next/link";
import { Logo } from "./SiteHeader";
import { ABOUT, NAV } from "./nav";

/** Footer: the full site map, what the platform is, and which data snapshot is shown. */
export function SiteFooter({ snapshot, billDate }: { snapshot?: { id: string; publishedAt: string; publishedBy: string }; billDate?: string }) {
  return (
    <footer className="mt-10 border-t border-rule bg-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <div className="flex max-w-sm flex-col gap-4">
          <Logo />
          <p className="text-sm text-ink-2">
            Независима платформа, която обяснява бюджета на България на прост език. Всяко число идва от официален документ и може да се
            провери.
          </p>
          <Link href={ABOUT.href} className="text-sm font-medium text-accent underline-offset-4 hover:underline">
            Как работим →
          </Link>
        </div>
        <nav aria-label="Карта на сайта" className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {NAV.map((g) => (
            <div key={g.id}>
              <h2 className="mb-3 text-xs font-semibold tracking-[0.14em] text-muted uppercase">{g.label}</h2>
              <ul className="flex flex-col gap-1">
                {g.items.map((i) => (
                  <li key={i.href}>
                    <Link href={i.href} className="inline-flex min-h-9 items-center text-sm text-ink-2 hover:text-ink">
                      {i.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-rule">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-x-6 gap-y-2 px-4 py-5 text-xs text-muted sm:px-6">
          {billDate && <span>Данните са от законопроекта, внесен в Народното събрание на {billDate}. Не е приет закон.</span>}
          {snapshot && (
            <span className="num">
              Данни: снимка {snapshot.id}, публикувана {snapshot.publishedAt} ({snapshot.publishedBy})
            </span>
          )}
          <span>Платформата не е свързана с правителство, партия или институция.</span>
        </div>
      </div>
    </footer>
  );
}
