import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Decimal from "decimal.js";
import { PageShell, Section } from "@/components/site/PageShell";
import { getPublished } from "@/lib/data/published";
import { billSource } from "@/lib/data/view";
import { municipalitySlug } from "@/lib/municipal/slug";
import { fmtNum, fmtSigned } from "@/lib/format";

export const revalidate = 3600;

const KINDS: [string, string][] = [
  ["total", "Основни бюджетни взаимоотношения (общо)"],
  ["delegated", "Обща субсидия за делегираните от държавата дейности"],
  ["equalizing", "Обща изравнителна субсидия"],
  ["winter", "Зимно поддържане и снегопочистване"],
  ["capital", "Целева субсидия за капиталови разходи"],
];

async function find(slug: string) {
  const data = await getPublished();
  const m = data.municipalities.find((x) => municipalitySlug(x, data.municipalities) === slug);
  return m ? { data, m } : null;
}

export async function generateStaticParams() {
  const data = await getPublished();
  return data.municipalities.map((m) => ({ slug: municipalitySlug(m, data.municipalities) }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const f = await find(slug);
  return f
    ? {
        title: `Община ${f.m.name}: трансфери 2027`,
        description: `Трансферите от държавния бюджет към община ${f.m.name} (област ${f.m.region}) за 2027 г. по законопроекта, сравнени с 2026 г.`,
        alternates: { canonical: `/obshtini/${slug}` },
      }
    : {};
}

export default async function Municipality({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = await find(slug);
  if (!f) notFound();
  const { data, m } = f;
  const src = billSource(data);
  const all = data.municipalities;
  const rank = (list: typeof all) => [...list].sort((a, b) => new Decimal(b.perCapita2027).comparedTo(a.perCapita2027)).findIndex((x) => x.code === m.code) + 1;
  const inRegion = all.filter((x) => x.region === m.region);
  const sigma = data.documents.find((d) => d.id.startsWith("sigma-municipalities"));
  return (
    <PageShell
      eyebrow={`Община · област ${m.region}`}
      title={`Община ${m.name}`}
      lead={
        <p>
          Население {fmtNum(String(m.population), 0)} души (01.01.2024 г., Евростат GISCO). Код {m.code}. Трансферите са от централния
          бюджет; собствените приходи на общината не са включени.
        </p>
      }
    >
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <article className="flex flex-col gap-1 border-t border-rule-strong pt-3">
          <h2 className="text-[13px] font-medium tracking-wide text-ink-2 uppercase">Трансфер на жител, 2027</h2>
          <p className="num text-4xl font-semibold">
            {fmtNum(m.perCapita2027, 0)} <span className="text-base font-normal text-muted">€</span>
          </p>
          <p className="num text-sm text-ink-2">2026: {fmtNum(m.perCapita2026, 0)} €</p>
        </article>
        <article className="flex flex-col gap-1 border-t border-rule-strong pt-3">
          <h2 className="text-[13px] font-medium tracking-wide text-ink-2 uppercase">Място по трансфер на жител</h2>
          <p className="num text-4xl font-semibold">
            {rank(all)} <span className="text-base font-normal text-muted">от {all.length}</span>
          </p>
          <p className="num text-sm text-ink-2">
            {rank(inRegion)} от {inRegion.length} в област {m.region}
          </p>
        </article>
        <article className="flex flex-col gap-1 border-t border-rule-strong pt-3">
          <h2 className="text-[13px] font-medium tracking-wide text-ink-2 uppercase">Общо 2027 · проект</h2>
          <p className="num text-4xl font-semibold">
            {fmtNum(m.y2027.total)} <span className="text-base font-normal text-muted">хил. €</span>
          </p>
        </article>
      </div>
      <Section title="2027 (проект) срещу 2026 (закон)">
        <div className="overflow-x-auto">
          <table className="num w-full text-sm">
            <caption className="sr-only">Трансфери към община {m.name}, хил. €</caption>
            <thead>
              <tr className="border-b border-rule-strong text-xs text-muted">
                <th scope="col" className="py-2 pr-3 text-left font-normal">
                  Вид трансфер, хил. €
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-normal">
                  2026 (закон)
                </th>
                <th scope="col" className="py-2 pr-3 text-right font-normal">
                  2027 (проект)
                </th>
                <th scope="col" className="py-2 text-right font-normal">
                  Разлика
                </th>
              </tr>
            </thead>
            <tbody>
              {KINDS.map(([k, label]) => {
                const a = m.y2026[k] ?? null;
                const b = m.y2027[k] ?? null;
                return (
                  <tr key={k} className={`border-b border-rule ${k === "total" ? "font-semibold" : ""}`}>
                    <th scope="row" className={`py-2 pr-3 text-left ${k === "total" ? "" : "pl-4 font-normal text-ink-2"}`}>
                      {label}
                    </th>
                    <td className="py-2 pr-3 text-right">{a === null ? "—" : fmtNum(a)}</td>
                    <td className="py-2 pr-3 text-right">{b === null ? "—" : fmtNum(b)}</td>
                    <td className="py-2 text-right">{a !== null && b !== null ? fmtSigned(new Decimal(b).minus(a).toFixed(1)) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">
          2027:{" "}
          <a href={src.url} rel="noreferrer" className="underline underline-offset-2">
            {src.title}
          </a>
          , {m.billLocator}. 2026: {sigma?.title}. Отпечатано име в законопроекта: „{m.billName}“.
        </p>
      </Section>
      <p className="text-sm">
        <Link href="/obshtini" className="underline underline-offset-2">
          Всички общини и карта
        </Link>
      </p>
    </PageShell>
  );
}
