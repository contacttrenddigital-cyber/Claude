/**
 * Create or update an admin user. The password is read from the ADMIN_PASSWORD environment variable
 * (never a command-line argument, never a default).
 *   ADMIN_PASSWORD='…at least 12 chars…' npx tsx scripts/create-user.ts --email name@example.org --role publisher
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword, ROLES, type Role } from "../src/lib/auth/core";

async function main() {
  const args = process.argv.slice(2);
  const email = args[args.indexOf("--email") + 1];
  const role = (args.includes("--role") ? args[args.indexOf("--role") + 1] : "viewer") as Role;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !/^[^@\s]+@[^@\s]+$/.test(email)) throw new Error("--email is required");
  if (!ROLES.includes(role)) throw new Error(`--role must be one of ${ROLES.join(", ")}`);
  if (!password) throw new Error("Set ADMIN_PASSWORD in the environment");
  const db = new PrismaClient();
  try {
    const passwordHash = hashPassword(password);
    const u = await db.user.upsert({
      where: { email },
      create: { email, role, passwordHash },
      update: { role, passwordHash, failedAttempts: 0, lockedUntil: null },
    });
    await db.auditLog.create({ data: { action: "user.upsert", target: u.id, details: { email, role } } });
    console.log(`user ${email} (${role}) ready`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
