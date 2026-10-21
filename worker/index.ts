import { Hono } from "hono";

// Serves /api/*; wrangler serves every other path from the static build.
const app = new Hono();

export default app;
