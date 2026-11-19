"use client";

import { useEffect, useMemo, useState } from "react";
import Decimal from "decimal.js";
import { geoMercator, geoPath } from "d3-geo";
import { fmtNum, fmtSigned } from "@/lib/format";

export interface MuniView {
  code: string;
  name: string;
  region: string;
  slug: string;
  population: number;
  total2027: string | null;
  total2026: string | null;
  perCapita2027: string;
  perCapita2026: string;
}

type Metric = "perCapita2027" | "changePct";
type Feature = { type: "Feature"; properties: { id: string; name: string }; geometry: GeoJSON.Geometry };

const SEQ = ["var(--seq-1)", "var(--seq-2)", "var(--seq-3)", "var(--seq-4)", "var(--seq-5)"];

function changePct(m: MuniView): Decimal | null {
  if (!m.total2026 || !m.total2027 || new Decimal(m.total2026).isZero()) return null;
  return new Decimal(m.total2027).minus(m.total2026).dividedBy(m.total2026).times(100);
}

/** Quantile class breaks (5 classes) over the metric values. */
function quantiles(values: Decimal[]): Decimal[] {
  const v = [...values].sort((a, b) => a.comparedTo(b));
  return [1, 2, 3, 4].map((k) => v[Math.floor((k * v.length) / 5)]!);
}

