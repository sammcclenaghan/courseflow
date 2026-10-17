import { signal } from "@preact/signals";

type Health =
  | { kind: "loading" }
  | { kind: "ok"; message: string }
  | { kind: "error"; reason: string };

export const health = signal<Health>({ kind: "loading" });

async function check() {
  try {
    const response = await fetch("/api/healthcheck");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    // Trusted, not checked: fine for a healthcheck, not for real data.
    const body = (await response.json()) as { message: string };
    health.value = { kind: "ok", message: body.message };
  } catch (err) {
    health.value = { kind: "error", reason: String(err) };
  }
}

check();
