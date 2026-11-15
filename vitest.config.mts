import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        resolve: { tsconfigPaths: true },
        test: {
          name: "browser",
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: ["src/server/**", "src/simulator/**"],
        },
      },
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: "server",
          environment: "node",
          setupFiles: ["./vitest.node-setup.ts"],
          include: ["src/server/**/*.test.ts", "src/simulator/**/*.test.ts"],
        },
      },
    ],
  },
});
