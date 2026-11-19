import Link from "next/link";
import { SiteHeader } from "./SiteHeader";
import { getPublished } from "@/lib/data/published";
import { dateBg } from "@/lib/format";

/** Common page frame: header with legal status, title block, footer with snapshot info. */
export async function PageShell({
  eyebrow,
  title,
  lead,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
  children: React.ReactNode;
}) {
  const data = await getPublished();
  const bill = data.versions.find((v) => v.id === "bill-2026-11-16")!;
  return (
    <>
      <SiteHeader status={`${bill.legalStatus} · внесен ${dateBg(bill.date)}`} />
      <main id="main" className="mx-auto flex max-w-7xl flex-col gap-10 px-4 pt-10 pb-20 sm:px-6">
        <header className="flex max-w-3xl flex-col gap-3">
          <p className="text-xs font-medium tracking-[0.18em] text-accent uppercase">{eyebrow}</p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
          <div className="text-ink-2">{lead}</div>
        </header>
        {children}
      </main>
      <footer className="border-t border-rule bg-surface">
        <div className="mx-auto flex max-w-7xl flex-wrap gap-x-6 gap-y-2 px-4 py-6 text-xs text-muted sm:px-6">
          <span className="num">
            Снимка {data.snapshot.id} · публикувана {dateBg(data.snapshot.publishedAt)} ({data.snapshot.publishedBy})
          </span>
          <span>Законопроект, внесен в НС на {dateBg(bill.date)} — не е приет закон.</span>
          <Link href="/iztochnitsi" className="underline underline-offset-2">
            Източници и проверки
          </Link>
        </div>
      </footer>
    </>
  );
}

export function Section({ id, title, lead, children }: { id?: string; title: string; lead?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-t` : undefined} className="flex scroll-mt-32 flex-col gap-4 sm:scroll-mt-24">
      <div className="flex max-w-3xl flex-col gap-1">
        <h2 id={id ? `${id}-t` : undefined} className="text-2xl font-semibold tracking-tight">
          {title}
        </h2>
        {lead && <div className="text-sm text-ink-2">{lead}</div>}
      </div>
      {children}
    </section>
  );
}
