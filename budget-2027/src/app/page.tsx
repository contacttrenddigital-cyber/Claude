import Decimal from "decimal.js";
import Link from "next/link";
import { Icon, type IconName } from "@/components/site/Icon";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { sectorRows, sectorShares } from "@/lib/analysis/sectors";
import { BudgetCard, type YearFacts } from "@/components/home/BudgetCard";
import { SectorList, type SectorYear } from "@/components/home/SectorList";
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
  const bn = (v: string) => new Decimal(v).dividedBy(1000).toFixed(1);
  const findings = computeFindings(findingsData(data));
  const pick = ["lihvi", "kapitalovi", "polozhitelni"].map((id) => findings.find((f) => f.id === id)!).filter(Boolean);
  const checks = { pass: data.checks.filter((c) => c.status === "pass").length, fail: data.checks.filter((c) => c.status === "fail").length };
  const official = data.documents.filter((d) => !d.publisher.startsWith("СИГМА")).length;
  const snap = { id: data.snapshot.id, publishedAt: data.snapshot.publishedAt ? dateBg(data.snapshot.publishedAt) : "—", publishedBy: data.snapshot.publishedBy ?? "—" };

  const STATUS: Record<string, string> = { "2025": "отчет", "2026": "очаквано", "2027": "проект", "2028": "прогноза", "2029": "прогноза" };
  const at = (year: string) => (k: string) => data.series[`${k}@bill-2026-11-16`]?.points.find((p) => p.period === year)?.value ?? null;
  const yearFacts: YearFacts[] = ["2026", "2027", "2028"].map((year) => {
    const f = Object.fromEntries(homeFacts(at(year)).map((x) => [x.key, x]));
    return {
      year,
      status: STATUS[year]!,
      revenue: f["kfp.revenue"]!.value,
      expenditure: f["kfp.expenditure"]!.value,
      deficit: f["kfp.balance"]!.value,
      debt: f["debt.government"]!.value,
      revenuePct: f["kfp.revenue"]!.pctGdp,
      expenditurePct: f["kfp.expenditure"]!.pctGdp,
      deficitPct: f["kfp.balance"]!.pctGdp,
      debtPct: f["debt.government"]!.pctGdp,
    };
  });
  const fn = tableOf(data, "functions");
  const sectorYears: SectorYear[] = ["2026", "2027", "2028", "2029"].map((year) => {
    const sh = sectorShares(fn, year);
    return { year, status: STATUS[year]!, total: sh.total.dividedBy(1000).toFixed(1), rows: sh.rows.map((r) => ({ label: r.label, value: bn(r.value), share: r.share.toFixed(1) })) };
  });
  const balance = data.series["kfp.balance@bill-2026-11-16"]!.points;
  const balMax = balance.reduce((m, p) => Math.max(m, Math.abs(Number(p.value ?? 0))), 0); // pixels only
  const ENTRY_BG = ["bg-card-coral", "bg-card-mustard", "bg-card-sky"]; // coral = the main action
  const TOPIC_TILE = ["bg-card-sky", "bg-card-mustard", "bg-card-violet", "bg-card-mint", "bg-card-lilac"];

  return (
    <>
      <SiteHeader />
      <main id="main">
        {/* ── Hero ───────────────────────────────────────────── */}
        <section aria-labelledby="hero-title" className="relative overflow-hidden bg-hero text-[#f5f2ea]">
          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pt-10 pb-14 sm:px-6 sm:pt-16 sm:pb-20 lg:grid-cols-[minmax(0,6fr)_minmax(0,6fr)] lg:items-center [&>*]:min-w-0">
            <div className="flex flex-col gap-6">
              <p className="inline-flex w-fit items-center gap-2 rounded-full bg-[#f5f2ea] px-3.5 py-1.5 text-[13px] font-medium text-[#141414]">
                <span className="h-2 w-2 rounded-full bg-card-rose" aria-hidden />
                Законопроект, внесен на {dateBg(bill.date)} · още не е приет
              </p>
              <h1 id="hero-title" className="font-display text-[3.1rem] leading-[0.92] font-semibold tracking-tight uppercase sm:text-[4.5rem] lg:text-[5.6rem]">
                Бюджет 2027,
                <br />
                <span className="text-card-mustard">обяснен ясно.</span>
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-[#d2cdc3] sm:text-xl">
                Откъде идват парите на държавата, къде отиват и как това засяга теб. Независимо, на прост език и с източник за всяко число.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/kalkulator" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-card-coral px-6 text-base font-semibold text-on-card transition hover:brightness-105">
                  <Icon name="calculator" />
                  Изчисли как те засяга
                </Link>
                <Link href="#kade" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#f5f2ea] px-6 text-base font-semibold text-[#141414] transition hover:bg-white">
                  Къде отиват парите
                  <Icon name="arrow" className="h-4 w-4" />
                </Link>
              </div>
            </div>
            <div>
              <BudgetCard years={yearFacts} initial="2027" />
              <p className="mt-5 text-[15px] leading-relaxed text-[#d2cdc3]">
                {FACT_TEXT["kfp.revenue"]!.verb} <strong className="num font-semibold text-white">{fmtNum(F["kfp.revenue"]!.value, 1)} млрд. €</strong>{" "}
                {FACT_TEXT["kfp.expenditure"]!.verb} <strong className="num font-semibold text-white">{fmtNum(F["kfp.expenditure"]!.value, 1)} млрд. €</strong> през 2027 г.
                Разликата от <strong className="num font-semibold text-card-rose">{fmtNum(F["kfp.balance"]!.value, 1)} млрд. €</strong> е дефицитът.
              </p>
              <p className="mt-2 text-xs text-[#a19b90]">
                Целият публичен сектор (консолидирана фискална програма).{" "}
                <Link href="/tablo" className="underline underline-offset-2 hover:text-white">
                  Всички показатели
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* ── Entry points ───────────────────────────────────── */}
        <section aria-labelledby="start-title" className="mx-auto max-w-7xl px-4 pt-14 sm:px-6 sm:pt-20">
          <h2 id="start-title" className="font-display text-[2.25rem] leading-[1] font-semibold tracking-tight sm:text-[3rem]">
            С какво да започнеш?
          </h2>
          <ul className="mt-8 grid gap-5 md:grid-cols-3">
            {ENTRIES.map((e, i) => (
              <li key={e.href}>
                <Link href={e.href} className={`group relative flex h-full flex-col gap-4 rounded-[2rem] p-6 text-on-card shadow-xl shadow-black/10 transition duration-300 hover:-translate-y-1 sm:p-7 ${ENTRY_BG[i]}`}>
                  <span className="flex items-start justify-between gap-4">
                    <span className="font-display text-[2.1rem] leading-[0.95] font-semibold tracking-tight">{e.title}</span>
                    <span aria-hidden className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-[#141414] shadow-md transition group-hover:rotate-45">
                      <Icon name="arrow" className="h-5 w-5 -rotate-45" />
                    </span>
                  </span>
                  <span className="text-[16px] leading-relaxed text-on-card-2">{e.text}</span>
                  <span className="mt-auto flex items-end justify-between gap-3">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white/60 px-3.5 py-1.5 text-sm font-semibold">{e.cta}</span>
                    <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-tile text-white shadow-lg">
                      <Icon name={e.icon} className="h-7 w-7" />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* ── Where the money goes ───────────────────────────── */}
        <section id="kade" aria-labelledby="kade-title" className="mx-auto max-w-7xl scroll-mt-20 px-4 pt-16 sm:px-6 sm:pt-24">
          <div className="grid gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start [&>*]:min-w-0">
            <div className="flex flex-col gap-4">
              <p className="inline-flex w-fit rounded-full bg-card-mustard px-3 py-1 text-[13px] font-semibold text-on-card">Къде отиват парите</p>
              <h2 id="kade-title" className="font-display text-[2.25rem] leading-[1] font-semibold tracking-tight text-balance sm:text-[3rem]">
                {fmtNum(top[0]!.share, 0)}% от разходите отиват за {top[0]!.label.toLowerCase().replace(", подпомагане и грижи", ", помощи и грижи")}
              </h2>
              <p className="text-[17px] leading-relaxed text-ink-2">
                {top[0]!.label.startsWith("Социално") ? "Тук влизат пенсиите и социалните помощи. " : ""}Следват {top[1]!.label.toLowerCase()} ({fmtNum(top[1]!.share, 0)}%),{" "}
                {top[2]!.label.toLowerCase()} ({fmtNum(top[2]!.share, 0)}%) и {top[3]!.label.toLowerCase()} ({fmtNum(top[3]!.share, 0)}%). Смени годината, за да видиш как се променя.
              </p>
              <Link href="/sektori" className="inline-flex w-fit items-center gap-2 rounded-full bg-[#f5f2ea] px-5 py-2.5 text-[15px] font-semibold text-[#141414]">
                Всички сектори и промените спрямо 2026 г.
                <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </div>
            <SectorList years={sectorYears} initial="2027" />
          </div>
        </section>

        {/* ── Deficit by year ────────────────────────────────── */}
        <section aria-labelledby="def-title" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-24">
          <div className="rounded-[2rem] border border-rule bg-surface p-5 sm:p-8">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="inline-flex w-fit rounded-full bg-card-rose px-3 py-1 text-[13px] font-semibold text-on-card">Дефицит</p>
                <h2 id="def-title" className="font-display mt-3 text-[1.9rem] leading-[1] font-semibold tracking-tight sm:text-[2.4rem]">
                  Колко не достига всяка година
                </h2>
              </div>
              <Link href="/defitsit" className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
                Подробно <Icon name="arrow" className="h-4 w-4" />
              </Link>
            </div>
            <ol className="mt-8 grid grid-cols-5 items-end gap-2 sm:gap-4" aria-label="Дефицит по години, млрд. €">
              {balance.map((p) => {
                const on = p.period === "2027";
                const v = p.value === null ? null : bn(p.value.replace("-", ""));
                const h = p.value === null ? 0 : (Math.abs(Number(p.value)) / balMax) * 100; // pixels only
                return (
                  <li key={p.period} className="flex flex-col items-center gap-2">
                    <span className={`num rounded-full px-2.5 py-1 font-mono text-xs font-semibold ${on ? "bg-card-rose text-on-card" : "text-muted"}`}>{v === null ? "—" : fmtNum(v, 1)}</span>
                    <span className="flex h-40 w-full items-end sm:h-52" aria-hidden>
                      <span className={`w-full rounded-2xl ${on ? "bg-card-rose" : p.vintage === "actual" ? "bg-rule-strong" : "bg-surface-2"}`} style={{ height: `${h}%` }} />
                    </span>
                    <span className={`text-sm ${on ? "font-semibold text-ink" : "text-muted"}`}>{p.period}</span>
                    <span className="text-[11px] text-muted">{STATUS[p.period]}</span>
                  </li>
                );
              })}
            </ol>
            <p className="mt-5 text-xs text-muted">млрд. €, целият публичен сектор (касова основа). Източник: Приложение № 3 към мотивите.</p>
          </div>
        </section>

        {/* ── Three things to know ───────────────────────────── */}
        <section aria-labelledby="know-title" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-24">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="know-title" className="font-display text-[2.25rem] leading-[1] font-semibold tracking-tight sm:text-[3rem]">
              3 неща, които да знаеш
            </h2>
            <Link href="/pod-lupa" className="inline-flex items-center gap-2 text-[15px] font-semibold text-accent">
              Всички находки <Icon name="arrow" className="h-4 w-4" />
            </Link>
          </div>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {pick.map((f, i) => (
              <li key={f.id}>
                <Link href={`/pod-lupa#${f.id}`} className="group flex h-full flex-col gap-3 rounded-[2rem] border border-rule bg-surface p-6 transition hover:-translate-y-0.5 hover:border-rule-strong sm:p-7">
                  <span className="flex items-center gap-3">
                    <span className="num font-display grid h-11 w-11 place-items-center rounded-2xl bg-tile text-lg font-semibold text-white">{i + 1}</span>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold text-on-card ${f.tone === "positive" ? "bg-card-mint" : f.tone === "risk" ? "bg-card-rose" : "bg-card-sky"}`}>
                      {f.tone === "positive" ? "Подобрение" : f.tone === "risk" ? "Риск" : "Данни"}
                    </span>
                  </span>
                  <span className="font-display text-[1.6rem] leading-[1.05] font-semibold tracking-tight text-balance">{f.title}</span>
                  <span className="text-[16px] leading-relaxed text-ink-2">{bgText(f.conclusion)}</span>
                  <span className="mt-auto flex items-center justify-between pt-2 text-sm font-semibold">
                    <span className="text-muted">Как го изчислихме</span>
                    <span aria-hidden className="grid h-10 w-10 place-items-center rounded-full bg-ink text-bg transition group-hover:rotate-45">
                      <Icon name="arrow" className="h-4 w-4 -rotate-45" />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>

        {/* ── Topics ─────────────────────────────────────────── */}
        <section aria-labelledby="topics-title" className="mx-auto max-w-7xl px-4 pt-16 sm:px-6 sm:pt-24">
          <h2 id="topics-title" className="font-display text-[2.25rem] leading-[1] font-semibold tracking-tight sm:text-[3rem]">
            Разгледай по тема
          </h2>
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {TOPICS.map((t, i) => (
              <li key={t.href}>
                <Link href={t.href} className="group flex h-full flex-col items-start gap-3 rounded-3xl border border-rule bg-surface p-4 transition hover:-translate-y-0.5 hover:border-rule-strong sm:flex-row sm:items-center">
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-on-card transition group-hover:scale-105 ${TOPIC_TILE[i % TOPIC_TILE.length]}`}>
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
          <div className="rounded-[2rem] bg-card-mustard p-6 text-on-card sm:p-10">
            <h2 id="trust-title" className="font-display text-[2.25rem] leading-[1] font-semibold tracking-tight sm:text-[3rem]">
              Защо да ни вярваш?
            </h2>
            <ul className="mt-8 grid gap-8 md:grid-cols-3">
              <li className="flex flex-col gap-2">
                <span className="num font-display text-6xl font-semibold">{official}</span>
                <span className="text-[15px] font-semibold">официални документа</span>
                <span className="text-[15px] leading-relaxed text-on-card-2">Законопроектите от Народното събрание, Министерския съвет и Евростат. Всеки е запазен с цифров отпечатък.</span>
              </li>
              <li className="flex flex-col gap-2">
                <span className="num font-display text-6xl font-semibold">{checks.pass}</span>
                <span className="text-[15px] font-semibold">автоматични проверки, {checks.fail} неуспешни</span>
                <span className="text-[15px] leading-relaxed text-on-card-2">Сборовете, равенствата и числата, отпечатани на няколко места, се сверяват при всяко обновяване.</span>
              </li>
              <li className="flex flex-col gap-2">
                <span className="font-display text-3xl leading-tight font-semibold">Независими</span>
                <span className="text-[15px] font-semibold">без връзки с партии и институции</span>
                <span className="text-[15px] leading-relaxed text-on-card-2">Показваме и рисковете, и подобренията, със същата строгост. Без внушения.</span>
              </li>
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/za-platformata" className="inline-flex min-h-11 items-center rounded-full bg-tile px-5 text-[15px] font-semibold text-white">
                Как работим
              </Link>
              <Link href="/iztochnitsi" className="inline-flex min-h-11 items-center rounded-full bg-white/60 px-5 text-[15px] font-semibold text-on-card">
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
