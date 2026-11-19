/**
 * Minimal read-only client for SIGMA Budget open data (https://sigma-budget.midt.bg/api).
 *
 * - Files live at `${base}/data/<slug>.json`; each starts with a `meta` block
 *   (id, title, status, source, sourceNote, asOf, retrieved, unit?, mock).
 * - SIGMA statuses: real | forecast | partial | pending | mock. `mock` is always rejected.
 * - SIGMA is a verified secondary source: every figure must still be traceable to the primary
 *   document (use the MCP tool `explain_number` or the *-provenance datasets).
 */
import { z } from "zod";

export const SigmaStatus = z.enum(["real", "forecast", "partial", "pending", "mock"]);

export const SigmaMeta = z.object({
  id: z.string(),
  title: z.string(),
  status: SigmaStatus,
  source: z.array(z.string()).optional(),
  sourceNote: z.string().optional(),
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  retrieved: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  unit: z.string().optional(),
  mock: z.boolean(),
});
export type SigmaMeta = z.infer<typeof SigmaMeta>;

export const SigmaCatalogEntry = z.object({
  slug: z.string(),
  title: z.string(),
  group: z.string(),
  status: SigmaStatus,
  period: z.string().optional(),
  asOf: z.string().optional(),
  unit: z.string().nullable().optional(),
});

export const SigmaCatalog = z.object({
  meta: SigmaMeta,
  counts: z.object({ datasets: z.number(), files: z.number(), mock: z.number() }).passthrough(),
  datasets: z.array(SigmaCatalogEntry.passthrough()),
  traps: z.array(z.object({ id: z.string(), title: z.string(), text: z.string() }).passthrough()),
});
export type SigmaCatalog = z.infer<typeof SigmaCatalog>;

export class SigmaError extends Error {
  override name = "SigmaError";
}

const SLUG = /^[a-z0-9][a-z0-9-]*$/;

export interface SigmaClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

export function createSigmaClient(opts: SigmaClientOptions = {}) {
  const baseUrl = (
    opts.baseUrl ??
    process.env.SIGMA_BASE_URL ??
    "https://sigma-budget.midt.bg"
  ).replace(/\/+$/, "");
  const doFetch = opts.fetchImpl ?? fetch;

  async function getJson(path: string): Promise<unknown> {
    const url = `${baseUrl}${path}`;
    const res = await doFetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new SigmaError(`GET ${url} → HTTP ${res.status}`);
    return res.json();
  }

  return {
    baseUrl,

    async catalog(): Promise<SigmaCatalog> {
      const parsed = SigmaCatalog.safeParse(await getJson("/data/catalog.json"));
      if (!parsed.success)
        throw new SigmaError(`catalog.json schema mismatch: ${parsed.error.message}`);
      return parsed.data;
    },

    /** Fetch one dataset file. Rejects mock data and files without a valid meta block. */
    async dataset<T = Record<string, unknown>>(
      slug: string,
    ): Promise<{ meta: SigmaMeta; data: T; fileUrl: string }> {
      if (!SLUG.test(slug)) throw new SigmaError(`invalid dataset slug "${slug}"`);
      const raw = (await getJson(`/data/${slug}.json`)) as { meta?: unknown };
      const meta = SigmaMeta.safeParse(raw?.meta);
      if (!meta.success) throw new SigmaError(`${slug}: missing or invalid meta block`);
      if (meta.data.mock || meta.data.status === "mock") {
        throw new SigmaError(`${slug}: dataset is marked as mock and must not be used`);
      }
      return { meta: meta.data, data: raw as T, fileUrl: `${baseUrl}/data/${slug}.json` };
    },
  };
}
