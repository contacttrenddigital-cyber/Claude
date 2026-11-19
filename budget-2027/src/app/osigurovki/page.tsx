import type { Metadata } from "next";
import Link from "next/link";
import { PageShell, Section } from "@/components/site/PageShell";
import { TableView } from "@/components/tables/TableView";
import { changedRows, rowsInRange } from "@/lib/data/assumptions";
import { getPublished, tableOf } from "@/lib/data/published";
import { billSource } from "@/lib/data/view";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Осигуровки, МРЗ и социални плащания 2027",
  description: "Осигурителни вноски, максимален и минимален осигурителен доход, минимална заплата, пенсии и социални помощи за 2026–2029 г. по законопроекта за бюджет 2027.",
  alternates: { canonical: "/osigurovki" },
};

export default async function Insurance() {
  const data = await getPublished();
  const a = tableOf(data, "assumptions");
  const labour = rowsInRange(a, 10, 20);
  const social = rowsInRange(a, 21, 99);
  const src = billSource(data);
  const ch = (rows: number[]) => changedRows(a).filter((r) => rows.includes(r.rowIndex)).length;
  return (
    <PageShell
      eyebrow="Осигуровки и социални плащания"
      title="Осигуровки, МРЗ и социални плащания"
      lead={
        <p>
          Ставките на осигуровките остават същите. Максималният осигурителен доход става 2 400 €, минималната работна заплата е заложена
          на 660 €, а повечето семейни помощи и обезщетения се увеличават. Колко променя това твоята заплата, виж в{" "}
          <Link href="/kalkulator" className="underline underline-offset-2">
            калкулатора
          </Link>
          .
        </p>
      }
    >
      <Section id="trud" title={`Труд и осигуровки (${ch(labour)} промени)`} lead="Приложение № 2, редове 10–20. Маркирани са редовете с различна стойност за 2027 г.">
        <TableView table={a} only={labour} columns={["2026", "2027", "2028", "2029"]} sourceUrl={src.url} sourceTitle={src.title} highlightChanges={["2026", "2027"]} />
      </Section>
      <Section id="sotsialni" title={`Пенсии и социални плащания (${ch(social)} промени)`} lead="Приложение № 2, редове 21–44: пенсии, обезщетения, семейни помощи.">
        <TableView table={a} only={social} columns={["2026", "2027", "2028", "2029"]} sourceUrl={src.url} sourceTitle={src.title} highlightChanges={["2026", "2027"]} searchable maxHeight="40rem" />
      </Section>
    </PageShell>
  );
}
