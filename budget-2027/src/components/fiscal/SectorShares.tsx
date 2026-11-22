/** Main functions of КФП (Табл. III-1): share of the total and change against 2026, with links to the topic pages. */
import Link from "next/link";
import type { TableData } from "@/lib/ingest/snapshot-schema";
import { sectorRows } from "@/lib/analysis/sectors";
import { fmtNum, fmtSigned } from "@/lib/format";

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

export function SectorShares({ functions: f, src }: { functions: TableData; src: { url: string; title: string } }) {
  const s = sectorRows(f);
  const sorted = [...s.rows].sort((a, b) => b.share.comparedTo(a.share));
  return (
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
          ).
        </p>
      </div>
  );
}
