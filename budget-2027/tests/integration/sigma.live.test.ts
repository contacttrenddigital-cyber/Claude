/**
 * Live checks against the real SIGMA Budget service. Opt-in: `npm run test:live`.
 * They verify that the contract our code relies on still holds — they do not snapshot numbers.
 */
import { describe, expect, it } from "vitest";
import { createSigmaClient } from "@/lib/sigma/client";

const live = process.env.SIGMA_LIVE === "1";

describe.skipIf(!live)("SIGMA Budget live contract", () => {
  const c = createSigmaClient();

  it("catalog lists real datasets and zero mock datasets", async () => {
    const cat = await c.catalog();
    expect(cat.counts.mock).toBe(0);
    expect(cat.datasets.length).toBeGreaterThan(10);
    const slugs = cat.datasets.map((d) => d.slug);
    for (const s of [
      "outlook",
      "revenue",
      "expenditure",
      "execution",
      "budget2027",
      "municipalities",
    ]) {
      expect(slugs).toContain(s);
    }
    expect(cat.traps.map((t) => t.id)).toEqual(
      expect.arrayContaining(["eur-bgn", "scope", "bill-law"]),
    );
  }, 30_000);

  it("budget2027 dataset has a valid, non-mock meta block", async () => {
    const r = await c.dataset("budget2027");
    expect(r.meta.mock).toBe(false);
    expect(r.meta.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }, 30_000);

  it("MCP endpoint speaks MCP and states its citation rules", async () => {
    const res = await fetch(`${c.baseUrl}/mcp`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "budget-2027-test", version: "0" },
        },
      }),
    });
    expect(res.ok).toBe(true);
    const body = (await res.json()) as {
      result: { serverInfo: { name: string }; instructions: string };
    };
    expect(body.result.serverInfo.name).toBe("sigma-budget");
    expect(body.result.instructions).toMatch(/asOf/);
  }, 30_000);
});
