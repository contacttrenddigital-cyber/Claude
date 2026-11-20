import type { Metadata } from "next";
import Link from "next/link";
import { RankedBars } from "@/components/charts/RankedBars";
import { PageShell, Section } from "@/components/site/PageShell";
import { getPublished, tableOf } from "@/lib/data/published";
import { billSource } from "@/lib/data/view";
import { sectorRows } from "@/lib/analysis/sectors";
import { fmtNum, fmtSigned } from "@/lib/format";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Сектори: къде отиват парите по функции 2027",
  description: "Разходите по КФП за 2027 г. по функции: дял от общото, промяна спрямо очакваното изпълнение за 2026 г. и връзки към подробните страници.",
  alternates: { canonical: "/sektori" },
};

const LINKS: Record<string, { href: string; text: string }[]> = {
  "Отбрана и сигурност": [{ href: "/otbrana", text: "Отбрана" }],
  Образование: [{ href: "/obrazovanie", text: "Образование" }],
  Здравеопазване: [{ href: "/zdraveopazvane", text: "Здравеопазване и НЗОК" }],
  "Социално осигуряване, подпомагане и грижи": [
    { href: "/pensii", text: "Пенсии и ДОО" },
    { href: "/osigurovki", text: "Социални плащания" },
  ],
  "Икономически дейности и услуги": [{ href: "/investitsii", text: "Инвестиционни проекти" }],
  "Общи държавни служби": [{ href: "/institutsii", text: "Институции" }],
};

export default async function Sectors() {
  const data = await getPublished();
  const f = tableOf(data, "functions");
  const src = billSource(data);
  const s = sectorRows(f);
  const sorted = [...s.rows].sort((a, b) => b.share.comparedTo(a.share));
  return (
    <PageShell
      eyebrow="Сектори"
      title="Разходите по сектори"
      lead={
        <p>
          Табл. III-1 от мотивите разпределя разходите по консолидираната фискална програма (КФП) по функции. Дяловете са от сбора на
          деветте основни функции за 2027 г. ({fmtNum(s.total, 1)} млн. €). Сравнението е с очакваното изпълнение за 2026 г. от същия документ.
        </p>
      }
    >
      <Section id="dyalove" title="Дял и промяна по функции">
        <RankedBars
          title="Разходи по функции, 2027"
          subtitle="КФП, млн. €. Маркерът е очакваното изпълнение за 2026 г."
          items={s.rows.map((r) => ({ label: r.label, value: r.value, base: r.base }))}
          unit="млн. €"
          valueLabel="2027 (проект)"
          baseLabel="2026 (очаквано)"
        />
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Функции: дял от общото и промяна (таблица)">
          <table className="num w-full min-w-[36rem] text-sm">
            <caption className="mb-2 text-left text-base font-semibold text-ink">Функции: дял от общото и промяна</caption>
            <thead>
              <tr className="border-b border-rule-strong text-xs text-muted">
                <th scope="col" className="py-1 pr-3 text-left font-normal">
                  Функция
                </th>
                <th scope="col" className="py-1 pr-3 text-right font-normal">
                  2027, млн. €
                </th>
                <th scope="col" className="py-1 pr-3 text-right font-normal">
                  Дял
                </th>
                <th scope="col" className="py-1 pr-3 text-right font-normal">
                  Спрямо 2026, млн. €
                </th>
                <th scope="col" className="py-1 pr-3 text-right font-normal">
                  Спрямо 2026, %
                </th>
                <th scope="col" className="py-1 text-left font-normal">
                  Подробно
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.label} className="border-b border-rule">
                  <th scope="row" className="py-1.5 pr-3 text-left font-normal">
                    {r.label}
                  </th>
                  <td className="py-1.5 pr-3 text-right">{fmtNum(r.value, 1)}</td>
                  <td className="py-1.5 pr-3 text-right">{fmtNum(r.share, 1)}%</td>
                  <td className="py-1.5 pr-3 text-right">{fmtSigned(r.delta, 1)}</td>
                  <td className="py-1.5 pr-3 text-right">{fmtSigned(r.change, 1)}%</td>
                  <td className="py-1.5 text-left">
                    {(LINKS[r.label] ?? []).map((l, i) => (
                      <span key={l.href}>
                        {i > 0 && ", "}
                        <Link href={l.href} className="underline underline-offset-2">
                          {l.text}
                        </Link>
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-muted">
            Източник:{" "}
            <a href={src.url} rel="noreferrer" className="underline underline-offset-2">
              {src.title}
            </a>
            , Табл. III-1. Дяловете и промените са изчислени от отпечатаните стойности (виж{" "}
            <Link href="/metodologia" className="underline underline-offset-2">
              методологията
            </Link>
            ). Подфункциите са в{" "}
            <Link href="/razhodi#funktsii" className="underline underline-offset-2">
              Разходи
            </Link>
            .
          </p>
        </div>
      </Section>
    </PageShell>
  );
}
