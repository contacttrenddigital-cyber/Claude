// Строга палитра: черно, бяло, червено + разрешените неутрални нюанси.
export const C = {
  black: '#000000',
  white: '#FFFFFF',
  red: '#E30613',
  g18: '#181818',
  g33: '#333333',
  g77: '#777777',
  gD9: '#D9D9D9',
  gF2: '#F2F2F2',
} as const;

export const FONT = 'InterFC, sans-serif';

export const W = 1080;
export const H = 1920;
export const FPS = 30;

// Безопасни зони за TikTok / Instagram Reels / Facebook Reels.
export const SAFE = {top: 230, bottom: 400, side: 100} as const;
export const CONTENT_W = W - SAFE.side * 2;

/** Българско изписване: десетична запетая. */
export const bgNum = (v: number, digits = 1): string =>
  v.toFixed(digits).replace('.', ',');
