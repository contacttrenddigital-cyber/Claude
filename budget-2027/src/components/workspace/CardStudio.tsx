"use client";

/**
 * Social card studio: verified metric → publication-ready SVG/PNG. Headline and subhead are editable;
 * the value, the source, the legal status and the date are not.
 */
import { useMemo, useRef, useState } from "react";
import Decimal from "decimal.js";
import type { MetricCard } from "@/lib/data/view";
import { fmtNum, fmtSigned, VINTAGE_SHORT } from "@/lib/format";
import type { Vintage } from "@/lib/ingest/documents";

const SIZES = {
  square: { w: 1080, h: 1080, label: "1080×1080 (квадрат)" },
  portrait: { w: 1080, h: 1350, label: "1080×1350 (портрет)" },
  story: { w: 1080, h: 1920, label: "1080×1920 (история)" },
  wide: { w: 1920, h: 1080, label: "1920×1080 (широк)" },
} as const;
type Size = keyof typeof SIZES;

const THEMES = {
  dark: { bg: "#08111F", ink: "#F7F9FC", muted: "#8292A9", accent: "#FF6B00", bar: "#3987E5", rule: "#1F3049" },
  light: { bg: "#F7F9FC", ink: "#08111F", muted: "#5B6B82", accent: "#B84A00", bar: "#2A78D6", rule: "#D9E0EA" },
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** naive word wrap by character count (SVG has no automatic wrapping) */
function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > max) {
      if (cur) lines.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 4);
}

