import Link from "next/link";
import { YearBars, type BarSeries } from "@/components/charts/YearBars";
import { Waterfall } from "@/components/charts/Waterfall";
import { MeasuresExplorer } from "@/components/dashboard/MeasuresExplorer";
import { KpiTile } from "@/components/fiscal/KpiTile";
import { SourceNote } from "@/components/fiscal/SourceNote";
import { SiteHeader } from "@/components/site/SiteHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import type { Metadata } from "next";
import { kfpWaterfall, point } from "@/lib/data/derive";
import { NoPublishedSnapshotError, getPublished, seriesOf, type Published } from "@/lib/data/published";
import type { SeriesView } from "@/lib/data/types";
import { dateBg, dateBgLong, fmt, fmtNum, fmtSigned, rescale } from "@/lib/format";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Пълно табло",
  description: "Всички основни числа на бюджета за 2027 г. на едно място: показатели, водопад, дефицит и дълг, 36 мерки, промени между версиите, хронология.",
  alternates: { canonical: "/tablo" },
};

function bars(name: string, color: BarSeries["color"], s: SeriesView): BarSeries {
  return {
    name,
    color,
    points: s.points.map((p) => ({
      period: p.period,
      value: p.value,
      vintage: p.vintage,
      source: p.sources[0]!.locator.split(" (")[0]!,
    })),
  };
}

