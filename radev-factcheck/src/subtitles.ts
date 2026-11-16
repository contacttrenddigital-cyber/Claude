// Субтитри, синхронизирани с реалните думи в оригиналния запис (секунди).
export type SubWord = {
  text: string;
  start: number;
  end: number;
  /** Ключовата дума, която се оцветява в червено при произнасянето. */
  accent?: boolean;
};

/** Всяка група се показва като един екран със субтитри. */
export const SUBTITLE_GROUPS: readonly SubWord[][] = [
  [
    {text: 'Ние', start: 0.0, end: 0.44},
    {text: 'сме', start: 0.44, end: 0.74},
    {text: 'пети', start: 0.74, end: 1.02, accent: true},
  ],
  [
    {text: 'в', start: 1.08, end: 1.3},
    {text: 'целия', start: 1.3, end: 1.64},
  ],
  [
    {text: 'Европейски', start: 1.64, end: 2.28},
    {text: 'съюз', start: 2.28, end: 2.5},
  ],
  [
    {text: 'за', start: 2.5, end: 2.8},
    {text: 'третото', start: 2.8, end: 3.28},
    {text: 'тримесечие', start: 3.28, end: 3.95},
  ],
  [
    {text: 'по', start: 4.79, end: 5.08},
    {text: 'икономически', start: 5.08, end: 6.56},
    {text: 'ръст.', start: 6.56, end: 7.06},
  ],
];
