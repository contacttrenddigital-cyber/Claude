import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
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
      <main id="main" className="mx-auto flex max-w-7xl flex-col gap-12 px-4 pt-8 pb-16 sm:px-6 sm:pt-12">
        <header className="flex max-w-3xl flex-col gap-4">
          <p className="inline-flex w-fit items-center rounded-full bg-card-mustard px-3 py-1 text-[13px] font-semibold text-on-card">{eyebrow}</p>
          <h1 className="font-display text-[2.6rem] leading-[1] font-semibold tracking-tight text-balance uppercase sm:text-6xl">{title}</h1>
          <div className="flex flex-col gap-3 text-[17px] leading-relaxed text-ink-2">{lead}</div>
        </header>
        {children}
      </main>
      <SiteFooter
        billDate={dateBg(bill.date)}
        snapshot={{ id: data.snapshot.id, publishedAt: data.snapshot.publishedAt ? dateBg(data.snapshot.publishedAt) : "—", publishedBy: data.snapshot.publishedBy ?? "—" }}
      />
    </>
  );
}

export function Section({ id, title, lead, children }: { id?: string; title: string; lead?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-t` : undefined} className="flex scroll-mt-24 flex-col gap-5">
      <div className="flex max-w-3xl flex-col gap-2">
        <h2 id={id ? `${id}-t` : undefined} className="font-display text-[1.75rem] leading-tight font-semibold tracking-tight text-balance uppercase sm:text-[2.1rem]">
          {title}
        </h2>
        {lead && <div className="text-[15px] leading-relaxed text-ink-2">{lead}</div>}
      </div>
      {children}
    </section>
  );
}
