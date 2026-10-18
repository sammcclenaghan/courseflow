import { computed, signal } from "@preact/signals";
import type { Section, TermCourse } from "../catalog/model.ts";
import { defaultSectionSet, pickSection } from "../catalog/sections.ts";
import { courseByCode } from "./catalog.ts";
import { type Color, nextColor } from "./colours.ts";

export type SelectedCourse = {
  code: string;
  crns: string[];
  colour: Color;
};

export const selected = signal<SelectedCourse[]>([]);

/** Each selected course with its catalog data and chosen sections, for display. */
export const selectedCourses = computed(() =>
  selected.value.flatMap(({ code, crns, colour }) => {
    const course = courseByCode.value.get(code);
    if (!course) return [];
    const sections = course.sections.filter((s) => crns.includes(s.crn));
    return [{ course, sections, colour }];
  }),
);

export const selectedSections = computed(() =>
  selectedCourses.value.flatMap(({ sections }) => sections),
);

export const selectedCodes = computed(
  () => new Set(selected.value.map(({ code }) => code)),
);

export function addCourse(course: TermCourse) {
  if (selectedCodes.value.has(course.code)) return;
  const sections = defaultSectionSet(course, selectedSections.value);
  const colour = nextColor(selected.value.map((c) => c.colour));
  selected.value = [
    ...selected.value,
    { code: course.code, crns: sections.map((s) => s.crn), colour },
  ];
}

export function removeCourse(code: string) {
  selected.value = selected.value.filter((c) => c.code !== code);
}

/** Picks `section` for its course; sections from another link group are un-picked, never re-picked. */
export function changeSection(code: string, section: Section) {
  const entry = selectedCourses.value.find(
    ({ course }) => course.code === code,
  );
  if (!entry) return;
  const crns = pickSection(entry.sections, section).map((s) => s.crn);
  selected.value = selected.value.map((c) =>
    c.code === code ? { ...c, crns } : c,
  );
}

export function clearSchedule() {
  selected.value = [];
}
