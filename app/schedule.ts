import { computed, signal } from "@preact/signals";
import type { Course } from "#domain/course.ts";
import { displayCode } from "#domain/course.ts";
import {
  addCourse,
  conflictingCourses,
  hasCourse,
  removeCourse,
  type Schedule,
  sectionsIn,
} from "#domain/schedule.ts";
import { TERM_CODE, term } from "./term.ts";

/** The student's schedule. Changed only through the functions below. */
export const schedule = signal<Schedule>({ term: TERM_CODE, crns: [] });

/** Each picked section with its course, in schedule order. */
export const picked = computed(() =>
  typeof term.value === "string" ? [] : sectionsIn(term.value, schedule.value),
);

// The course tints in styles.css, in the order courses take them.
const COLORS = ["green", "purple", "cyan", "blue", "orange", "lime"];

/**
 * Each course's tint, from the order it was added: a CSS variable like
 * "--color-course-green", with "-ring" for its outline.
 */
export const colors = computed(() => {
  const codes = [...new Set(picked.value.map(({ course }) => course.code))];
  return new Map(
    codes.map((code, i) => [
      code,
      `--color-course-${COLORS[i % COLORS.length]}`,
    ]),
  );
});

/** Whether a course is in the schedule, can be added, or can't fit. */
export function courseState(course: Course): "added" | "addable" | "blocked" {
  if (hasCourse(schedule.value, course)) return "added";
  if (typeof term.value === "string") return "blocked";
  return addCourse(term.value, schedule.value, course) ? "addable" : "blocked";
}

/** Why a blocked course can't be added: "Conflicts with MATH 100". */
export function whyBlocked(course: Course) {
  if (typeof term.value === "string") return "";
  const courses = conflictingCourses(term.value, schedule.value, course);
  return courses.length === 0
    ? "Conflicts with your schedule"
    : `Conflicts with ${courses.map((c) => displayCode(c.code)).join(", ")}`;
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
