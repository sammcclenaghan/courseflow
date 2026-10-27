import { defineConfig } from "vitest/config";

// Separate from vite.config.ts so tests run in plain Node, without the
// Cloudflare and Preact plugins.
// The data work is starting over, so there are no tests yet.
export default defineConfig({ test: { passWithNoTests: true } });
