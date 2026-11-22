/** Entry page for one kind of reader ("I work on a salary", "I am a pensioner", …): what changes, with sources, and where to go next. */
import Link from "next/link";
import { Icon, type IconName } from "@/components/site/Icon";
import { PageShell, Section, type ShellFact } from "@/components/site/PageShell";

export interface RoleChange {
  title: string;
  text: string;
  /** where it is printed */
  source: string;
  sourceUrl?: string;
}
export interface RoleTool {
  href: string;
  title: string;
  text: string;
  icon: IconName;
}

const TOOL_BG = ["bg-card-coral", "bg-card-mustard", "bg-card-sky", "bg-card-mint", "bg-card-lilac"];

export function RolePage({
  eyebrow,
  title,
  lead,
  facts,
  factsSource,
  changes,
  tools,
  children,
}: {
  eyebrow: string;
  title: string;
  lead: React.ReactNode;
  facts: ShellFact[];
  factsSource: string;
  changes: RoleChange[];
  tools: RoleTool[];
  children?: React.ReactNode;
}) {
  return (
    <PageShell eyebrow={eyebrow} title={title} lead={lead} facts={facts} factsSource={factsSource}>
      {children}
      <Section id="promeni" title="Какво се променя за теб" lead="Предложенията в законопроектите за 2027 г. Законът още не е приет и може да се промени.">
        <ol className="grid grid-cols-1 gap-4 md:grid-cols-2 [&>*]:min-w-0">
          {changes.map((c, i) => (
            <li key={c.title} className="flex flex-col gap-2 rounded-3xl border border-rule bg-surface p-5">
              <p className="flex items-center gap-2 text-[13px] font-semibold text-ink-2">
                <span aria-hidden className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-tile text-[12px] text-white">
                  {i + 1}
                </span>
                {c.title}
              </p>
              <p className="text-[16px] leading-relaxed text-ink">{c.text}</p>
              <p className="mt-auto text-[13px] text-ink-2">
                Източник:{" "}
                {c.sourceUrl ? (
                  <a href={c.sourceUrl} rel="noreferrer" className="underline underline-offset-2">
                    {c.source}
                  </a>
                ) : (
                  c.source
                )}
              </p>
            </li>
          ))}
        </ol>
      </Section>
      <Section id="instrumenti" title="Виж подробно">
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((t, i) => (
            <li key={t.href}>
              <Link href={t.href} className={`group flex h-full flex-col gap-3 rounded-3xl p-5 text-on-card transition hover:brightness-105 ${TOOL_BG[i % TOOL_BG.length]}`}>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-tile text-white">
                  <Icon name={t.icon} />
                </span>
                <span className="font-display text-[1.6rem] leading-tight font-semibold">{t.title}</span>
                <span className="text-[15px] text-on-card-2">{t.text}</span>
                <span className="mt-auto text-sm font-semibold underline-offset-4 group-hover:underline">Отвори →</span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>
    </PageShell>
  );
}
