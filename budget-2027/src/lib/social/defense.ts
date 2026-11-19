/** Difference in percentage points between two printed % of GDP rows of Табл. III-2. */
import Decimal from "decimal.js";

export function defenseGap(nato: Record<string, string | null>, plan: Record<string, string | null>) {
  return Object.keys(nato)
    .sort()
    .map((period) => {
      const a = nato[period] ?? null;
      const b = plan[period] ?? null;
      return { period, nato: a, plan: b, gap: a === null || b === null ? null : new Decimal(a).minus(b) };
    });
}
