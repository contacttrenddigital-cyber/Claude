/**
 * Switched-off sections. The code and the data stay in the repository; the routes return 404 and
 * nothing links to them until the flag is turned back on.
 */
export const FEATURES = {
  /** fact-checks of political statements (/analizi/asen-vasilev) — paused by the editor on 21.11.2026 */
  claims: false,
} as const;
