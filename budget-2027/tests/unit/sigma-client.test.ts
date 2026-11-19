import { describe, expect, it, vi } from "vitest";
import { SigmaError, createSigmaClient } from "@/lib/sigma/client";

function fakeFetch(body: unknown, status = 200) {
  return vi.fn(
    async () => new Response(JSON.stringify(body), { status }),
  ) as unknown as typeof fetch;
}

const meta = {
  id: "D01",
  title: "Рамка на КФП",
  status: "real",
  asOf: "2026-07-01",
  retrieved: "2026-11-18",
  unit: "млн. €",
  mock: false,
};

describe("SIGMA client", () => {
  it("builds file URLs from the base and returns meta", async () => {
    const f = fakeFetch({ meta, data: {} });
    const c = createSigmaClient({ baseUrl: "https://sigma-budget.midt.bg/", fetchImpl: f });
    const r = await c.dataset("outlook");
    expect(r.fileUrl).toBe("https://sigma-budget.midt.bg/data/outlook.json");
    expect(r.meta.asOf).toBe("2026-07-01");
    expect(f).toHaveBeenCalledWith(
      "https://sigma-budget.midt.bg/data/outlook.json",
      expect.anything(),
    );
  });

  it("rejects mock datasets", async () => {
    const c = createSigmaClient({ fetchImpl: fakeFetch({ meta: { ...meta, mock: true } }) });
    await expect(c.dataset("outlook")).rejects.toThrow(SigmaError);
  });

  it("rejects files without meta", async () => {
    const c = createSigmaClient({ fetchImpl: fakeFetch({ data: [] }) });
    await expect(c.dataset("outlook")).rejects.toThrow(/meta/);
  });

  it("rejects path-traversal slugs", async () => {
    const c = createSigmaClient({ fetchImpl: fakeFetch({}) });
    await expect(c.dataset("../secrets")).rejects.toThrow(/invalid dataset slug/);
  });

  it("surfaces HTTP errors", async () => {
    const c = createSigmaClient({ fetchImpl: fakeFetch({}, 503) });
    await expect(c.catalog()).rejects.toThrow(/HTTP 503/);
  });

  it("validates catalog schema", async () => {
    const c = createSigmaClient({ fetchImpl: fakeFetch({ meta }) });
    await expect(c.catalog()).rejects.toThrow(/schema mismatch/);
  });
});
