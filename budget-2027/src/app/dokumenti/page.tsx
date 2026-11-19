import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { searchDocuments } from "@/lib/search";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Търсене в документите",
  description: "Търсене в пълния текст на законопроектите за бюджет 2027 и 2026, ДОО и НЗОК: абзаци и редове от таблици, с точно място в документа.",
  alternates: { canonical: "/dokumenti" },
};

function Highlight({ text, q }: { text: string; q: string }) {
  const tokens = q.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
  if (!tokens.length) return <>{text}</>;
  const re = new RegExp(`(${tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  return (
    <>
      {text.split(re).map((part, i) =>
        tokens.includes(part.toLowerCase()) ? (
          <mark key={i} className="rounded-sm bg-warning/25 px-0.5 text-ink">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export default async function Documents({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").slice(0, 120);
  const r = searchDocuments(q);
  return (
    <PageShell
      eyebrow="Документи"
      title="Търсене в документите"
      lead={
        <p>
          Пълнотекстово търсене в {r.docCount} официални документа ({r.itemCount.toLocaleString("bg-BG")} абзаца и реда от таблици).
          Резултатите са дословни откъси с точно място в документа. Търсенето е по думи, без тълкуване.
        </p>
      }
    >
      <form method="get" role="search" className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Какво търсите?
          <input name="q" type="search" defaultValue={q} placeholder="напр. минимална пенсия, ваучери, чл. 68" className="min-h-11 w-80 max-w-full rounded-sm border border-rule-strong bg-surface px-3 text-sm text-ink" />
        </label>
        <button type="submit" className="min-h-11 rounded-sm bg-ink px-4 text-sm font-medium text-bg">
          Търси
        </button>
      </form>
      {q && (
        <p className="num text-sm text-ink-2" role="status">
          {r.total === 0 ? `Няма резултати за „${q}“.` : `${r.total} резултата за „${q}“${r.total > r.results.length ? `, показани първите ${r.results.length}` : ""}.`}
        </p>
      )}
      <ol className="flex flex-col">
        {r.results.map((h, i) => (
          <li key={`${h.docId}-${i}`} className="border-b border-rule py-3">
            <p className="text-xs text-muted">
              <a href={h.url} rel="noreferrer" className="underline underline-offset-2">
                {h.docTitle}
              </a>{" "}
              · {h.locator}
            </p>
            <p className="mt-1 text-sm text-ink">
              <Highlight text={h.snippet} q={q} />
            </p>
          </li>
        ))}
      </ol>
    </PageShell>
  );
}
