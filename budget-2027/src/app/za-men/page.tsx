import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "@/components/site/Icon";
import { PageShell } from "@/components/site/PageShell";

export const metadata: Metadata = {
  title: "За мен: какво променя Бюджет 2027",
  description: "Избери кой си — на заплата, пенсионер, с фирма или от коя община — и виж само това, което те засяга в бюджета за 2027 г.",
  alternates: { canonical: "/za-men" },
};

const ROLES: { href: string; title: string; text: string; icon: IconName; bg: string }[] = [
  { href: "/za-men/zaplata", title: "Работя на заплата", text: "Заплата, осигуровки, данък, облекчения за деца.", icon: "calculator", bg: "bg-card-coral" },
  { href: "/za-men/pensioner", title: "Пенсионер съм", text: "Пенсиите през 2027 г.", icon: "users", bg: "bg-card-mustard" },
  { href: "/za-men/firma", title: "Имам фирма", text: "Данъци, такси, разход за служител, поръчки.", icon: "briefcase", bg: "bg-card-sky" },
  { href: "/za-men/obshtina", title: "Моята община", text: "Колко получава твоята община от държавата.", icon: "map", bg: "bg-card-mint" },
];

export default function ForMe() {
  return (
    <PageShell eyebrow="За мен" title="Какво променя бюджетът за мен" lead={<p>Избери кой си и ще видиш само това, което те засяга, с източник за всяко число.</p>}>
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        {ROLES.map((r) => (
          <li key={r.href}>
            <Link href={r.href} className={`group flex h-full flex-col gap-3 rounded-[2rem] p-6 text-on-card transition hover:-translate-y-1 ${r.bg}`}>
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-tile text-white">
                <Icon name={r.icon} className="h-7 w-7" />
              </span>
              <span className="font-display text-[2rem] leading-tight font-semibold">{r.title}</span>
              <span className="text-[16px] text-on-card-2">{r.text}</span>
              <span className="mt-auto text-sm font-semibold underline-offset-4 group-hover:underline">Отвори →</span>
            </Link>
          </li>
        ))}
      </ul>
    </PageShell>
  );
}
