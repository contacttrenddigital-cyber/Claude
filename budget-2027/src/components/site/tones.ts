/** Candy card backgrounds. Text on them is always dark (see `.on-card` in globals.css). */
export type CardTone = "sky" | "mustard" | "violet" | "mint" | "rose" | "lilac";
/** tones whose secondary text stays ≥ 4.5:1 (violet only carries big dark text) */
export type TileTone = Exclude<CardTone, "violet">;

export const CARD_BG: Record<CardTone, string> = {
  sky: "bg-card-sky",
  mustard: "bg-card-mustard",
  violet: "bg-card-violet",
  mint: "bg-card-mint",
  rose: "bg-card-rose",
  lilac: "bg-card-lilac",
};

/** article classes for a tile: plain surface, or a candy card when a tone is given */
export function tileClass(tone?: TileTone) {
  return tone
    ? `on-card ${CARD_BG[tone]} rounded-3xl p-5 shadow-lg shadow-black/30`
    : "rounded-3xl border border-rule bg-surface p-5";
}
