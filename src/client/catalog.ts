import { computed } from "@preact/signals";
import type { TermCourse, TermFile } from "../catalog/model.ts";
import { loadJson } from "./loadable.ts";

export const TERM = "202609";

export const catalog = loadJson<TermFile>(`/data/terms/${TERM}.json`);

/** Every course in the term, looked up by code ("CSC110"). */
export const courseByCode = computed(() => {
  const c = catalog.value;
  if (c.kind !== "ok") return new Map<string, TermCourse>();
  return new Map(c.data.courses.map((course) => [course.code, course]));
});
