import {continueRender, delayRender, staticFile} from 'remotion';
import {THEME} from './theme';

// Inter (SIL Open Font License) — файловете са в public/fonts и се зареждат
// от самия проект, без зависимост от системни шрифтове.
const FACES: Array<[number, string]> = [
  [500, 'Inter-Medium.otf'],
  [700, 'Inter-Bold.otf'],
  [800, 'Inter-ExtraBold.otf'],
  [900, 'Inter-Black.otf'],
];

// Muller Next (Fontfabric) — предоставените от възложителя файлове.
// Налични са само Regular и Bold, затова всички заглавия (700–900) са с Bold.
// За по-тежки заглавия добавете ExtraBold/Black тук. Ако файл липсва,
// се зарежда Inter.
const MULLER: Array<[number, string]> = [
  [500, 'MullerNextTrial-Regular.otf'],
  [700, 'MullerNext-Bold.ttf'],
  [800, 'MullerNext-Bold.ttf'],
  [900, 'MullerNext-Bold.ttf'],
];

const loadSet = (set: Array<[number, string]>): Promise<FontFace[]> =>
  Promise.all(
    set.map(([weight, file]) =>
      new FontFace('InterFC', `url(${staticFile('fonts/' + file)})`, {
        weight: String(weight),
      }).load(),
    ),
  );

let started = false;

export const loadFonts = (): void => {
  if (started || typeof document === 'undefined') return;
  started = true;
  const handle = delayRender('Зареждане на шрифта');
  const wanted = THEME === 'pp' ? loadSet(MULLER).catch(() => loadSet(FACES)) : loadSet(FACES);
  wanted
    .then((faces) => {
      faces.forEach((f) => document.fonts.add(f));
      continueRender(handle);
    })
    .catch((err) => {
      throw err;
    });
};
