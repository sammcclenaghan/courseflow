import { computed, signal } from "@preact/signals";
import { type Course, displayCode } from "#domain/course.ts";
import {
  addCourse,
  conflictingCourses,
  conflictsIn,
  hasCourse,
  pickSection,
  removeCourse,
  type Schedule,
  sectionsIn,
} from "#domain/schedule.ts";
import type { Section } from "#domain/section.ts";
import { TERM_CODE, term } from "./term.ts";

/** The student's schedule. Changed only through the functions below. */
export const schedule = signal<Schedule>({ term: TERM_CODE, crns: [] });

/** Each picked section with its course, in schedule order. */
export const picked = computed(() =>
  typeof term.value === "string" ? [] : sectionsIn(term.value, schedule.value),
);

/** The courses in the schedule, in the order they were added. */
export const courses = computed(() => [
  ...new Set(picked.value.map(({ course }) => course)),
]);

/** Every pair of picked sections that meet at the same time. */
export const conflicts = computed(() =>
  typeof term.value === "string" ? [] : conflictsIn(term.value, schedule.value),
);

/** The CRNs of every picked section in a conflict. */
export const conflictingCrns = computed(
  () =>
    new Set(
      conflicts.value.flatMap(({ a, b }) => [a.section.crn, b.section.crn]),
    ),
);

/** The other courses a course's picked sections conflict with. */
export function conflictsOf(course: Course): Course[] {
  const others = conflicts.value.flatMap(({ a, b }) =>
    a.course === course ? [b.course] : b.course === course ? [a.course] : [],
  );
  return [...new Set(others)].filter((other) => other !== course);
}

// The course tints in styles.css, in the order courses take them.
const COLORS = ["green", "purple", "cyan", "blue", "orange", "lime"];

/**
 * Each course's tint, from the order it was added: a CSS variable like
 * "--color-course-green", with "-ring" for its outline.
 */
export const colors = computed(
  () =>
    new Map(
      courses.value.map((course, i) => [
        course.code,
        `--color-course-${COLORS[i % COLORS.length]}`,
      ]),
    ),
);

export const isAdded = (course: Course) => hasCourse(schedule.value, course);

/** Whether a section is picked, could be picked, or would make a conflict. */
export function sectionState(
  course: Course,
  section: Section,
): "picked" | "pickable" | "blocked" {
  if (schedule.value.crns.includes(section.crn)) return "picked";
  if (typeof term.value === "string") return "blocked";
  return pickSection(term.value, schedule.value, course, section)
    ? "pickable"
    : "blocked";
}

/** Why a section can't be picked: "Conflicts with MATH 101". */
export function whyBlocked(course: Course, section: Section) {
  if (typeof term.value === "string") return "";
  const others = conflictingCourses(
    term.value,
    schedule.value,
    course,
    section,
  );
  return others.length === 0
    ? "Conflicts with your schedule"
    : `Conflicts with ${others.map((c) => displayCode(c.code)).join(", ")}`;
}

/** Adds a course, even one that doesn't fit; removes it if it's added. */
export function toggleCourse(course: Course) {
  if (typeof term.value === "string") return;
  schedule.value = hasCourse(schedule.value, course)
    ? removeCourse(schedule.value, course)
    : addCourse(term.value, schedule.value, course);
}

/** Picks a section, moving the course's others only if they must. */
export function pick(course: Course, section: Section) {
  if (typeof term.value === "string") return;
  const next = pickSection(term.value, schedule.value, course, section);
  if (next) schedule.value = next;
}

export function clearSchedule() {
  schedule.value = { ...schedule.value, crns: [] };
}
