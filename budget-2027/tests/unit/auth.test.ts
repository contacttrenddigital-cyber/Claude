import { describe, expect, it } from "vitest";
import { hasRole, hashPassword, signSession, verifyPassword, verifySession } from "@/lib/auth/core";

const SECRET = "x".repeat(40);

describe("passwords", () => {
  it("hash and verify; wrong password fails; short password rejected", () => {
    const h = hashPassword("correct horse battery");
    expect(h.startsWith("scrypt$")).toBe(true);
    expect(verifyPassword("correct horse battery", h)).toBe(true);
    expect(verifyPassword("wrong password!!", h)).toBe(false);
    expect(() => hashPassword("short")).toThrow(/12/);
    expect(verifyPassword("x", "garbage")).toBe(false);
  });
  it("same password gives different hashes (salt)", () => {
    expect(hashPassword("correct horse battery")).not.toBe(hashPassword("correct horse battery"));
  });
});

describe("sessions", () => {
  const now = 1_800_000_000;
  it("valid token round-trips", () => {
    expect(verifySession(signSession({ uid: "u1", exp: now + 60 }, SECRET), SECRET, now)).toEqual({ uid: "u1", exp: now + 60 });
  });
  it("rejects tampered, expired, wrong-secret and malformed tokens", () => {
    const t = signSession({ uid: "u1", exp: now + 60 }, SECRET);
    const [body, mac] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ uid: "admin", exp: now + 60 })).toString("base64url");
    expect(verifySession(`${forged}.${mac}`, SECRET, now)).toBeNull();
    expect(verifySession(`${body}.${mac}x`, SECRET, now)).toBeNull();
    expect(verifySession(t, SECRET, now + 61)).toBeNull();
    expect(verifySession(t, "y".repeat(40), now)).toBeNull();
    expect(verifySession("nonsense", SECRET, now)).toBeNull();
    expect(verifySession(undefined, SECRET, now)).toBeNull();
  });
  it("refuses short secrets", () => {
    expect(() => signSession({ uid: "u", exp: 1 }, "short")).toThrow();
    expect(verifySession("a.b", "short")).toBeNull();
  });
});

describe("roles", () => {
  it("are ordered viewer < researcher < editor < publisher < administrator", () => {
    expect(hasRole("publisher", "editor")).toBe(true);
    expect(hasRole("editor", "publisher")).toBe(false);
    expect(hasRole("administrator", "publisher")).toBe(true);
    expect(hasRole("viewer", "viewer")).toBe(true);
  });
});
