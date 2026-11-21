/**
 * Shared Open Graph card (1200×630) rendered with next/og. Numbers come from the published snapshot
 * through the caller and are printed with their source line, like everywhere else on the site.
 */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const CARD = { sky: "#bfe6f5", mustard: "#efc66b", rose: "#f4a6c6", mint: "#bfe5cc", lilac: "#d9cdf4", violet: "#7b79f3" } as const;
export type OgTone = keyof typeof CARD;

export interface OgFact {
  label: string;
  /** already formatted for display (fmtNum) */
  value: string;
  unit: string;
  tone: OgTone;
}

/** Inter 500/700 and Sofia Sans Condensed 900 (OFL), latin + cyrillic subsets merged into one TTF each (fontTools). */
async function fonts() {
  const f = (name: string) => readFile(join(process.cwd(), "assets/fonts", name));
  const [i5, i7, s9] = await Promise.all([f("inter-500.ttf"), f("inter-700.ttf"), f("sofia-sans-condensed-900.ttf")]);
  return [
    { name: "Inter", data: i5, weight: 500 as const, style: "normal" as const },
    { name: "Inter", data: i7, weight: 700 as const, style: "normal" as const },
    { name: "Sofia", data: s9, weight: 900 as const, style: "normal" as const },
  ];
}

export async function ogCard({ eyebrow, title, facts = [], source }: { eyebrow: string; title: string; facts?: OgFact[]; source?: string }) {
  const long = title.length > 34;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#141414", color: "#f5f2ea", padding: "52px 64px", fontFamily: "Inter" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 52, height: 52, borderRadius: 14, background: "#ef7b62", color: "#141414", fontFamily: "Sofia", fontSize: 28 }}>27</div>
          <div style={{ display: "flex", fontFamily: "Sofia", fontSize: 30, letterSpacing: 0.5 }}>БЮДЖЕТ 2027 · ПОД ЛУПА</div>
          <div style={{ display: "flex", marginLeft: "auto", background: "#efc66b", color: "#141414", borderRadius: 999, padding: "8px 20px", fontSize: 22, fontWeight: 700 }}>{eyebrow}</div>
        </div>
        <div style={{ display: "flex", marginTop: 40, fontFamily: "Sofia", fontSize: long ? 76 : 96, lineHeight: 0.95, textTransform: "uppercase", maxWidth: 1060 }}>{title}</div>
        {facts.length > 0 && (
          <div style={{ display: "flex", gap: 20, marginTop: "auto" }}>
            {facts.slice(0, 3).map((f) => (
              <div key={f.label} style={{ display: "flex", flexDirection: "column", flex: 1, background: CARD[f.tone], color: "#141414", borderRadius: 28, padding: "22px 26px" }}>
                <div style={{ display: "flex", fontSize: 22, fontWeight: 700 }}>{f.label}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8 }}>
                  <div style={{ display: "flex", fontFamily: "Sofia", fontSize: f.value.length > 7 ? 54 : 64, lineHeight: 1, whiteSpace: "nowrap" }}>{f.value}</div>
                  <div style={{ display: "flex", fontSize: 22, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>{f.unit}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", marginTop: facts.length ? 22 : "auto", fontSize: 19, color: "#a19b90" }}>{source ? `Източник: ${source}` : "Независимо, на прост език, с източник за всяко число."}</div>
      </div>
    ),
    { ...OG_SIZE, fonts: await fonts() },
  );
}
