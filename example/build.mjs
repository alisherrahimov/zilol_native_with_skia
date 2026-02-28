/**
 * build.mjs — esbuild configuration for the example app.
 *
 * Resolves workspace packages from their TypeScript source directly
 * (bypasses the dist/ build step for fast iteration).
 *
 * Usage:
 *   node build.mjs            # dev build
 *   node build.mjs --watch    # watch mode
 *   node build.mjs --minify   # production build
 */

import * as esbuild from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.resolve(__dirname, "../packages");

// Map workspace package names → their TypeScript source entry
const aliases = {
  "@zilol-native/runtime": path.join(packagesDir, "runtime/src/index.ts"),
  "@zilol-native/nodes": path.join(packagesDir, "nodes/src/index.ts"),
  "@zilol-native/layout": path.join(packagesDir, "layout/src/index.ts"),
  "@zilol-native/renderer": path.join(packagesDir, "renderer/src/index.ts"),
  "@zilol-native/platform": path.join(packagesDir, "platform/src/index.ts"),
  "@zilol-native/gestures": path.join(packagesDir, "gestures/src/index.ts"),
  "@zilol-native/components": path.join(packagesDir, "components/src/index.ts"),
  "@zilol-native/animation": path.join(packagesDir, "animation/src/index.ts"),
  "@zilol-native/navigation": path.join(packagesDir, "navigation/src/index.ts"),
};

// esbuild plugin to resolve workspace packages from source
const workspacePlugin = {
  name: "zilol-workspace",
  setup(build) {
    for (const [pkg, src] of Object.entries(aliases)) {
      build.onResolve({ filter: new RegExp(`^${pkg.replace("/", "\\/")}$`) }, () => ({
        path: src,
      }));
    }
  },
};

const args = process.argv.slice(2);
const isWatch = args.includes("--watch");
const isMinify = args.includes("--minify");

/** @type {import('esbuild').BuildOptions} */
const buildOptions = {
  entryPoints: [path.join(__dirname, "app/index.ts")],
  outfile: path.join(__dirname, "ios/ZilolNative/index.bundle.js"),
  bundle: true,
  format: "iife",
  target: "es2020",
  minify: isMinify,
  sourcemap: false,
  plugins: [workspacePlugin],
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log("⚡ Watching for changes...");
} else {
  const result = await esbuild.build(buildOptions);
  console.log("⚡ Done");
}
