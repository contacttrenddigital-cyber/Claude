import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "@/components/site/Icon";
import { PageShell, Section } from "@/components/site/PageShell";
import { getPublished } from "@/lib/data/published";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "За платформата",
  description: "Какво е „Бюджет 2027 — под лупа“, откъде са данните, как се проверяват числата и какво още не е направено.",
  alternates: { canonical: "/za-platformata" },
};

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: "download", title: "Сваляме официалните документи", text: "Законопроектите от сайта на Народното събрание, решенията на Министерския съвет, данните на Евростат. Запазваме цифров отпечатък (SHA-256) на всеки файл." },
  { icon: "file", title: "Извличаме числата с точен адрес", text: "Всяко число помни документа, таблицата, реда и колоната, от които е взето. Не преписваме на ръка." },
  { icon: "check", title: "Проверяваме ги автоматично", text: "Сборовете трябва да дават общото, приходите минус разходите трябва да дават салдото, едно и също число на две места трябва да съвпада. Ако нещо не се връзва, не го публикуваме." },
  { icon: "book", title: "Обясняваме на прост език", text: "Показваме и рисковете, и подобренията. Изчисленията (проценти, дялове) са описани и тествани с реалните стойности." },
];

export default async function About() {
  const data = await getPublished();
  const pass = data.checks.filter((c) => c.status === "pass").length;
  return (
    <PageShell
      eyebrow="За платформата"
      title="Бюджетът на държавата е и твой бюджет"
      lead={
        <p>
          „Бюджет 2027 — под лупа“ е независим сайт, който обяснява проекта на държавния бюджет за 2027 г.: откъде идват парите, къде
          отиват и какво променя за хората и фирмите. Не сме свързани с правителство, партия или институция.
        </p>
      }
    >
      <Section id="kak" title="Как работим">
        <ol className="grid gap-4 md:grid-cols-2">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4 rounded-3xl border border-rule bg-surface p-6">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-tile text-white">
                <Icon name={s.icon} />
              </span>
              <span className="flex flex-col gap-1.5">
                <span className="text-sm text-muted">Стъпка {i + 1}</span>
                <span className="text-lg font-semibold">{s.title}</span>
                <span className="text-[15px] leading-relaxed text-ink-2">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="text-[15px] text-ink-2">
          В момента публикуваните данни минават {pass} автоматични проверки.{" "}
          <Link href="/iztochnitsi" className="font-medium text-accent underline-offset-4 hover:underline">
            Виж всички източници и проверки
          </Link>
          .
        </p>
      </Section>

      <Section id="pravila" title="Нашите правила">
        <ul className="grid max-w-3xl gap-3 text-[15px] leading-relaxed text-ink-2">
          <li><strong className="text-ink">Без число без източник.</strong> Ако няма официален документ, пишем „няма данни“, а не оценка.</li>
          <li><strong className="text-ink">Сравняваме само сравнимото.</strong> Проект не е закон, а прогноза не е отчет. Държавният бюджет не е целият публичен сектор.</li>
          <li><strong className="text-ink">Поправките остават видими.</strong> Всяка промяна на данните е нова версия; старите не се изтриват.</li>
        </ul>
      </Section>

      <Section id="ogranichenia" title="Какво още не е направено">
        <ul className="grid max-w-3xl list-disc gap-2 pl-5 text-[15px] leading-relaxed text-ink-2">
          <li>Числата се проверяват автоматично; редактор от екипа още не ги е одобрил.</li>
          <li>Няма данни за обществени поръчки и плащания по договори.</li>
          <li>Показателите за резултати от програмните бюджети още не са извлечени.</li>
          <li>Калкулаторът е само за трудов договор.</li>
        </ul>
        <p className="text-[15px] text-ink-2">
          Пълният списък е в{" "}
          <Link href="/metodologia" className="font-medium text-accent underline-offset-4 hover:underline">
            методологията
          </Link>
          .
        </p>
      </Section>
    </PageShell>
  );
}
