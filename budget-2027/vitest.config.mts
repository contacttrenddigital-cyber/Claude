import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["tests/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**"],
      // db.ts and published.ts need PostgreSQL; they are exercised by the e2e suite
      exclude: ["**/*.test.*", "src/lib/db.ts", "src/lib/data/published.ts", "src/lib/data/types.ts", "src/lib/data/claims.ts", "src/lib/data/view.ts", "src/lib/search.ts", "src/lib/auth/session.ts"],
      thresholds: { lines: 90, functions: 90, branches: 85, statements: 90 },
    },
  },
});
