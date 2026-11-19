import type { Metadata } from "next";
import Link from "next/link";
import Decimal from "decimal.js";
import { PageShell, Section } from "@/components/site/PageShell";
import { TableView } from "@/components/tables/TableView";
import { changedRows, rowsInRange } from "@/lib/data/assumptions";
import { measureGroup } from "@/lib/data/derive";
import { getPublished, tableOf } from "@/lib/data/published";
import { billSource } from "@/lib/data/view";
import { fmtNum } from "@/lib/format";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Положителните мерки в Бюджет 2027",
  description: "Облекченията за деца, по-високите социални плащания и увеличенията на заплатите в бюджета за 2027 г., с размери и източници.",
  alternates: { canonical: "/pozitivni-merki" },
};

export default async function Positive() {
  const data = await getPublished();
  const a = tableOf(data, "assumptions");
  const src = billSource(data);
  const pos = data.measures.filter((m) => measureGroup(m.direction, m.effect2027) === "relief-or-more-spending");
  const total = pos.reduce((s, m) => s.plus(new Decimal(m.effect2027!).abs()), new Decimal(0));
  const socialChanged = changedRows(a).filter((r) => rowsInRange(a, 21, 99).includes(r.rowIndex));
  return (
    <PageShell
      eyebrow="Положителни мерки"
      title="Какво се подобрява"
      lead={
        <p>
          Бюджетът съдържа и мерки в полза на семейства, работещи родители, получатели на социални плащания и служители в публичния
          сектор. Показваме ги със същата строгост като критиките: размер, източник и за кого се отнасят.
        </p>
      }
    >
      <Section id="merki" title={`Мерки с ефект ${fmtNum(total.toFixed(1))} млн. € през 2027 г.`} lead="Табл. II-7 (облекчения) и II-8 (увеличени разходи), оценка на МФ.">
        <ul className="flex flex-col">
          {pos.map((m) => (
            <li key={m.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 border-b border-rule py-2 text-sm">
              <span>
                {m.title}
                <span className="block text-xs text-muted">{m.direction === "revenue" ? "данъчно облекчение (по-малко приходи)" : "увеличени разходи"}</span>
              </span>
              <span className="num font-semibold">{fmtNum(new Decimal(m.effect2027!).abs().toFixed(1))} млн. €</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section id="sotsialni" title={`Социални плащания с различен размер през 2027 г. (${socialChanged.length})`} lead="Приложение № 2: стойностите за 2026 и 2027 г.; за кого се отнасят — в наименованието на реда.">
        <TableView table={a} only={socialChanged.map((r) => r.rowIndex)} columns={["2026", "2027"]} sourceUrl={src.url} sourceTitle={src.title} highlightChanges={["2026", "2027"]} />
      </Section>
      <p className="text-sm">
        Как се отразяват облекченията за деца на заплатата:{" "}
        <Link href="/kalkulator" className="underline underline-offset-2">
          калкулатор
        </Link>
        .
      </p>
    </PageShell>
  );
}
