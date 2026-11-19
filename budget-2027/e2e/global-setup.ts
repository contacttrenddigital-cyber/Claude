/** Creates test-only admin users in the local/CI database before the e2e run. */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/auth/core";

export const E2E_PASSWORD = "e2e-test-password-123";

export default async function globalSetup() {
  const db = new PrismaClient();
  try {
    const passwordHash = hashPassword(E2E_PASSWORD);
    for (const [email, role] of [
      ["e2e-viewer@example.test", "viewer"],
      ["e2e-publisher@example.test", "publisher"],
      ["e2e-lock@example.test", "viewer"],
    ] as const) {
      await db.user.upsert({
        where: { email },
        create: { email, role, passwordHash },
        update: { role, passwordHash, failedAttempts: 0, lockedUntil: null },
      });
    }
  } finally {
    await db.$disconnect();
  }
}
