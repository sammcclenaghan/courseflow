import { defineConfig } from "vitest/config";

// Separate from vite.config.ts so tests run in plain Node, without the
// Cloudflare and Preact plugins.
export default defineConfig({});
