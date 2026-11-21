import type { Metadata } from "next";
import { PageShell } from "@/components/site/PageShell";
import { DocumentsExplorer } from "@/components/sources/DocumentsExplorer";
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
  const kinds = [...new Set(data.checks.map((c) => c.kind))];

  const passed = data.checks.filter((c) => c.status === "pass").length;
  return (
    <PageShell
      eyebrow="Източници"
      title="Източници и проверки"
      lead={
        <p>
          Всяко число на сайта сочи към един от тези файлове и към точното място в него: таблица, ред, колона или абзац. Оригиналите се пазят
          непроменени. SHA-256 позволява на всеки да провери, че става дума за същия файл.
        </p>
      }
      facts={[
        { label: "Официални документи", value: String(data.documents.length), unit: "файла", decimals: 0, tone: "sky", note: "Изтеглени и пазени непроменени." },
        { label: "Версии на бюджета", value: String(data.versions.length), unit: "", decimals: 0, tone: "mustard", note: "Всяка с дата и правен статус." },
        { label: "Успешни проверки", value: String(passed), unit: `от ${data.checks.length}`, decimals: 0, tone: "mint", note: "Сборове, равенства и съвпадения между документите." },
      ]}
      factsSource="публикуваната снимка на данните (списък на документите и резултатите от автоматичните проверки по-долу)."
    >
      <section aria-labelledby="ver" className="flex flex-col gap-3">
        <h2 id="ver" className="font-display text-[1.9rem] leading-[1.02] font-semibold tracking-tight sm:text-[2.4rem]">
          Версии на бюджета
        </h2>
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 [&>*]:min-w-0">
          {data.versions.map((v) => (
            <li key={v.id} className="flex flex-col gap-1 rounded-3xl border border-rule bg-surface p-5">
              <time className="num text-[13px] font-semibold text-ink-2" dateTime={v.date}>
                {dateBg(v.date)}
              </time>
              <div>
                <p className="font-medium">{v.label}</p>
                <p className="text-sm text-ink-2">Статус: {v.legalStatus}</p>
                <p className="text-[13px] text-ink-2">{v.evidence}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="docs" className="flex flex-col gap-3">
        <h2 id="docs" className="font-display text-[1.9rem] leading-[1.02] font-semibold tracking-tight sm:text-[2.4rem]">
          Документи ({data.documents.length})
        </h2>
        <DocumentsExplorer documents={data.documents} />
      </section>

      <section aria-labelledby="checks" className="flex flex-col gap-3">
        <h2 id="checks" className="font-display text-[1.9rem] leading-[1.02] font-semibold tracking-tight sm:text-[2.4rem]">
          Автоматични проверки ({data.checks.length})
        </h2>
        {kinds.map((k) => {
          const list = data.checks.filter((c) => c.kind === k);
          return (
            <details key={k} className="group rounded-3xl border border-rule bg-surface px-5 py-2" open={list.some((c) => c.status !== "pass")}>
              <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center gap-2 text-base font-semibold [&::-webkit-details-marker]:hidden">
                <span aria-hidden className="transition-transform group-open:rotate-90">›</span>
                {KIND_LABEL[k] ?? k}{" "}
                <span className="num text-sm font-normal text-ink-2">
                  {list.filter((c) => c.status === "pass").length}/{list.length} успешни
                </span>
              </summary>
              <ul className="mt-2 mb-3 flex flex-col gap-2">
                {list.map((c) => (
                  <li key={c.id} className="text-sm">
                    <span className={c.status === "pass" ? "text-beneficial" : c.status === "warn" ? "text-warning" : "text-adverse"}>
                      {c.status === "pass" ? "✓" : c.status === "warn" ? "!" : "✗"} {STATUS_LABEL[c.status]}
                    </span>{" "}
                    <span className="text-ink-2">{c.description}</span>
                    {c.details && c.status !== "pass" && (
                      <ul className="num mt-1 ml-5 text-[13px] text-ink-2">
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
    </PageShell>
  );
}
