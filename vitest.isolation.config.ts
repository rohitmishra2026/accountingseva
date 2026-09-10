import path from "node:path";
import { defineConfig } from "vitest/config";

// RLS isolation suite. Talks to a real Supabase project, so it is kept out of
// the default run and given a long timeout for network round trips.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
      // Next provides `server-only`; it does not resolve outside a Next build.
      "server-only": path.resolve(process.cwd(), "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/isolation/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Sequential: these tests sign in and out of shared sessions.
    fileParallelism: false,
  },
});