export function CardStudio({ metrics, snapshotDate, snapshotId }: { metrics: MetricCard[]; snapshotDate: string; snapshotId: string }) {
  const [key, setKey] = useState("kfp.expenditure.interest");
  const [size, setSize] = useState<Size>("square");
  const [theme, setTheme] = useState<keyof typeof THEMES>("dark");
  const m = metrics.find((x) => x.key === key) ?? metrics[0]!;
  const [headline, setHeadline] = useState<string | null>(null);
  const [subhead, setSubhead] = useState("");
  const svgRef = useRef<HTMLDivElement>(null);

  const svg = useMemo(() => {
    const { w, h } = SIZES[size];
    const t = THEMES[theme];
    const pad = Math.round(w * 0.07);
    const s = w / 1080;
    const p27 = m.points.find((p) => p.period === "2027");
    const p26 = m.points.find((p) => p.period === "2026");
    const delta = p27?.value && p26?.value ? new Decimal(p27.value).minus(p26.value) : null;
    const valueText = p27?.value ? fmtNum(p27.value, m.unit === "€" ? 0 : 1) : "няма данни";
    const head = wrap(headline ?? m.label, size === "wide" ? 42 : 26);
    const sub = subhead ? wrap(subhead, size === "wide" ? 70 : 44) : [];
    // bars 2025–2029 (zero baseline; forecasts hatched)
    const pts = m.points.filter((p) => p.value !== null);
    const vals = pts.map((p) => Number(p.value));
    const lo = Math.min(0, ...vals);
    const hi = Math.max(0, ...vals);
    const chartTop = h * 0.56;
    const chartH = h * 0.22;
    const chartW = w - pad * 2;
    const bw = (chartW / Math.max(1, pts.length)) * 0.6;
    const y = (v: number) => chartTop + ((hi - v) / (hi - lo || 1)) * chartH;
    const bars = pts
      .map((p, i) => {
        const v = Number(p.value);
        const x = pad + (chartW / pts.length) * i + (chartW / pts.length - bw) / 2;
        const top = Math.min(y(v), y(0));
        const hh = Math.max(2, Math.abs(y(v) - y(0)));
        const fill = p.vintage === "actual" ? t.bar : "url(#hatch)";
        return `<rect x="${x}" y="${top}" width="${bw}" height="${hh}" rx="4" fill="${fill}" stroke="${t.bar}" stroke-width="2"/>
<text x="${x + bw / 2}" y="${chartTop + chartH + 34 * s}" text-anchor="middle" font-size="${24 * s}" fill="${t.muted}">${p.period}</text>
<text x="${x + bw / 2}" y="${chartTop + chartH + 62 * s}" text-anchor="middle" font-size="${18 * s}" fill="${t.muted}">${VINTAGE_SHORT[p.vintage as Vintage]}</text>`;
      })
      .join("\n");
    const font = "Inter, 'Segoe UI', Roboto, Arial, sans-serif";
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="${font}">
<defs><pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="${t.bar}" opacity="0.25"/><line x1="0" y1="0" x2="0" y2="10" stroke="${t.bar}" stroke-width="4"/></pattern></defs>
<rect width="${w}" height="${h}" fill="${t.bg}"/>
<rect x="${pad}" y="${pad}" width="${10 * s}" height="${40 * s}" fill="${t.accent}"/>
<text x="${pad + 26 * s}" y="${pad + 32 * s}" font-size="${30 * s}" font-weight="700" fill="${t.ink}">БЮДЖЕТ 2027 · под лупа</text>
${head.map((l, i) => `<text x="${pad}" y="${pad + (130 + i * 66) * s}" font-size="${56 * s}" font-weight="700" fill="${t.ink}">${esc(l)}</text>`).join("\n")}
${sub.map((l, i) => `<text x="${pad}" y="${pad + (130 + head.length * 66 + 20 + i * 40) * s}" font-size="${30 * s}" fill="${t.muted}">${esc(l)}</text>`).join("\n")}
<text x="${pad}" y="${h * 0.5}" font-size="${120 * s}" font-weight="700" fill="${t.ink}">${esc(valueText)}<tspan font-size="${44 * s}" font-weight="400" fill="${t.muted}"> ${esc(m.unit)}</tspan></text>
${delta ? `<text x="${pad}" y="${h * 0.5 + 50 * s}" font-size="${30 * s}" fill="${t.muted}">${esc(`2027 (проект) · ${fmtSigned(delta.toFixed(1))} ${m.changeIn === "pp" ? "пр.п." : m.unit} спрямо 2026 (очакв.)`)}</text>` : ""}
${bars}
<line x1="${pad}" x2="${w - pad}" y1="${h - pad - 90 * s}" y2="${h - pad - 90 * s}" stroke="${t.rule}" stroke-width="2"/>
<text x="${pad}" y="${h - pad - 52 * s}" font-size="${22 * s}" fill="${t.muted}">${esc(`Източник: ${m.source}. Законопроект за ДБРБ 2027, НС вх. № 52-602-01-71 (16.11.2026).`).slice(0, size === "wide" ? 170 : 95)}</text>
<text x="${pad}" y="${h - pad - 20 * s}" font-size="${22 * s}" fill="${t.muted}">${esc(`Законопроект — не е приет. Данни към ${snapshotDate} · ${snapshotId}`)}</text>
</svg>`;
  }, [m, size, theme, headline, subhead, snapshotDate, snapshotId]);

  const download = (blob: Blob, ext: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `budget2027-${m.key}-${size}.${ext}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const exportPng = () => {
    const { w, h } = SIZES[size];
    const img = new Image();
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d")!.drawImage(img, 0, 0, w, h);
      c.toBlob((b) => b && download(b, "png"), "image/png");
    };
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  };

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] [&>*]:min-w-0">
      <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
        <label className="flex flex-col gap-1 text-sm">
          Показател
          <select value={key} onChange={(e) => (setKey(e.target.value), setHeadline(null))} className="min-h-11 rounded-sm border border-rule-strong bg-surface px-3 text-ink">
            {metrics.map((x) => (
              <option key={x.key} value={x.key}>
                {x.short} ({x.unit})
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Заглавие
          <input value={headline ?? m.label} onChange={(e) => setHeadline(e.target.value.slice(0, 110))} className="min-h-11 rounded-sm border border-rule-strong bg-surface px-3 text-ink" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Подзаглавие (по избор)
          <input value={subhead} onChange={(e) => setSubhead(e.target.value.slice(0, 160))} className="min-h-11 rounded-sm border border-rule-strong bg-surface px-3 text-ink" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Размер
          <select value={size} onChange={(e) => setSize(e.target.value as Size)} className="min-h-11 rounded-sm border border-rule-strong bg-surface px-3 text-ink">
            {Object.entries(SIZES).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="flex gap-2">
          <legend className="mb-1 text-sm">Тема</legend>
          {(["dark", "light"] as const).map((th) => (
            <label key={th} className="flex min-h-11 items-center gap-2 text-sm">
              <input type="radio" name="theme" className="size-5" checked={theme === th} onChange={() => setTheme(th)} />
              {th === "dark" ? "Тъмна" : "Светла"}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={exportPng} className="min-h-11 rounded-sm bg-ink px-4 text-sm font-medium text-bg">
            Изтегли PNG
          </button>
          <button type="button" onClick={() => download(new Blob([svg], { type: "image/svg+xml" }), "svg")} className="min-h-11 rounded-sm border border-rule-strong px-4 text-sm">
            Изтегли SVG
          </button>
        </div>
        <p className="text-xs text-muted">Стойността, източникът, правният статус и датата не могат да се редактират.</p>
      </form>
      <div ref={svgRef} className="overflow-hidden rounded-sm border border-rule" aria-label="Преглед на картата" role="img" dangerouslySetInnerHTML={{ __html: svg.replace(/width="\d+" height="\d+" viewBox/, 'width="100%" height="auto" viewBox') }} />
    </div>
  );
}
