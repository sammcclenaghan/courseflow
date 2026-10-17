import { type Signal, signal } from "@preact/signals";

export type Loadable<T> =
  | { kind: "loading" }
  | { kind: "ok"; data: T }
  | { kind: "error"; reason: string };

export function loadJson<T>(url: string): Signal<Loadable<T>> {
  const state = signal<Loadable<T>>({ kind: "loading" });
  fetch(url)
    .then(async (response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      state.value = { kind: "ok", data: (await response.json()) as T };
    })
    .catch((err) => {
      state.value = { kind: "error", reason: String(err) };
    });
  return state;
}
