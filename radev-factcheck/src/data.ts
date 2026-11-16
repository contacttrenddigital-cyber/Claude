// Всички статистически данни за видеото са на едно място.

export type CountryGrowth = {
  /** Място в класацията сред държавите с публикувани данни. */
  rank: number;
  /** Код на държавата — име на файла със знамето в public/flags. */
  code: string;
  /** Име на държавата на български. */
  name: string;
  /** Годишен растеж на БВП, III тримесечие на 2026 г., в проценти. */
  growth: number;
  /** Държавата, за която е проверката. */
  highlight: boolean;
};

export const RANKING: readonly CountryGrowth[] = [
  {rank: 1, code: 'ie', name: 'Ирландия', growth: 3.6, highlight: false},
  {rank: 2, code: 'pl', name: 'Полша', growth: 3.6, highlight: false},
  {rank: 3, code: 'cy', name: 'Кипър', growth: 3.1, highlight: false},
  {rank: 4, code: 'se', name: 'Швеция', growth: 2.8, highlight: false},
  {rank: 5, code: 'es', name: 'Испания', growth: 2.7, highlight: false},
  {rank: 6, code: 'bg', name: 'България', growth: 2.5, highlight: true},
];

/** Обща скала за всички ленти: от 0 до 4%. */
export const SCALE_MAX = 4;

export const FACTS = {
  euMembers: 27,
  withData: 20,
  bulgariaGrowth: 2.5,
  euAverageGrowth: 1.5,
  claimedRank: 5,
  actualRank: 6,
  sources: 'Източници: Евростат, НСИ | данни към 13.11.2026 г.',
} as const;
