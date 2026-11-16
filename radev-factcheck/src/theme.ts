type Palette = {
  /** Основен фон. */
  black: string;
  white: string;
  /** Акцент. */
  red: string;
  g18: string;
  g33: string;
  g77: string;
  gD9: string;
  gF2: string;
  /** Цвят на текст върху акцента. */
  onAccent: string;
  /** Основният фон като "r,g,b" — за полупрозрачни преливания. */
  bgRgb: string;
};

// Основна палитра: черно, бяло, червено + неутрални нюанси.
const MONO: Palette = {
  black: '#000000',
  white: '#FFFFFF',
  red: '#E30613',
  g18: '#181818',
  g33: '#333333',
  g77: '#777777',
  gD9: '#D9D9D9',
  gF2: '#F2F2F2',
  onAccent: '#FFFFFF',
  bgRgb: '0,0,0',
};

// Тъмносин вариант: същата структура, фонът и неутралните тонове са сини.
const NAVY: Palette = {
  black: '#071A3D',
  white: '#FFFFFF',
  red: '#E30613',
  g18: '#10295A',
  g33: '#234379',
  g77: '#8298C0',
  gD9: '#D3DDF0',
  gF2: '#F1F5FC',
  onAccent: '#FFFFFF',
  bgRgb: '7,26,61',
};

// Вариант с подадените пет цвята: #041690, #FFC300, #F3F3F3, #A0C8FF, #0014FF.
const PP: Palette = {
  black: '#041690', // фон
  white: '#F3F3F3', // основен текст
  red: '#FFC300', // акцент
  g18: '#0014FF', // подложки на лентите и празни квадратчета
  g33: '#0014FF',
  g77: '#A0C8FF', // второстепенен текст
  gD9: '#A0C8FF',
  gF2: '#F3F3F3', // ленти на останалите държави
  onAccent: '#041690',
  bgRgb: '4,22,144',
};

/** Избира се с REMOTION_THEME=navy|pp при рендериране (npm run render:navy / render:pp). */
const requested = process.env.REMOTION_THEME;
export const THEME: 'mono' | 'navy' | 'pp' =
  requested === 'navy' || requested === 'pp' ? requested : 'mono';

export const C: Palette = THEME === 'pp' ? PP : THEME === 'navy' ? NAVY : MONO;

/** Основният фон с прозрачност. */
export const bg = (alpha: number): string => `rgba(${C.bgRgb},${alpha})`;

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