export function MunicipalExplorer({ items, geoUrl }: { items: MuniView[]; geoUrl: string }) {
  const [metric, setMetric] = useState<Metric>("perCapita2027");
  const [region, setRegion] = useState("всички");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<"value" | "name">("value");
  const [geo, setGeo] = useState<Feature[] | null>(null);
  const [geoError, setGeoError] = useState(false);
  const [hover, setHover] = useState<MuniView | null>(null);

  useEffect(() => {
    fetch(geoUrl)
      .then((r) => r.json())
      .then((g) => setGeo(g.features))
      .catch(() => setGeoError(true));
  }, [geoUrl]);

  const val = (m: MuniView): Decimal | null => (metric === "perCapita2027" ? new Decimal(m.perCapita2027) : changePct(m));
  const values = items.map(val).filter((x): x is Decimal => x !== null);
  const breaks = useMemo(() => quantiles(values), [metric, items]); // eslint-disable-line react-hooks/exhaustive-deps
  const classOf = (v: Decimal | null) => (v === null ? -1 : breaks.filter((b) => v.gte(b)).length);
  const byCode = new Map(items.map((m) => [m.code, m]));
  const regions = [...new Set(items.map((m) => m.region))].sort((a, b) => a.localeCompare(b, "bg"));

  const list = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return items
      .filter((m) => (region === "всички" || m.region === region) && (!qq || m.name.toLowerCase().includes(qq)))
      .sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name, "bg") : (val(b) ?? new Decimal(-1e9)).comparedTo(val(a) ?? new Decimal(-1e9))));
  }, [items, region, q, sort, metric]); // eslint-disable-line react-hooks/exhaustive-deps

  const W = 640;
  const H = 420;
  const paths = useMemo(() => {
    if (!geo) return [];
    const fc = { type: "FeatureCollection" as const, features: geo };
    const proj = geoMercator().fitSize([W, H], fc as unknown as GeoJSON.FeatureCollection);
    const gp = geoPath(proj);
    return geo.map((f) => ({ id: f.properties.id, d: gp(f as unknown as GeoJSON.Feature) ?? "" }));
  }, [geo]);

  const fmtMetric = (v: Decimal | null) => (v === null ? "няма данни" : metric === "perCapita2027" ? `${fmtNum(v.toFixed(2), 0)} € на жител` : `${fmtSigned(v.toFixed(1))}%`);
  const legend = [0, 1, 2, 3, 4].map((i) => {
    const lo = i === 0 ? null : breaks[i - 1]!;
    const hi = i === 4 ? null : breaks[i]!;
    const n = values.filter((v) => classOf(v) === i).length;
    const f = (d: Decimal) => (metric === "perCapita2027" ? fmtNum(d.toFixed(0), 0) : `${fmtSigned(d.toFixed(1))}%`);
    return { i, label: lo === null ? `под ${f(hi!)}` : hi === null ? `${f(lo)} и повече` : `${f(lo)} – ${f(hi)}`, n };
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div role="radiogroup" aria-label="Показател на картата" className="flex gap-2">
          {(
            [
              ["perCapita2027", "Трансфер на жител, 2027"],
              ["changePct", "Промяна 2027 срещу 2026"],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              role="radio"
              aria-checked={metric === k}
              onClick={() => setMetric(k)}
              className={`min-h-11 rounded-sm border px-3 text-sm ${metric === k ? "border-ink bg-ink text-bg" : "border-rule-strong text-ink-2"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] [&>*]:min-w-0">
        <figure className="flex flex-col gap-2">
          <div className="relative">
            {geoError && <p className="text-sm text-muted">Картата не можа да се зареди; използвайте списъка.</p>}
            <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Карта на общините; същите данни са в списъка до картата">
              {paths.map((p) => {
                const m = byCode.get(p.id);
                const c = m ? classOf(val(m)) : -1;
                const dim = m && region !== "всички" && m.region !== region;
                return (
                  <path
                    key={p.id}
                    d={p.d}
                    fill={c < 0 ? "var(--surface-2)" : SEQ[c]}
                    stroke="var(--bg)"
                    strokeWidth={0.6}
                    opacity={dim ? 0.25 : 1}
                    onMouseEnter={() => m && setHover(m)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => m && (window.location.href = `/obshtini/${m.slug}`)}
                    className="cursor-pointer"
                    aria-hidden
                  />
                );
              })}
            </svg>
            {hover && (
              <div role="status" className="pointer-events-none absolute top-0 left-0 rounded-sm border border-rule-strong bg-surface px-3 py-2 text-xs shadow-sm">
                <p className="font-medium text-ink">
                  {hover.name} <span className="text-muted">({hover.region})</span>
                </p>
                <p className="num text-ink">{fmtMetric(val(hover))}</p>
              </div>
            )}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2" aria-label="Легенда">
            {legend.map((l) => (
              <li key={l.i} className="num flex items-center gap-1.5">
                <span aria-hidden className="inline-block h-3 w-4 rounded-[2px]" style={{ background: SEQ[l.i] }} />
                {l.label} <span className="text-muted">({l.n})</span>
              </li>
            ))}
          </ul>
          <figcaption className="text-xs text-muted">
            Класове по квантили (по около 53 общини в клас). Граници: © EuroGeographics (Eurostat GISCO, LAU 2024), опростени от СИГМА
            Бюджет.
          </figcaption>
        </figure>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-xs text-muted">
              Област
              <select value={region} onChange={(e) => setRegion(e.target.value)} className="min-h-11 rounded-sm border border-rule-strong bg-surface px-3 text-sm text-ink">
                <option value="всички">всички области</option>
                {regions.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Търси община
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} className="min-h-11 w-44 rounded-sm border border-rule-strong bg-surface px-3 text-sm text-ink" />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Подреди
              <select value={sort} onChange={(e) => setSort(e.target.value as "value" | "name")} className="min-h-11 rounded-sm border border-rule-strong bg-surface px-3 text-sm text-ink">
                <option value="value">по показателя</option>
                <option value="name">по име</option>
              </select>
            </label>
          </div>
          <p className="num text-xs text-muted" aria-live="polite">
            {list.length} общини
          </p>
          <ol className="max-h-[28rem] overflow-auto rounded-sm border border-rule" tabIndex={0} aria-label="Списък на общините">
            {list.map((m) => (
              <li key={m.code} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-rule px-3 py-1.5 text-sm">
                <a href={`/obshtini/${m.slug}`} className="underline decoration-rule-strong underline-offset-2 hover:decoration-ink">
                  {m.name} <span className="text-xs text-muted">{m.region}</span>
                </a>
                <span className="num text-right">{fmtMetric(val(m))}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
