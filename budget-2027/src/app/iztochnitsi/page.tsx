import type { Metadata } from "next";
import { SiteHeader } from "@/components/site/SiteHeader";
import { NoPublishedSnapshotError, getPublished, type Published } from "@/lib/data/published";
import { dateBg } from "@/lib/format";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Източници и проверки",
  description: "Официалните документи зад всяко число: издател, адрес, дата на изтегляне, SHA-256 и резултатите от автоматичните проверки.",
  alternates: { canonical: "/iztochnitsi" },
};

const KIND_LABEL: Record<string, string> = {
  "cross-source": "Съвпадение между две места в документа",
  identity: "Счетоводни равенства",
  total: "Сборове",
  "version-diff": "Сравнение на версии",
};
const STATUS_LABEL: Record<string, string> = { pass: "успешна", warn: "предупреждение", fail: "неуспешна" };

export default async function Sources() {
  let data: Published;
  try {
    data = await getPublished();
  } catch (e) {
    if (e instanceof NoPublishedSnapshotError) return <p className="p-8">Няма публикувана снимка на данните.</p>;
    throw e;
  }
  const bill = data.versions.find((v) => v.id === "bill-2026-11-16")!;
  const kinds = [...new Set(data.checks.map((c) => c.kind))];

  return (
    <>
      <SiteHeader status={`${bill.legalStatus} · внесен ${dateBg(bill.date)}`} />
      <main id="main" className="mx-auto flex max-w-7xl flex-col gap-12 px-4 pt-10 pb-20 sm:px-6">
        <header className="flex max-w-3xl flex-col gap-3">
          <h1 className="text-4xl font-semibold tracking-tight">Източници и проверки</h1>
          <p className="text-ink-2">
            Всяко число на сайта сочи към един от тези файлове и към точното място в него: таблица, ред, колона или абзац. Оригиналите се
            пазят непроменени. SHA-256 позволява на всеки да провери, че става дума за същия файл.
          </p>
        </header>

        <section aria-labelledby="ver" className="flex flex-col gap-3">
          <h2 id="ver" className="text-2xl font-semibold tracking-tight">
            Версии на бюджета
          </h2>
          <ol className="flex flex-col">
            {data.versions.map((v) => (
              <li key={v.id} className="grid gap-1 border-b border-rule py-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
                <time className="num text-sm text-muted" dateTime={v.date}>
                  {dateBg(v.date)}
                </time>
                <div>
                  <p className="font-medium">{v.label}</p>
                  <p className="text-sm text-ink-2">Статус: {v.legalStatus}</p>
                  <p className="text-xs text-muted">{v.evidence}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="docs" className="flex flex-col gap-3">
          <h2 id="docs" className="text-2xl font-semibold tracking-tight">
            Документи ({data.documents.length})
          </h2>
          <ul className="flex flex-col">
            {data.documents.map((d) => (
              <li key={d.id} className="flex flex-col gap-1 border-b border-rule py-3">
                <p className="text-sm font-medium text-ink">{d.title}</p>
                <p className="text-xs text-ink-2">
                  {d.publisher}
                  {d.publishedOn && <> · публикуван {dateBg(d.publishedOn)}</>} · изтеглен {dateBg(d.retrievedOn)} · {d.mime} ·{" "}
                  <span className="num">{(d.bytes / 1024).toFixed(0)} KB</span>
                  {d.legalStatus && <> · {d.legalStatus}</>}
                </p>
                <p className="flex flex-wrap gap-x-3 text-xs">
                  <a className="text-ink-2 underline underline-offset-2" href={d.url} rel="noreferrer">
                    Оригинален файл
                  </a>
                  {d.pageUrl && (
                    <a className="text-ink-2 underline underline-offset-2" href={d.pageUrl} rel="noreferrer">
                      Страница
                    </a>
                  )}
                </p>
                <p className="font-mono text-[11px] break-all text-muted">SHA-256 {d.sha256}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="checks" className="flex flex-col gap-6">
          <h2 id="checks" className="text-2xl font-semibold tracking-tight">
            Автоматични проверки ({data.checks.length})
          </h2>
          {kinds.map((k) => {
            const list = data.checks.filter((c) => c.kind === k);
            return (
              <details key={k} className="border-b border-rule pb-3" open={list.some((c) => c.status !== "pass")}>
                <summary className="flex min-h-11 items-center gap-2 text-base font-medium">
                  {KIND_LABEL[k] ?? k}{" "}
                  <span className="num text-sm font-normal text-muted">
                    {list.filter((c) => c.status === "pass").length}/{list.length} успешни
                  </span>
                </summary>
                <ul className="mt-2 flex flex-col gap-2">
                  {list.map((c) => (
                    <li key={c.id} className="text-sm">
                      <span className={c.status === "pass" ? "text-beneficial" : c.status === "warn" ? "text-warning" : "text-adverse"}>
                        {c.status === "pass" ? "✓" : c.status === "warn" ? "!" : "✗"} {STATUS_LABEL[c.status]}
                      </span>{" "}
                      <span className="text-ink-2">{c.description}</span>
                      {c.details && c.status !== "pass" && (
                        <ul className="num mt-1 ml-5 text-xs text-muted">
                          {Object.entries(c.details).map(([key, v]) => (
                            <li key={key}>
                              {key}: {v ?? "—"}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </section>
      </main>
    </>
  );
}
