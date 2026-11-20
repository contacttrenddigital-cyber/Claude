import Decimal from "decimal.js";
import Link from "next/link";
import { Icon, type IconName } from "@/components/site/Icon";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { sectorRows } from "@/lib/analysis/sectors";
import { NoPublishedSnapshotError, getPublished, tableOf, type Published } from "@/lib/data/published";
import { findingsData } from "@/lib/data/view";
import { computeFindings } from "@/lib/findings";
import { bgText, dateBg, fmtNum } from "@/lib/format";
import { homeFacts } from "@/lib/home";

export const revalidate = 3600;

const ENTRIES: { href: string; icon: IconName; title: string; text: string; cta: string }[] = [
  {
    href: "/kalkulator",
    icon: "calculator",
    title: "Как ме засяга?",
    text: "Въведи брутната си заплата и виж колко ще получаваш на ръка през 2027 г. в сравнение с 2026 г.",
    cta: "Към калкулатора",
  },
  {
    href: "/sektori",
    icon: "pie",
    title: "Къде отиват парите?",
    text: "Пенсии, здраве, образование, отбрана: колко отива за всяко и как се променя спрямо тази година.",
    cta: "Виж разходите",
  },
  {
    href: "/analizi/asen-vasilev",
    icon: "check",
    title: "Вярно ли е?",
    text: "Проверяваме какво казват политиците за бюджета срещу официалните документи. Без мнения, с източници.",
    cta: "Към проверките",
  },
];

const TOPICS: { href: string; icon: IconName; title: string; text: string }[] = [
  { href: "/prihodi", icon: "coins", title: "Приходи", text: "Откъде идват парите" },
  { href: "/danatsi", icon: "receipt", title: "Данъци", text: "Какво се променя" },
  { href: "/defitsit", icon: "scale", title: "Дефицит", text: "Колко не достига" },
  { href: "/dalg", icon: "trend", title: "Дълг", text: "Колко дължим" },
  { href: "/pensii", icon: "users", title: "Пенсии", text: "Най-голямото перо" },
  { href: "/zdraveopazvane", icon: "cross", title: "Здраве", text: "Бюджетът на касата" },
  { href: "/obrazovanie", icon: "book", title: "Образование", text: "Училища и учители" },
  { href: "/otbrana", icon: "shield", title: "Отбрана", text: "Целите в НАТО" },
  { href: "/biznes", icon: "briefcase", title: "Фирми", text: "Нови данъци и мерки" },
  { href: "/obshtini", icon: "map", title: "Моята община", text: "265 общини на карта" },
  { href: "/programi", icon: "layers", title: "Министерства", text: "За какво харчат" },
  { href: "/sravnenia", icon: "globe", title: "България в ЕС", text: "Сравнение с другите" },
];

const FACT_TEXT: Record<string, { label: string; verb: string }> = {
  "kfp.revenue": { label: "Приходи", verb: "Държавата планира да събере" },
  "kfp.expenditure": { label: "Разходи", verb: "и да похарчи" },
  "kfp.balance": { label: "Дефицит", verb: "Недостигът е" },
  "debt.government": { label: "Държавен дълг", verb: "Дългът в края на годината" },
};

