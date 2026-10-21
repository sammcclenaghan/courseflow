import { signal } from "@preact/signals";
import type { Term } from "#domain/term.ts";

/** The term the app opens on: Spring 2027, what students register for next. */
export const TERM_CODE = "202701";

/** The term's courses and sections, once its file has loaded. */
export const term = signal<Term | "loading" | "failed">("loading");

fetch(`/data/terms/${TERM_CODE}.json`)
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json() as Promise<Term>;
  })
  .then((loaded) => {
    term.value = loaded;
  })
  .catch((error) => {
    console.error(error);
    term.value = "failed";
  });
