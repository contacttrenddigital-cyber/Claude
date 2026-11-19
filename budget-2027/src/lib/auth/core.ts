/**
 * Auth primitives (no framework): scrypt password hashes, HMAC-signed session tokens, role order.
 * Pure Node crypto; unit-tested in tests/unit/auth.test.ts.
 */
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export const ROLES = ["viewer", "researcher", "editor", "publisher", "administrator"] as const;
export type Role = (typeof ROLES)[number];

export function hasRole(actual: Role, required: Role): boolean {
  return ROLES.indexOf(actual) >= ROLES.indexOf(required);
}

const N = 16384;

export function hashPassword(password: string): string {
  if (password.length < 12) throw new Error("Паролата трябва да е поне 12 знака");
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 32, { N });
  return `scrypt$${N}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [alg, n, salt, hash] = stored.split("$");
  if (alg !== "scrypt" || !n || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64url");
  const actual = scryptSync(password, Buffer.from(salt, "base64url"), expected.length, { N: Number(n) });
  return timingSafeEqual(actual, expected);
}

export interface SessionPayload {
  uid: string;
  /** unix seconds */
  exp: number;
}

export function signSession(p: SessionPayload, secret: string): string {
  if (secret.length < 32) throw new Error("SESSION_SECRET трябва да е поне 32 знака");
  const body = Buffer.from(JSON.stringify(p)).toString("base64url");
  const mac = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${mac}`;
}

export function verifySession(token: string | undefined, secret: string, now = Math.floor(Date.now() / 1000)): SessionPayload | null {
  if (!token || secret.length < 32) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const expected = createHmac("sha256", secret).update(body).digest();
  const given = Buffer.from(mac, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    return typeof p.uid === "string" && typeof p.exp === "number" && p.exp > now ? p : null;
  } catch {
    return null;
  }
}

export const MAX_FAILED = 5;
export const LOCK_MINUTES = 15;
