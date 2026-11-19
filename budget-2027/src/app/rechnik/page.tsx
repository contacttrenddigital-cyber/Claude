import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { getPublished } from "@/lib/data/published";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Речник на бюджета",
  description: "Бюджетните понятия на разбираем език: КФП, дефицит, ЕСС, трансфери, капиталови разходи и други.",
  alternates: { canonical: "/rechnik" },
};

export default async function Glossary() {
  const data = await getPublished();
  const doc = data.documents.find((d) => d.id === data.glossary[0]?.documentId);
  const terms = [...data.glossary].sort((a, b) => a.term.localeCompare(b.term, "bg"));
  const letters = [...new Set(terms.map((t) => t.term[0]!.toUpperCase()))];
  return (
    <PageShell
      eyebrow="Речник"
      title="Речник на бюджета"
      lead={
        <p>
          {terms.length} понятия. Определенията са от речника на СИГМА Бюджет (
          <a href={doc?.pageUrl ?? doc?.url} rel="noreferrer" className="underline underline-offset-2">
            източник
          </a>
          ); примерите с условни числа не са включени.
        </p>
      }
    >
      <nav aria-label="Букви" className="flex flex-wrap gap-1">
        {letters.map((l) => (
          <a key={l} href={`#bukva-${l}`} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm border border-rule px-2 text-sm hover:border-ink">
            {l}
          </a>
        ))}
      </nav>
      <dl className="flex flex-col">
        {terms.map((t, i) => (
          <div key={t.slug} id={i === 0 || terms[i - 1]!.term[0]!.toUpperCase() !== t.term[0]!.toUpperCase() ? `bukva-${t.term[0]!.toUpperCase()}` : t.slug} className="scroll-mt-32 border-b border-rule py-3">
            <dt className="font-semibold text-ink" id={t.slug}>
              {t.term}
              {t.aliases.length > 0 && <span className="ml-2 text-xs font-normal text-muted">({t.aliases.join(", ")})</span>}
            </dt>
            <dd className="mt-1 max-w-3xl text-sm text-ink-2">{t.definition}</dd>
          </div>
        ))}
      </dl>
    </PageShell>
  );
}