export default async function Home() {
  let data: Published;
  try {
    data = await getPublished();
  } catch (e) {
    if (e instanceof NoPublishedSnapshotError) return <NoData />;
    throw e;
  }
  const bill = data.versions.find((v) => v.id === "bill-2026-11-16")!;
  const get = (k: string) => data.series[`${k}@bill-2026-11-16`]?.points.find((p) => p.period === "2027")?.value ?? null;
  const facts = homeFacts(get);
  const F = Object.fromEntries(facts.map((f) => [f.key, f]));
  const sectors = sectorRows(tableOf(data, "functions"));
  const ranked = [...sectors.rows].sort((a, b) => b.share.comparedTo(a.share));
  const top = ranked.slice(0, 5);
  const rest = ranked.slice(5);
  const restShare = rest.reduce((s, r) => s.plus(r.share), new Decimal(0));
  const bn = (v: string) => new Decimal(v).dividedBy(1000).toFixed(1);
  const findings = computeFindings(findingsData(data));
  const pick = ["lihvi", "kapitalovi", "polozhitelni"].map((id) => findings.find((f) => f.id === id)!).filter(Boolean);
  const checks = { pass: data.checks.filter((c) => c.status === "pass").length, fail: data.checks.filter((c) => c.status === "fail").length };
  const official = data.documents.filter((d) => !d.publisher.startsWith("СИГМА")).length;
  const snap = { id: data.snapshot.id, publishedAt: data.snapshot.publishedAt ? dateBg(data.snapshot.publishedAt) : "—", publishedBy: data.snapshot.publishedBy ?? "—" };

  return (
    <>
      <SiteHeader />
      <main id="main">
        {/* ── Hero ───────────────────────────────────────────── */}
        <section aria-labelledby="hero-title" className="relative overflow-hidden bg-[#08111f] text-[#f7f9fc]">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(60rem 30rem at 85% -10%, rgba(255,107,0,0.22), transparent 60%), radial-gradient(50rem 30rem at -10% 110%, rgba(57,135,229,0.25), transparent 60%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "48px 48px" }}
          />
          <div className="relative mx-auto grid max-w-7xl gap-10 px-4 pt-12 pb-14 sm:px-6 sm:pt-20 sm:pb-20 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-center">
            <div className="flex flex-col gap-6">
              <p className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-[13px] text-[#c9d3e1] ring-1 ring-white/15">
                <span className="h-2 w-2 rounded-full bg-[#ff6b00]" aria-hidden />
                Законопроект, внесен на {dateBg(bill.date)} · още не е приет
              </p>
              <h1 id="hero-title" className="text-[2.6rem] leading-[1.05] font-semibold tracking-tight text-balance sm:text-6xl lg:text-[4.2rem]">
                Бюджет 2027,
                <br />
                <span className="text-[#ff8a3d]">обяснен ясно.</span>
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-[#c9d3e1] sm:text-xl">
                Откъде идват парите на държавата, къде отиват и как това засяга теб. Независимо, на прост език и с източник за всяко
                число.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/kalkulator"
                  className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#ff6b00] px-6 text-base font-semibold text-[#08111f] shadow-lg shadow-[#ff6b00]/20 transition hover:brightness-110"
                >
                  <Icon name="calculator" />
                  Изчисли как те засяга
                </Link>
                <Link href="#kade" className="inline-flex min-h-12 items-center gap-2 rounded-full px-6 text-base font-medium text-white ring-1 ring-white/30 transition hover:bg-white/10">
                  Къде отиват парите
                  <Icon name="arrow" className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="rounded-3xl bg-white/[0.06] p-6 ring-1 ring-white/15 backdrop-blur sm:p-8" aria-labelledby="facts-title">
              <h2 id="facts-title" className="text-sm font-medium tracking-wide text-[#c9d3e1]">
                Бюджетът за 2027 г. с 4 числа
              </h2>
              <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-6">
                {facts.map((f) => (
                  <div key={f.key} className="flex flex-col gap-1">
                    <dt className="text-[13px] text-[#c9d3e1]">{FACT_TEXT[f.key]!.label}</dt>
                    <dd className="num text-3xl font-semibold tracking-tight sm:text-4xl">
                      {fmtNum(f.value, 1)}
                      <span className="ml-1 text-base font-normal text-[#c9d3e1]">млрд. €</span>
                    </dd>
                    {f.pctGdp && <dd className="num text-[13px] text-[#8fa0b8]">{fmtNum(f.pctGdp.replace("-", ""), 1)}% от БВП</dd>}
                  </div>
                ))}
              </dl>
              <p className="mt-6 border-t border-white/10 pt-4 text-[15px] leading-relaxed text-[#dfe6f0]">
                {FACT_TEXT["kfp.revenue"]!.verb} <strong className="num font-semibold text-white">{fmtNum(F["kfp.revenue"]!.value, 1)} млрд. €</strong>{" "}
                {FACT_TEXT["kfp.expenditure"]!.verb} <strong className="num font-semibold text-white">{fmtNum(F["kfp.expenditure"]!.value, 1)} млрд. €</strong>.
                Разликата от <strong className="num font-semibold text-[#ff8a3d]">{fmtNum(F["kfp.balance"]!.value, 1)} млрд. €</strong> е дефицитът.
              </p>
              <p className="mt-3 text-xs text-[#8fa0b8]">
                Целият публичен сектор (консолидирана фискална програма), проект за 2027 г.{" "}
                <Link href="/tablo" className="underline underline-offset-2 hover:text-white">
                  Всички показатели
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* ── Entry points ───────────────────────────────────── */}
        <section aria-labelledby="start-title" className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 sm:pt-20">
          <h2 id="start-title" className="text-[1.75rem] font-semibold tracking-tight sm:text-4xl">
            С какво да започнеш?
          </h2>
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {ENTRIES.map((e, i) => (
              <li key={e.href}>
                <Link
                  href={e.href}
                  className={`group flex h-full flex-col gap-4 rounded-3xl border p-6 transition hover:-translate-y-0.5 hover:shadow-xl sm:p-7 ${
                    i === 0 ? "border-transparent bg-[#08111f] text-white shadow-lg" : "border-rule bg-surface hover:border-rule-strong"
                  }`}
                >
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl ${i === 0 ? "bg-[#ff6b00] text-[#08111f]" : "bg-surface-2 text-accent"}`}>
                    <Icon name={e.icon} className="h-6 w-6" />
                  </span>
                  <span className="text-2xl font-semibold tracking-tight">{e.title}</span>
                  <span className={`text-[15px] leading-relaxed ${i === 0 ? "text-[#c9d3e1]" : "text-ink-2"}`}>{e.text}</span>
                  <span className={`mt-auto inline-flex items-center gap-2 text-[15px] font-semibold ${i === 0 ? "text-[#ff8a3d]" : "text-accent"}`}>
                    {e.cta}
                    <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Where the money goes ───────────────────────────── */}
        <section id="kade" aria-labelledby="kade-title" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-16 sm:px-6 sm:pt-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start">
            <div className="flex flex-col gap-4">
              <p className="inline-flex w-fit rounded-full bg-surface-2 px-3 py-1 text-[13px] font-medium text-accent">Къде отиват парите</p>
              <h2 id="kade-title" className="text-[1.75rem] leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
                {fmtNum(top[0]!.share, 0)}% от разходите отиват за {top[0]!.label.toLowerCase().replace(", подпомагане и грижи", ", помощи и грижи")}
              </h2>
              <p className="text-[17px] leading-relaxed text-ink-2">
                {top[0]!.label.startsWith("Социално") ? "Тук влизат пенсиите и социалните помощи. " : ""}Следват {top[1]!.label.toLowerCase()} ({fmtNum(top[1]!.share, 0)}%),{" "}
                {top[2]!.label.toLowerCase()} ({fmtNum(top[2]!.share, 0)}%) и {top[3]!.label.toLowerCase()} ({fmtNum(top[3]!.share, 0)}%).
              </p>
              <Link href="/sektori" className="inline-flex w-fit items-center gap-2 text-[15px] font-semibold text-accent">
                Всички сектори и промените спрямо 2026 г.
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </div>
            <figure className="rounded-3xl border border-rule bg-surface p-5 sm:p-7">
              <figcaption className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-base font-semibold">Разходи по сектори, 2027</span>
                <span className="num text-sm text-muted">общо {fmtNum(sectors.total.dividedBy(1000).toFixed(1), 1)} млрд. €</span>
              </figcaption>
              <ol className="flex flex-col gap-4">
                {[...top.map((r) => ({ label: r.label, share: r.share, value: r.value })), { label: "Всичко останало", share: restShare, value: null as string | null }].map((r, i) => (
                  <li key={r.label} className="flex flex-col gap-1.5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="text-[15px] text-ink">{r.label}</span>
                      <span className="num shrink-0 text-[15px] font-semibold">
                        {fmtNum(r.share, 0)}%
                        {r.value && <span className="ml-2 text-sm font-normal text-muted">{fmtNum(bn(r.value), 1)} млрд. €</span>}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${r.share.dividedBy(top[0]!.share).times(100).toNumber()}%` /* pixels only */, background: i === 0 ? "var(--accent-fill)" : i === 5 ? "var(--neutral-mark)" : "var(--series-1)" }}
                      />
                    </div>
                  </li>
                ))}
              </ol>
              <p className="mt-5 text-xs text-muted">
                Източник: мотиви към законопроекта, Табл. III-1 (функции, целият публичен сектор, без вноската в бюджета на ЕС). Дяловете са
                изчислени от отпечатаните стойности.
              </p>
            </figure>
          </div>
        </section>

        {/* ── Three things to know ───────────────────────────── */}
        <section aria-labelledby="know-title" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="know-title" className="text-[1.75rem] font-semibold tracking-tight sm:text-4xl">
              3 неща, които да знаеш
            </h2>
            <Link href="/pod-lupa" className="inline-flex items-center gap-2 text-[15px] font-semibold text-accent">
              Всички находки <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {pick.map((f, i) => (
              <li key={f.id}>
                <Link href={`/pod-lupa#${f.id}`} className="group flex h-full flex-col gap-3 rounded-3xl border border-rule bg-surface p-6 transition hover:border-rule-strong hover:shadow-lg sm:p-7">
                  <span className="flex items-center gap-3">
                    <span className="num grid h-9 w-9 place-items-center rounded-full bg-ink text-sm font-semibold text-bg">{i + 1}</span>
                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium text-ink-2 ring-1 ring-rule">
                      <span aria-hidden className={`h-2 w-2 rounded-full ${f.tone === "positive" ? "bg-beneficial" : f.tone === "risk" ? "bg-adverse" : "bg-muted"}`} />
                      {f.tone === "positive" ? "Подобрение" : f.tone === "risk" ? "Риск" : "Данни"}
                    </span>
                  </span>
                  <span className="text-xl font-semibold tracking-tight text-balance">{f.title}</span>
                  <span className="text-[15px] leading-relaxed text-ink-2">{bgText(f.conclusion)}</span>
                  <span className="mt-auto inline-flex items-center gap-2 pt-2 text-sm font-semibold text-accent">
                    Как го изчислихме <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Topics ─────────────────────────────────────────── */}
        <section aria-labelledby="topics-title" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-24">
          <h2 id="topics-title" className="text-[1.75rem] font-semibold tracking-tight sm:text-4xl">
            Разгледай по тема
          </h2>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {TOPICS.map((t) => (
              <li key={t.href}>
                <Link href={t.href} className="group flex h-full flex-col items-start gap-3 rounded-2xl border border-rule bg-surface p-4 transition hover:border-rule-strong hover:shadow-md sm:flex-row sm:items-center">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface-2 text-accent transition group-hover:bg-accent-fill group-hover:text-[#08111f]">
                    <Icon name={t.icon} />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-[15px] font-semibold text-ink">{t.title}</span>
                    <span className="text-[13px] text-muted">{t.text}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Trust ──────────────────────────────────────────── */}
        <section aria-labelledby="trust-title" className="mx-auto max-w-7xl px-4 pt-16 pb-6 sm:px-6 sm:pt-24">
          <div className="rounded-3xl bg-surface-2 p-6 sm:p-10">
            <h2 id="trust-title" className="text-[1.75rem] font-semibold tracking-tight sm:text-3xl">
              Защо да ни вярваш?
            </h2>
            <ul className="mt-8 grid gap-8 md:grid-cols-3">
              <li className="flex flex-col gap-2">
                <span className="num text-4xl font-semibold tracking-tight">{official}</span>
                <span className="text-[15px] font-semibold">официални документа</span>
                <span className="text-[15px] leading-relaxed text-ink-2">Законопроектите от Народното събрание, Министерския съвет и Евростат. Всеки е запазен с цифров отпечатък.</span>
              </li>
              <li className="flex flex-col gap-2">
                <span className="num text-4xl font-semibold tracking-tight">{checks.pass}</span>
                <span className="text-[15px] font-semibold">автоматични проверки, {checks.fail} неуспешни</span>
                <span className="text-[15px] leading-relaxed text-ink-2">Сборовете, равенствата и числата, отпечатани на няколко места, се сверяват при всяко обновяване.</span>
              </li>
              <li className="flex flex-col gap-2">
                <span className="text-4xl font-semibold tracking-tight">0</span>
                <span className="text-[15px] font-semibold">връзки с партии и институции</span>
                <span className="text-[15px] leading-relaxed text-ink-2">Показваме и рисковете, и подобренията, със същата строгост. Без внушения.</span>
              </li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/za-platformata" className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-[15px] font-semibold text-bg">
                Как работим
              </Link>
              <Link href="/iztochnitsi" className="inline-flex min-h-11 items-center rounded-full border border-rule-strong px-5 text-[15px] font-medium text-ink">
                Всички източници
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter billDate={dateBg(bill.date)} snapshot={snap} />
    </>
  );
}

function NoData() {
  return (
    <main id="main" className="mx-auto max-w-2xl px-4 py-24">
      <h1 className="text-3xl font-semibold">Бюджет 2027</h1>
      <p className="mt-4 text-ink-2">
        Все още няма публикувана проверена снимка на данните. Не показваме числа, преди да са проверени спрямо официалните документи.
      </p>
    </main>
  );
}
