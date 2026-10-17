import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

app.get("/api/healthcheck", (c) => c.json({ message: "Hello World!" }));

export default app;
