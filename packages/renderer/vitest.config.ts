// @ts-nocheck
import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    include: ["__tests__/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@zilol-native/nodes": path.resolve(__dirname, "../nodes/src/index.ts"),
      "@zilol-native/layout": path.resolve(__dirname, "../layout/src/index.ts"),
      "@zilol-native/runtime": path.resolve(
        __dirname,
        "../runtime/src/index.ts",
      ),
    },
  },
});