export default async function FullDashboard() {
  let data: Published;
  try {
    data = await getPublished();
  } catch (e) {
    if (e instanceof NoPublishedSnapshotError) return <NoData />;
    throw e;
  }
  const S = (k: string) => seriesOf(data, k);
  const bill = data.versions.find((v) => v.id === "bill-2026-11-16")!;
  const statusLine = `${bill.legalStatus} · внесен ${dateBg(bill.date)}`;
  const waterfall = kfpWaterfall(
    Object.fromEntries(Object.entries(data.series).filter(([k]) => k.endsWith("@bill-2026-11-16")).map(([k, v]) => [k.split("@")[0]!, v])),
    "2027",
  );
  const conflicts = data.checks.filter((c) => c.kind === "cross-source" && c.status === "warn");
  const counts = { pass: 0, warn: 0, fail: 0 } as Record<string, number>;
  for (const c of data.checks) counts[c.status] = (counts[c.status] ?? 0) + 1;
  const stateRev = point(S("stateBudget.revenue"), "2027")!;
  const stateExp = point(S("stateBudget.expenditure"), "2027")!;
  const kfpRev = point(S("kfp.revenue"), "2027")!;
  const mrz = S("param.minimumWage");

  return (
    <>
      <SiteHeader status={statusLine} />
      <main id="main" className="mx-auto flex max-w-7xl flex-col gap-16 px-4 pt-8 pb-20 sm:px-6 sm:pt-12">
        {/* ── Hero ─────────────────────────────────────────────── */}
        <section aria-labelledby="hero-title" className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-end">
          <div className="flex flex-col gap-4">
            <p className="inline-flex w-fit items-center rounded-full bg-card-mustard px-3 py-1 text-[13px] font-semibold text-on-card">Данни · за напреднали</p>
            <h1 id="hero-title" className="font-display text-[2.6rem] leading-[1] font-semibold tracking-tight uppercase sm:text-6xl">
              Пълно табло
            </h1>
            <p className="max-w-2xl text-[17px] text-ink-2">Всички основни показатели, мерки и промени по законопроекта за 2027 г. на една страница. За кратко обяснение започни от <Link href="/" className="underline underline-offset-2">началото</Link>.</p>
          </div>
          <aside aria-label="Правен статус" className="border-l-2 border-accent-fill bg-surface px-4 py-3 text-sm">
            <p className="text-xs tracking-wide text-muted uppercase">Правен статус към {dateBg(data.snapshot.retrievedOn)}</p>
            <p className="mt-1 text-lg font-semibold">Законопроект — не е приет</p>
            <p className="mt-1 text-ink-2">
              Внесен в Народното събрание на {dateBgLong(bill.date)} (вх. № 52-602-01-71) след одобрение от Министерския съвет. Числата
              по-долу са от внесения текст и мотивите към него (АСБП 2027–2029), освен ако не е посочено друго.
            </p>
          </aside>
        </section>

        {/* ── Headline indicators ─────────────────────────────── */}
        <section id="pokazateli" aria-labelledby="kpi-title" className="flex scroll-mt-32 sm:scroll-mt-24 flex-col gap-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="kpi-title" className="text-2xl font-semibold tracking-tight">
              Основните числа
            </h2>
            <p className="text-sm text-muted">Сравнение с 2026 г. — очакваното изпълнение от същия документ.</p>
          </div>
          <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile size="lg" series={S("kfp.balance")} ratio={S("kfp.balance.pctGdp")} note="Касово салдо по консолидираната фискална програма. Отрицателно = дефицит." />
            <KpiTile size="lg" series={S("esa.balance")} ratio={S("esa.balance.pctGdp")} note="Начислена основа, сектор „Държавно управление“ — показателят за критерия от 3% на ЕС." />
            <KpiTile size="lg" series={S("debt.government")} ratio={S("debt.government.pctGdp")} note="Номинален държавен дълг в края на годината (наличност)." />
            <KpiTile size="lg" series={S("kfp.expenditure.interest")} note="Лихви по дълга, касова основа, КФП." />
          </div>
          <div className="grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            <KpiTile series={S("kfp.revenue")} ratio={S("kfp.revenue.pctGdp")} />
            <KpiTile series={S("kfp.expenditure")} ratio={S("kfp.expenditure.pctGdp")} />
            <KpiTile series={S("kfp.expenditure.capital")} ratio={S("kfp.expenditure.capital.pctGdp")} />
            <KpiTile series={S("debt.newDebtLimit")} base={null} />
            <KpiTile
              series={mrz}
              base={null}
              note={`Прогнозен размер, заложен в бюджета: ${mrz.points.map((p) => `${p.period} г. — ${fmtNum(p.value, 0)} €`).join("; ")}. Определя се с постановление на МС.`}
            />
            <KpiTile series={S("param.maxInsurableIncome")} base={null} note="Таван на месечния осигурителен доход от 01.01.2027 г., заложен в мотивите." />
            <KpiTile series={S("macro.hicp")} />
            <KpiTile series={S("macro.gdpGrowth")} />
          </div>
        </section>

        {/* ── Calculator CTA ─────────────────────────────────── */}
        <section aria-labelledby="cta-title" className="flex flex-col gap-3 border-l-2 border-accent-fill bg-surface px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="cta-title" className="text-xl font-semibold">
              Колко ще ми струва Бюджет 2027?
            </h2>
            <p className="text-sm text-ink-2">
              Нетна заплата, данък и осигуровки по трудов договор: 2026 г. срещу предложенията за 2027 г. Изчислява се само в браузъра.
            </p>
          </div>
          <Link href="/kalkulator" className="inline-flex min-h-11 shrink-0 items-center rounded-sm bg-ink px-4 text-sm font-medium text-bg hover:opacity-90">
            Отвори калкулатора →
          </Link>
        </section>

        {/* ── Scope explainer ─────────────────────────────────── */}
        <section aria-labelledby="scope-title" className="grid gap-6 border-y border-rule py-8 md:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
          <h2 id="scope-title" className="text-xl font-semibold tracking-tight">
            Държавен бюджет ≠ КФП
          </h2>
          <div className="grid gap-6 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted uppercase">Приходи по държавния бюджет (чл. 1)</p>
              <p className="num text-2xl font-semibold">{fmt(rescale(stateRev.value!, "хил. €", "млрд. €"), "млрд. €")}</p>
              <SourceNote point={stateRev} />
            </div>
            <div>
              <p className="text-xs text-muted uppercase">Разходи по държавния бюджет (чл. 1)</p>
              <p className="num text-2xl font-semibold">{fmt(rescale(stateExp.value!, "хил. €", "млрд. €"), "млрд. €")}</p>
              <SourceNote point={stateExp} />
            </div>
            <div>
              <p className="text-xs text-muted uppercase">Приходи по КФП</p>
              <p className="num text-2xl font-semibold">{fmt(rescale(kfpRev.value!, "млн. €", "млрд. €"), "млрд. €")}</p>
              <SourceNote point={kfpRev} />
            </div>
            <p className="text-sm text-ink-2 sm:col-span-3">
              Държавният (републиканският) бюджет е само една част. Консолидираната фискална програма събира и бюджетите на ДОО, НЗОК,
              общините и сметките за средства от ЕС, като премахва трансферите между тях. Двата обхвата не се сравняват и не се събират.
              Разходите по чл. 1 не включват трансферите към други бюджети. Сумите в хил. € са превърнати в млрд. € само чрез точно
              мащабиране.
            </p>
          </div>
        </section>

        {/* ── Waterfall ───────────────────────────────────────── */}
        <section aria-labelledby="wf-title" className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] [&>*]:min-w-0">
          <div className="flex flex-col gap-3">
            <h2 id="wf-title" className="text-2xl font-semibold tracking-tight">
              Откъде идват и къде отиват парите
            </h2>
            <p className="text-ink-2">
              Консолидираната фискална програма за 2027 г. по Приложение № 3 към законопроекта: приходи{" "}
              <span className="num">{fmt(point(S("kfp.revenue"), "2027")!.value, "млн. €")}</span>, разходи с вноската в ЕС{" "}
              <span className="num">{fmt(point(S("kfp.expenditure"), "2027")!.value, "млн. €")}</span>. Разликата е дефицитът от{" "}
              <span className="num">{fmt(point(S("kfp.balance"), "2027")!.value, "млн. €")}</span>; срещу него в същата таблица стои ред „Финансиране“ със същата
              стойност и обратен знак.
            </p>
            <p className="text-sm text-muted">
              В Приложение № 3 редът „Текущи разходи“ включва и лихвите. Затова тук лихвите са отделени и не се броят два пъти.
            </p>
          </div>
          <Waterfall steps={waterfall} unitLabel="млн. €" title="КФП 2027: от приходите до салдото" subtitle="Проект, касова основа, млн. €" />
        </section>

        {/* ── Deficit & debt ──────────────────────────────────── */}
        <section id="defitsit-i-dalg" aria-labelledby="dd-title" className="flex scroll-mt-32 sm:scroll-mt-24 flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h2 id="dd-title" className="text-2xl font-semibold tracking-tight">
              Дефицит, дълг и цената на дълга
            </h2>
            <p className="max-w-3xl text-ink-2">
              2025 г. е отчет, 2026 г. — очаквано изпълнение, 2027 г. — проект, 2028–2029 г. — прогноза. Щрихованите стълбове не са
              изпълнение.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 [&>*]:min-w-0">
            <YearBars
              title="Бюджетно салдо, % от БВП"
              subtitle="Касово салдо по КФП и баланс по ЕСС 2010 (начислена основа). Табл. II-5 няма данни за 2025 г. по ЕСС."
              unitLabel="% от БВП"
              series={[bars("КФП (касова основа)", "series-1", S("kfp.balance.pctGdp")), bars("ЕСС 2010 (начислена основа)", "series-2", S("esa.balance.pctGdp"))]}
              reference={{ value: -3, label: "−3% — референтна стойност на ЕС (за ЕСС)" }}
            />
            <YearBars
              title="Дълг, % от БВП"
              subtitle="Държавен дълг (Закон за държавния дълг) и консолидиран дълг на сектор „Държавно управление“ (ЕСС 2010)."
              unitLabel="% от БВП"
              series={[bars("Държавен дълг", "series-1", S("debt.government.pctGdp")), bars("Дълг по ЕСС 2010", "series-2", S("esa.debt.pctGdp"))]}
            />
            <YearBars title="Лихвени разходи" subtitle="КФП, касова основа" unitLabel="млн. €" series={[bars("Лихви", "neutral", S("kfp.expenditure.interest"))]} />
            <YearBars
              title="Капиталови разходи"
              subtitle="КФП, касова основа. Разчетът не означава извършени инвестиции."
              unitLabel="млн. €"
              series={[bars("Капиталови разходи", "neutral", S("kfp.expenditure.capital"))]}
            />
          </div>
        </section>

        {/* ── Measures ────────────────────────────────────────── */}
        <section id="merki" aria-labelledby="m-title" className="flex scroll-mt-32 sm:scroll-mt-24 flex-col gap-4">
          <h2 id="m-title" className="text-2xl font-semibold tracking-tight">
            Мерките в бюджета
          </h2>
          <p className="max-w-3xl text-ink-2">
            Всички {data.measures.length} дискреционни мерки, за които МФ дава оценка на ефекта в мотивите към законопроекта (Табл. II-7 —
            приходи, Табл. II-8 — разходи).
          </p>
          <MeasuresExplorer measures={data.measures} />
        </section>

        {/* ── Changes between versions ────────────────────────── */}
        <section id="promeni" aria-labelledby="ch-title" className="grid scroll-mt-32 sm:scroll-mt-24 grid-cols-1 gap-10 lg:grid-cols-2 [&>*]:min-w-0">
          <div className="flex flex-col gap-3">
            <h2 id="ch-title" className="text-2xl font-semibold tracking-tight">
              Какво се промени между 6 и 16 ноември
            </h2>
            <p className="text-sm text-ink-2">
              Приложение № 3 (КФП), 2027 г.: проектът на МФ от 06.11.2026 г. (по данни на СИГМА Бюджет) срещу внесения в Народното
              събрание текст от 16.11.2026 г. Общите суми не се променят; различават се {data.versionDiffs.length} реда.
            </p>
            <div className="overflow-x-auto">
              <table className="num w-full text-sm">
                <caption className="sr-only">Разлики между версиите на Приложение № 3 за 2027 г., млн. €</caption>
                <thead>
                  <tr className="border-b border-rule-strong text-xs text-muted">
                    <th scope="col" className="py-2 pr-3 text-left font-normal">
                      Ред
                    </th>
                    <th scope="col" className="py-2 pr-3 text-right font-normal">
                      06.11
                    </th>
                    <th scope="col" className="py-2 pr-3 text-right font-normal">
                      16.11
                    </th>
                    <th scope="col" className="py-2 text-right font-normal">
                      Разлика
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.versionDiffs.map((d) => (
                    <tr key={d.label} className="border-b border-rule">
                      <th scope="row" className="py-2 pr-3 text-left font-normal">
                        {d.label}
                      </th>
                      <td className="py-2 pr-3 text-right">{fmtNum(d.before)}</td>
                      <td className="py-2 pr-3 text-right">{fmtNum(d.after)}</td>
                      <td className="py-2 text-right font-semibold">{d.difference === null ? "—" : fmtSigned(d.difference)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted">
              млн. €. Първичният файл от 06.11 на сайта на МФ не можа да бъде изтеглен автоматично (защита на сайта). Стойностите за
              06.11 са от СИГМА Бюджет, версия на данните {data.snapshot.sigmaVersion}.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="text-2xl font-semibold tracking-tight">Хронология</h2>
            <ol className="flex flex-col">
              {data.events.map((e) => (
                <li key={e.id} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 border-b border-rule py-3">
                  <time dateTime={e.date} className="num text-sm text-muted">
                    {dateBg(e.date)}
                  </time>
                  <div>
                    <p className="text-sm text-ink">{e.title}</p>
                    {e.note && <p className="text-xs text-muted">{e.note}</p>}
                    <a href={e.url} rel="noreferrer" className="text-xs text-ink-2 underline underline-offset-2">
                      {e.documentTitle}
                    </a>
                  </div>
                </li>
              ))}
              <li className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 py-3">
                <span className="text-sm text-muted">предстои</span>
                <p className="text-sm text-ink-2">Гласуване на първо четене в пленарна зала — ще бъде добавено след проверка в официалните записи на НС.</p>
              </li>
            </ol>
          </div>
        </section>

        {/* ── Data quality ────────────────────────────────────── */}
        <section aria-labelledby="q-title" className="flex flex-col gap-4 border-t border-rule pt-8">
          <h2 id="q-title" className="text-xl font-semibold tracking-tight">
            Проверки на данните
          </h2>
          <p className="num text-sm text-ink-2">
            {counts.pass} успешни проверки · {counts.warn} предупреждения · {counts.fail} неуспешни. Проверяват се съвпадението на
            стойностите на различни места в документа, счетоводните равенства (приходи − разходи = салдо, дълг = външен + вътрешен и др.)
            и сборовете на мерките.
          </p>
          {conflicts.map((c) => (
            <div key={c.id} className="border-l-2 border-warning bg-surface px-4 py-3 text-sm">
              <p className="font-medium text-ink">{c.description}</p>
              <ul className="num mt-1 text-xs text-muted">
                {Object.entries(c.details ?? {}).map(([k, v]) => (
                  <li key={k}>
                    {k}: <strong className="text-ink-2">{v}</strong>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-xs text-muted">Показваме и двете стойности; документът не обяснява разликата.</p>
            </div>
          ))}
          <Link href="/iztochnitsi" className="text-sm text-ink-2 underline underline-offset-4">
            Всички източници, хешове и проверки →
          </Link>
        </section>
      </main>
      <DataNote data={data} />
      <SiteFooter billDate={dateBg(bill.date)} snapshot={{ id: data.snapshot.id, publishedAt: data.snapshot.publishedAt ? dateBg(data.snapshot.publishedAt) : "—", publishedBy: data.snapshot.publishedBy ?? "—" }} />
    </>
  );
}

function DataNote({ data }: { data: Published }) {
  return (
    <footer className="border-t border-rule bg-surface">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 text-xs text-muted sm:grid-cols-3 sm:px-6">
        <div>
          <p className="font-medium text-ink-2">Данни</p>
          <p className="num">
            Снимка {data.snapshot.id} · публикувана {dateBg(data.snapshot.publishedAt)} ({data.snapshot.publishedBy}) · документите са
            изтеглени на {dateBg(data.snapshot.retrievedOn)}.
          </p>
          <p>Редакторско одобрение от човек: предстои. Числата са проверени автоматично спрямо първичния документ.</p>
        </div>
        <div>
          <p className="font-medium text-ink-2">Източници</p>
          <p>
            Народно събрание (законопроект 52-602-01-71 с мотиви), Министерски съвет, СИГМА Бюджет (данни {data.snapshot.sigmaVersion}) за
            сравнение с проекта от 06.11.
          </p>
        </div>
        <div>
          <p className="font-medium text-ink-2">Независимост</p>
          <p>Платформата не е свързана с правителството, институции, партии или издателите на източниците.</p>
        </div>
      </div>
    </footer>
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
