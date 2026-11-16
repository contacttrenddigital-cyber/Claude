// Продължителности на сцените в кадри (30 кадъра/сек.).
export const SCENES = {
  statement: 224, // цялата дължина на оригиналния клип (7,47 сек.)
  lie: 66,
  // Следващите сцени следват дикторския запис (public/voiceover.wav).
  ranking: 558,
  fiveVsSix: 166,
  coverage: 370,
  finale: 327,
} as const;

/** Дикторът започва толкова кадъра след началото на класацията. */
export const VOICEOVER_OFFSET = 9;

export const TOTAL_FRAMES = Object.values(SCENES).reduce((a, b) => a + b, 0);

export const sceneStart = (key: keyof typeof SCENES): number => {
  let t = 0;
  for (const k of Object.keys(SCENES) as Array<keyof typeof SCENES>) {
    if (k === key) return t;
    t += SCENES[k];
  }
  return t;
};
