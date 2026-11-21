"use client";

/** Official documents as cards, filterable by publisher and by text. Data only; no numbers are computed here. */
import { useMemo, useState } from "react";
import type { Published } from "@/lib/data/published";
import { dateBg } from "@/lib/format";

type Doc = Published["documents"][number];

export function DocumentsExplorer({ documents }: { documents: Doc[] }) {
  const publishers = [...new Set(documents.map((d) => d.publisher))];
  const [pub, setPub] = useState("всички");
  const [q, setQ] = useState("");
  const visible = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return documents.filter((d) => (pub === "всички" || d.publisher === pub) && (!qq || `${d.title} ${d.publisher}`.toLowerCase().includes(qq)));
  }, [documents, pub, q]);

  return (
    <div className="flex flex-col gap-5">
      <div role="group" aria-label="Филтър по издател" className="flex flex-wrap gap-2">
        {[["всички", documents.length] as const, ...publishers.map((p) => [p, documents.filter((d) => d.publisher === p).length] as const)].map(([p, n]) => {
          const on = pub === p;
          return (
            <button
              key={p}
              type="button"
              aria-pressed={on}
              onClick={() => setPub(p)}
              className={`inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
                on ? "border-transparent bg-ink text-bg" : "border-rule-strong bg-surface text-ink hover:bg-surface-2"
              }`}
            >
              {p === "всички" ? "Всички" : p}
              <span className={`num rounded-full px-2 py-0.5 text-xs ${on ? "bg-bg/20" : "bg-surface-2"}`}>{n}</span>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-[13px] text-ink-2">
          Търси документ
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="напр. НЗОК, мотиви"
            className="min-h-11 w-64 max-w-full rounded-full border border-rule-strong bg-surface px-4 text-sm text-ink placeholder:text-muted"
          />
        </label>
        <p className="num ml-auto text-sm text-ink-2" aria-live="polite">
          {visible.length} от {documents.length} документа
        </p>
      </div>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 [&>*]:min-w-0">
        {visible.map((d) => (
          <li key={d.id} className="flex flex-col gap-2 rounded-3xl border border-rule bg-surface p-5">
            <p className="text-[13px] font-semibold text-ink-2">
              {d.publisher}
              {d.legalStatus && <> · {d.legalStatus}</>}
            </p>
            <p className="text-[16px] leading-snug font-semibold text-ink">{d.title}</p>
            <p className="text-[13px] text-ink-2">
              {d.publishedOn && <>Публикуван {dateBg(d.publishedOn)} · </>}изтеглен {dateBg(d.retrievedOn)} · {d.mime} ·{" "}
              <span className="num">{(d.bytes / 1024).toFixed(0)} KB</span>
            </p>
            <p className="flex flex-wrap gap-2">
              <a className="inline-flex min-h-11 items-center rounded-full bg-ink px-4 text-sm font-semibold text-bg sm:min-h-9" href={d.url} rel="noreferrer">
                Оригинален файл
              </a>
              {d.pageUrl && (
                <a className="inline-flex min-h-11 items-center rounded-full border border-rule-strong px-4 text-sm font-semibold text-ink sm:min-h-9" href={d.pageUrl} rel="noreferrer">
                  Страница
                </a>
              )}
            </p>
            <p className="mt-auto font-mono text-[12px] break-all text-ink-2">SHA-256 {d.sha256}</p>
          </li>
        ))}
        {visible.length === 0 && <li className="text-sm text-ink-2">Няма документи по тези филтри.</li>}
      </ul>
    </div>
  );
}
