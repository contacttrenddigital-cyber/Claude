/** Server-side session access for admin pages and actions. */
import "server-only";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { hasRole, verifySession, type Role } from "./core";

export const COOKIE = "b27_session";
export const secret = () => process.env.SESSION_SECRET ?? "";
// off when the site is built from the committed snapshot (no database): see getPublished
export const adminEnabled = () => secret().length >= 32 && process.env.SNAPSHOT_SOURCE !== "file";

export async function currentUser() {
  if (!adminEnabled()) return null;
  const p = verifySession((await cookies()).get(COOKIE)?.value, secret());
  if (!p) return null;
  return db.user.findUnique({ where: { id: p.uid } });
}

/** Throws unless the session user has at least `role`. Call at the top of every server action. */
export async function requireRole(role: Role) {
  const u = await currentUser();
  if (!u || !hasRole(u.role as Role, role)) throw new Error("Нямате права за това действие");
  return u;
}
