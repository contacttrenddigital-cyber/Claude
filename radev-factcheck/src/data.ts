// Всички статистически данни за видеото са на едно място.

export type CountryGrowth = {
  /** Място в класацията сред държавите с публикувани данни. */
  rank: number;
  /** Име на държавата на български. */
  name: string;
  /** Годишен растеж на БВП, III тримесечие на 2026 г., в проценти. */
  growth: number;
  /** Държавата, за която е проверката. */
  highlight: boolean;
};

export const RANKING: readonly CountryGrowth[] = [
  {rank: 1, name: 'Ирландия', growth: 3.6, highlight: false},
  {rank: 2, name: 'Полша', growth: 3.6, highlight: false},
  {rank: 3, name: 'Кипър', growth: 3.1, highlight: false},
  {rank: 4, name: 'Швеция', growth: 2.8, highlight: false},
  {rank: 5, name: 'Испания', growth: 2.7, highlight: false},
  {rank: 6, name: 'България', growth: 2.5, highlight: true},
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
