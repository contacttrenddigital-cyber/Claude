import type { Metadata } from "next";
import { PageShell, Section } from "@/components/site/PageShell";
import { getPublished } from "@/lib/data/published";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Отворени данни",
  description: "Изтеглете данните на платформата в CSV и JSON: показатели, мерки, таблици, общини и проверени твърдения, с източник и версия.",
  alternates: { canonical: "/danni" },
};

export default async function OpenData() {
  const data = await getPublished();
  const sets: [string, string, string][] = [
    ["pokazateli", "Показатели 2025–2029", "Всички извлечени показатели с обхват, основа, статус, стойност и точен локатор."],
    ["merki", "Мерки", "36-те дискреционни мерки с ефект за 2027–2029 г. (оценка на МФ)."],
    ["obshtini", "Общини", "Трансфери 2026 и 2027 и сума на жител за 265 общини."],
    ["tvardenia", "Проверени твърдения", "Архивът на изказванията на Асен Василев с оценки."],
    ...Object.values(data.tables).map((t) => [`tablitsi/${t.id}`, t.title, t.description] as [string, string, string]),
  ];
  return (
    <PageShell
      eyebrow="Данни"
      title="Отворени данни"
      lead={
        <p>
          Всеки набор е от публикуваната снимка {data.snapshot.id}. Файловете съдържат метаданни: снимка, дата на извличане, правен
          статус и източник. Десетичният знак в CSV е точка, кодировката е UTF-8. API: <code className="font-mono text-sm">/api/danni/&lt;набор&gt;?format=csv|json</code>.
        </p>
      }
    >
      <Section title={`${sets.length} набора`}>
        <ul className="flex flex-col">
          {sets.map(([id, title, desc]) => (
            <li key={id} className="grid grid-cols-1 gap-1 border-b border-rule py-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <p className="font-medium">{title}</p>
                <p className="text-sm text-ink-2">{desc}</p>
              </div>
              <p className="flex gap-3 text-sm">
                <a href={`/api/danni/${id}?format=csv`} className="inline-flex min-h-11 items-center underline underline-offset-2">
                  CSV
                </a>
                <a href={`/api/danni/${id}`} className="inline-flex min-h-11 items-center underline underline-offset-2">
                  JSON
                </a>
              </p>
            </li>
          ))}
        </ul>
      </Section>
    </PageShell>
  );
}
