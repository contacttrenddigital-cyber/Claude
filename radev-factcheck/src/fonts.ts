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

// Muller Next е търговски шрифт и не е включен в проекта. Ако файловете
// по-долу бъдат поставени в public/fonts, те се използват автоматично;
// иначе се зарежда Inter.
const MULLER: Array<[number, string]> = [
  [500, 'MullerNext-Medium.otf'],
  [700, 'MullerNext-Bold.otf'],
  [800, 'MullerNext-ExtraBold.otf'],
  [900, 'MullerNext-Black.otf'],
];

const loadSet = (set: Array<[number, string]>): Promise<FontFace[]> =>
  Promise.all(
    set.map(([weight, file]) =>
      new FontFace('InterFC', `url(${staticFile('fonts/' + file)}) format('opentype')`, {
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
