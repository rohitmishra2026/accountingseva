import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Two suites, deliberately separate:
//
//   npm test                 unit tests. No database, no network. Fast.
//   npm run test:isolation   RLS isolation against a real Supabase. Needs
//                            credentials and FAILS LOUDLY without them, so a
//                            green unit run can never be mistaken for proof
//                            that client isolation holds.
//
// The @/ alias is declared here rather than via vite-tsconfig-paths, which is
// ESM-only and cannot be required from a .ts config in this package.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
      // Next provides `server-only`; it does not resolve in the test runner.
      "server-only": path.resolve(process.cwd(), "tests/stubs/server-only.ts"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    exclude: ["tests/isolation/**", "node_modules/**"],
  },
});
