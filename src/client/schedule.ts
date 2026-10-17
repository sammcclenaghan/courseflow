import { computed, signal } from "@preact/signals";
import type { Section, TermCourse } from "../catalog/model.ts";
import { defaultSections } from "../catalog/sections.ts";
import { catalog } from "./catalog.ts";

export const picks = signal<string[]>([]);

const sectionsByCrn = computed(() => {
  const map = new Map<string, { course: TermCourse; section: Section }>();
  if (catalog.value.kind === "ok")
    for (const course of catalog.value.data.courses)
      for (const section of course.sections)
        map.set(section.crn, { course, section });
  return map;
});

/** Picked sections grouped by course, courses in the order they were added. */
export const selected = computed(() => {
  const byCode = new Map<string, { course: TermCourse; sections: Section[] }>();
  for (const crn of picks.value) {
    const found = sectionsByCrn.value.get(crn);
    if (!found) continue;
    const entry = byCode.get(found.course.code) ?? {
      course: found.course,
      sections: [],
    };
    entry.sections.push(found.section);
    byCode.set(found.course.code, entry);
  }
  return [...byCode.values()];
});

export const addedCodes = computed(
  () => new Set(selected.value.map(({ course }) => course.code)),
);

export function addCourse(course: TermCourse) {
  if (addedCodes.value.has(course.code)) return;
  const schedule = selected.value.flatMap(({ sections }) => sections);
  const sections = defaultSections(course, schedule);
  picks.value = [...picks.value, ...sections.map((s) => s.crn)];
}

export function removeCourse(course: TermCourse) {
  const crns = new Set(course.sections.map((s) => s.crn));
  picks.value = picks.value.filter((crn) => !crns.has(crn));
}
