import { computed, signal } from "@preact/signals";
import { type Course, displayCode } from "#domain/course.ts";
import {
  addCourse,
  conflictingCourses,
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

/** Whether a course is in the schedule, can be added, or can't fit. */
export function courseState(course: Course): "added" | "addable" | "blocked" {
  if (hasCourse(schedule.value, course)) return "added";
  if (typeof term.value === "string") return "blocked";
  return addCourse(term.value, schedule.value, course) ? "addable" : "blocked";
}

/** Whether a section is picked, could be picked, or can't fit. */
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

/** Why a course, or one of its sections, can't fit: "Conflicts with MATH 101". */
export function whyBlocked(course: Course, section?: Section) {
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

/** Adds a course if it isn't in the schedule and fits; removes it if it is. */
export function toggleCourse(course: Course) {
  if (typeof term.value === "string") return;
  if (hasCourse(schedule.value, course)) {
    schedule.value = removeCourse(schedule.value, course);
    return;
  }
  const added = addCourse(term.value, schedule.value, course);
  if (added) schedule.value = added;
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
