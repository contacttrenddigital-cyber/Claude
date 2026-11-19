"use client";

/** „Моето табло“: pick indicators; kept only in this browser (localStorage) and in an opt-in share link. */
import { useEffect, useState } from "react";
import Decimal from "decimal.js";
import type { MetricCard } from "@/lib/data/view";
import { fmtNum, fmtSigned, VINTAGE_SHORT } from "@/lib/format";
import type { Vintage } from "@/lib/ingest/documents";

const KEY = "moeto-tablo:v1";
const DEFAULT = ["kfp.balance.pctGdp", "esa.balance.pctGdp", "debt.government.pctGdp", "kfp.expenditure.interest"];

export function MyDashboard({ metrics }: { metrics: MetricCard[] }) {
  const [sel, setSel] = useState<string[]>(DEFAULT);
  const [q, setQ] = useState("");
  const [copied, setCopied] = useState(false);
  const valid = (ks: string[]) => ks.filter((k) => metrics.some((m) => m.key === k)).slice(0, 12);

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("m");
    if (fromUrl) return setSel(valid(fromUrl.split(",")));
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setSel(valid(JSON.parse(saved)));
    } catch {
      /* storage unavailable — defaults */
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (ks: string[]) => {
    setSel(ks);
    setCopied(false);
    try {
      localStorage.setItem(KEY, JSON.stringify(ks));
    } catch {
      /* ignore */
    }
  };
  const toggle = (k: string) => save(sel.includes(k) ? sel.filter((x) => x !== k) : [...sel, k].slice(0, 12));
  const share = () => {
    const url = `${location.origin}${location.pathname}?m=${sel.join(",")}`;
    navigator.clipboard?.writeText(url).then(() => setCopied(true), () => setCopied(false));
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] [&>*]:min-w-0">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Търси показател
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} className="min-h-11 rounded-sm border border-rule-strong bg-surface px-3 text-sm text-ink" />
        </label>
        <p className="num text-xs text-muted">Избрани {sel.length} от максимум 12</p>
        <ul className="max-h-[32rem] overflow-auto rounded-sm border border-rule" aria-label="Показатели">
          {metrics
            .filter((m) => !q || `${m.short} ${m.label}`.toLowerCase().includes(q.toLowerCase()))
            .map((m) => (
              <li key={m.key} className="border-b border-rule px-3">
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" className="size-5" checked={sel.includes(m.key)} onChange={() => toggle(m.key)} />
                  <span>
                    {m.short} <span className="text-xs text-muted">({m.unit})</span>
                  </span>
                </label>
              </li>
            ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={share} className="min-h-11 rounded-sm border border-rule-strong px-3 text-sm">
            {copied ? "Връзката е копирана" : "Копирай връзка към таблото"}
          </button>
          <button type="button" onClick={() => save(DEFAULT)} className="min-h-11 rounded-sm border border-rule-strong px-3 text-sm">
            По подразбиране
          </button>
        </div>
        <p className="text-xs text-muted">Изборът се пази само в този браузър. Връзката съдържа само ключовете на показателите.</p>
      </div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2" aria-live="polite">
        {sel.length === 0 && <p className="text-sm text-muted">Изберете показатели от списъка.</p>}
        {sel.map((k) => {
          const m = metrics.find((x) => x.key === k)!;
          const p27 = m.points.find((p) => p.period === "2027");
          const p26 = m.points.find((p) => p.period === "2026");
          const delta = p27?.value && p26?.value ? new Decimal(p27.value).minus(p26.value) : null;
          return (
            <article key={k} className="flex flex-col gap-1 border-t border-rule-strong pt-3">
              <header className="flex items-baseline justify-between gap-2">
                <h3 className="text-[13px] font-medium tracking-wide text-ink-2 uppercase">{m.short}</h3>
                <button type="button" onClick={() => toggle(k)} className="min-h-11 text-xs text-muted underline sm:min-h-0" aria-label={`Премахни ${m.short}`}>
                  премахни
                </button>
              </header>
              <p className="num text-3xl font-semibold">
                {p27?.value ? fmtNum(p27.value, m.unit === "€" ? 0 : 1) : "—"} <span className="text-base font-normal text-muted">{m.unit}</span>
              </p>
              <p className="text-xs text-muted">{p27 ? `2027 · ${VINTAGE_SHORT[p27.vintage as Vintage]}` : "няма стойност за 2027"}</p>
              {delta && <p className="num text-sm text-ink-2">{fmtSigned(delta.toFixed(1))} {m.changeIn === "pp" ? "пр.п." : m.unit} спрямо 2026</p>}
              <ol className="num mt-1 flex flex-wrap gap-x-3 text-xs text-muted">
                {m.points.map((p) => (
                  <li key={p.period}>
                    {p.period}: {p.value === null ? "—" : fmtNum(p.value, m.unit === "€" ? 0 : 1)}
                  </li>
                ))}
              </ol>
              <p className="text-xs text-muted">{m.source}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}
