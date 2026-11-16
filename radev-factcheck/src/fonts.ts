import {continueRender, delayRender, staticFile} from 'remotion';

// Inter (SIL Open Font License) — файловете са в public/fonts и се зареждат
// от самия проект, без зависимост от системни шрифтове.
const FACES: Array<[number, string]> = [
  [500, 'Inter-Medium.otf'],
  [700, 'Inter-Bold.otf'],
  [800, 'Inter-ExtraBold.otf'],
  [900, 'Inter-Black.otf'],
];

let started = false;

export const loadFonts = (): void => {
  if (started || typeof document === 'undefined') return;
  started = true;
  const handle = delayRender('Зареждане на шрифта Inter');
  Promise.all(
    FACES.map(([weight, file]) => {
      const face = new FontFace(
        'InterFC',
        `url(${staticFile('fonts/' + file)}) format('opentype')`,
        {weight: String(weight)},
      );
      return face.load().then((f) => document.fonts.add(f));
    }),
  )
    .then(() => continueRender(handle))
    .catch((err) => {
      throw err;
    });
};
