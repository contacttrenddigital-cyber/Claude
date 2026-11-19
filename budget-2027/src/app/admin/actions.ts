"use server";

/**
 * Admin server actions. Every action checks the session and role on the server; the UI hiding a
 * button is never the protection.
 */
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { LOCK_MINUTES, MAX_FAILED, signSession, verifyPassword } from "@/lib/auth/core";
import { adminEnabled, COOKIE, requireRole, secret } from "@/lib/auth/session";

const SESSION_HOURS = 8;

export async function login(_: { error: string | null }, form: FormData): Promise<{ error: string | null }> {
  if (!adminEnabled()) return { error: "Админ панелът е изключен (няма SESSION_SECRET)." };
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const password = String(form.get("password") ?? "").slice(0, 200);
  const generic = { error: "Невалиден имейл или парола." };
  const u = await db.user.findUnique({ where: { email } });
  if (!u || !u.passwordHash) return generic;
  if (u.lockedUntil && u.lockedUntil > new Date()) return { error: `Профилът е временно заключен след ${MAX_FAILED} грешни опита. Опитайте по-късно.` };
  if (!verifyPassword(password, u.passwordHash)) {
    const failed = u.failedAttempts + 1;
    await db.user.update({
      where: { id: u.id },
      data: { failedAttempts: failed, lockedUntil: failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null },
    });
    await db.auditLog.create({ data: { userId: u.id, action: "auth.failed", target: u.id } });
    return generic;
  }
  await db.user.update({ where: { id: u.id }, data: { failedAttempts: 0, lockedUntil: null } });
  await db.auditLog.create({ data: { userId: u.id, action: "auth.login", target: u.id } });
  const token = signSession({ uid: u.id, exp: Math.floor(Date.now() / 1000) + SESSION_HOURS * 3600 }, secret());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/admin",
    maxAge: SESSION_HOURS * 3600,
  });
  redirect("/admin");
}

export async function logout() {
  (await cookies()).delete({ name: COOKIE, path: "/admin" });
  redirect("/admin");
}

/** Publish an already-loaded snapshot (publisher+). Refuses snapshots with failed checks. */
export async function publishSnapshot(form: FormData) {
  const u = await requireRole("publisher");
  const id = String(form.get("snapshotId") ?? "");
  const snap = await db.dataSnapshot.findUnique({ where: { id }, include: { checks: { where: { status: "fail" } } } });
  if (!snap) throw new Error("Няма такава снимка");
  if (snap.checks.length) throw new Error("Снимката има неуспешни проверки и не може да се публикува");
  await db.$transaction([
    db.dataSnapshot.updateMany({ where: { publishedAt: { not: null }, supersededAt: null, NOT: { id } }, data: { supersededAt: new Date() } }),
    db.dataSnapshot.update({ where: { id }, data: { publishedAt: new Date(), publishedBy: u.email, supersededAt: null } }),
    db.auditLog.create({ data: { userId: u.id, action: "snapshot.publish", target: id, details: { via: "admin" } } }),
  ]);
  revalidatePath("/", "layout");
}
