import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { getPublished } from "@/lib/data/published";
import { dateBg, fmtNum } from "@/lib/format";

/** One headline number in the title band ("Накратко"). value is a printed decimal string. */
export interface ShellFact {
  label: string;
  value: string;
  unit: string;
  decimals?: number;
  note?: string;
  tone: "sky" | "mustard" | "violet" | "mint" | "rose" | "lilac";
}

const TONE: Record<ShellFact["tone"], string> = {
  sky: "bg-card-sky",
  mustard: "bg-card-mustard",
  violet: "bg-card-violet",
  mint: "bg-card-mint",
  rose: "bg-card-rose",
  lilac: "bg-card-lilac",
};

/**
 * Common page frame. The title band is always dark (tokens are switched to their dark values
 * inside it with `.on-dark`, so text stays readable in the light theme too); optional `facts`
 * show up to three headline numbers as cards ("Накратко").
 */
export async function PageShell({
  eyebrow,
  title,
  lead,
  facts,
  factsSource,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
  facts?: ShellFact[];
  /** where the facts are printed (required with facts) */
  factsSource?: string;
  children: React.ReactNode;
}) {
  const data = await getPublished();
  const bill = data.versions.find((v) => v.id === "bill-2026-11-16")!;
  return (
    <>
      <SiteHeader status={`${bill.legalStatus} · внесен ${dateBg(bill.date)}`} />
      <main id="main">
        <header className="on-dark bg-hero">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 pt-9 pb-10 sm:px-6 sm:pt-14 sm:pb-14">
            <p className="inline-flex w-fit items-center rounded-full bg-card-mustard px-3 py-1 text-[13px] font-semibold text-on-card">{eyebrow}</p>
            <h1 className="font-display max-w-4xl text-[3rem] leading-[0.95] font-semibold tracking-tight text-balance uppercase sm:text-[4.4rem]">{title}</h1>
            <div className="flex max-w-3xl flex-col gap-3 text-[17px] leading-relaxed text-ink-2">{lead}</div>
            {facts && facts.length > 0 && (
              <section aria-label="Накратко" className="mt-2">
                <h2 className="mb-3 text-[13px] font-semibold tracking-wide text-muted uppercase">Накратко</h2>
                <dl className={`grid gap-3 sm:gap-4 ${facts.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                  {facts.map((f) => (
                    <div key={f.label} className={`flex flex-col gap-1 rounded-3xl p-4 text-on-card shadow-lg shadow-black/30 sm:p-5 ${TONE[f.tone]}`}>
                      <dt className="text-sm font-semibold">{f.label}</dt>
                      <dd className="num font-display text-[2.7rem] leading-none font-semibold">
                        {fmtNum(f.value, f.decimals ?? 1)}
                        <span className="ml-1.5 font-sans text-sm font-medium">{f.unit}</span>
                      </dd>
                      {f.note && <dd className="text-sm leading-snug text-on-card">{f.note}</dd>}
                    </div>
                  ))}
                </dl>
                {factsSource && <p className="mt-3 text-xs text-muted">Източник: {factsSource}</p>}
              </section>
            )}
          </div>
        </header>
        <div className="mx-auto flex max-w-7xl flex-col gap-14 px-4 pt-10 pb-16 sm:px-6 sm:pt-14">{children}</div>
      </main>
      <SiteFooter
        billDate={dateBg(bill.date)}
        snapshot={{ id: data.snapshot.id, publishedAt: data.snapshot.publishedAt ? dateBg(data.snapshot.publishedAt) : "—", publishedBy: data.snapshot.publishedBy ?? "—" }}
      />
    </>
  );
}

/** Section heading in sentence case (capitals are kept for H1 and short labels only). */
export function Section({ id, title, lead, children }: { id?: string; title: string; lead?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-t` : undefined} className="flex scroll-mt-24 flex-col gap-5">
      <div className="flex max-w-3xl flex-col gap-2">
        <h2 id={id ? `${id}-t` : undefined} className="font-display text-[2.2rem] leading-[1.02] font-semibold tracking-tight text-balance sm:text-[2.8rem]">
          {title}
        </h2>
        {lead && <div className="text-[16px] leading-relaxed text-ink-2">{lead}</div>}
      </div>
      {children}
    </section>
  );
}
