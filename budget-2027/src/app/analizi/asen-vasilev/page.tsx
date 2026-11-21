import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ClaimsExplorer } from "@/components/claims/ClaimsExplorer";
import { PageShell } from "@/components/site/PageShell";
import { ClaimsArchive } from "@/lib/claims/schema";
import { getClaimsArchive } from "@/lib/data/claims";
import { dateBg } from "@/lib/format";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Асен Василев за Бюджет 2027: проверка",
  description:
    "Твърденията на Асен Василев за Бюджет 2027, проверени спрямо официалните документи: цитат, официални числа, пресмятане, оценка, контекст и позиция на правителството.",
  alternates: { canonical: "/analizi/asen-vasilev" },
};

export default async function AsenVasilevPage() {
  const archive = await getClaimsArchive("Асен Василев");
  // coverage metadata lives with the verified archive file
  const meta = ClaimsArchive.parse(JSON.parse(readFileSync(join(process.cwd(), "data/claims/asen-vasilev.json"), "utf8")));
  const claims = archive.statements.flatMap((s) => s.claims);
  const count = (v: string[]) => String(claims.filter((c) => v.includes(c.verdict)).length);
  return (
    <PageShell
      eyebrow="Анализи · проверка на твърдения"
      title="Асен Василев за Бюджет 2027"
      lead={
        <p>
          {meta.speakerRole.charAt(0).toUpperCase() + meta.speakerRole.slice(1)}. Всяко твърдение е сравнено с официалните документи. Прогнозите и мненията не обявяваме нито за верни, нито за
          неверни.
        </p>
      }
      facts={[
        { label: "Потвърдени", value: count(["Потвърдено"]), unit: `от ${claims.length}`, decimals: 0, tone: "mint" },
        { label: "Частично верни или подвеждащи", value: count(["Частично вярно", "Подвеждащо", "Невярно"]), unit: `от ${claims.length}`, decimals: 0, tone: "mustard" },
        { label: "Прогнози, мнения, без данни", value: count(["Прогноза", "Мнение", "Недостатъчно данни"]), unit: `от ${claims.length}`, decimals: 0, tone: "lilac" },
      ]}
      factsSource="оценките на твърденията по-долу (методиката е описана под тях)."
    >
        <section aria-labelledby="method" className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3 [&>*]:min-w-0 [&>div]:rounded-3xl [&>div]:border [&>div]:border-rule [&>div]:bg-surface [&>div]:p-5">
          <div>
            <h2 id="method" className="font-semibold">
              Как проверяваме
            </h2>
            <p className="mt-1 text-ink-2">{meta.method}</p>
          </div>
          <div>
            <h2 className="font-semibold">Обхват</h2>
            <p className="mt-1 text-ink-2">
              {archive.statements.length} изказвания, {archive.statements.reduce((n, s) => n + s.claims.length, 0)} твърдения. Търсено в:{" "}
              {meta.coverage.searched.join(", ")}. {meta.coverage.note}
            </p>
            <ul className="mt-1 list-disc pl-5 text-xs text-muted">
              {meta.coverage.notAccessible.map((n) => (
                <li key={n.source}>
                  {n.source}: {n.reason}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-semibold">Статус на прегледа</h2>
            <p className="mt-1 text-ink-2">
              {meta.reviewer}, {dateBg(meta.reviewedOn)}. Цитатите са кратки и дословни; пълните текстове са при издателите.
              Платформата не е свързана с никоя партия, институция или издание.
            </p>
          </div>
        </section>

        <section aria-labelledby="statements" className="flex flex-col gap-3">
          <h2 id="statements" className="font-display text-[2.2rem] font-semibold tracking-tight">
            Изказвания
          </h2>
          <ol className="flex flex-col">
            {archive.statements.map((s) => (
              <li key={s.id} className="grid grid-cols-1 gap-1 border-b border-rule py-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
                <time dateTime={s.date} className="num text-sm text-muted">
                  {dateBg(s.date)}
                </time>
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-sm text-ink-2">{s.summary}</p>
                  <p className="text-xs text-muted">
                    {s.platform} · {s.claims.length} твърдения
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="claims" className="flex flex-col gap-4">
          <h2 id="claims" className="font-display text-[2.2rem] font-semibold tracking-tight">
            Твърдения и проверка
          </h2>
          <ClaimsExplorer archive={archive} />
        </section>
    </PageShell>
  );
}
