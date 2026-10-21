import type { Course } from "./course.ts";
import { conflicts, linkGroup, type Section } from "./section.ts";
import type { Term } from "./term.ts";

/**
 * What a student picked in one term: exactly what gets saved and shared.
 * CRNs are in the order their courses were added. Every function here keeps
 * a schedule legal: each course has a full legal set of sections, and no two
 * sections ever meet at the same time.
 */
export type Schedule = { term: string; crns: string[] };

/** Each picked section with its course, in schedule order. */
export function sectionsIn(term: Term, schedule: Schedule) {
  const byCrn = crnIndex(term);
  return schedule.crns.flatMap((crn) => byCrn.get(crn) ?? []);
}

export const hasCourse = (schedule: Schedule, course: Course) =>
  course.sections.some((section) => schedule.crns.includes(section.crn));

/**
 * Every legal way to take a course, lowest-numbered first: one section of the
 * course's first type (usually the lecture), plus one of each other type in
 * its link group. Sections without a link ID make a group of their own, so
 * MUS 345's unlinked lectures each come with one of its unlinked labs.
 */
export function sectionSets(course: Course): Section[][] {
  const leadType = course.sections[0].type;
  return course.sections
    .filter((section) => section.type === leadType)
    .flatMap((lead) => {
      const linked = course.sections.filter(
        (s) => s.type !== leadType && linkGroup(s) === linkGroup(lead),
      );
      return combinations([
        [lead],
        ...Map.groupBy(linked, (s) => s.type).values(),
      ]);
    });
}

/**
 * The schedule with a course added, in its lowest-numbered sections that fit
 * around the rest, or null when no legal set fits.
 */
export function addCourse(
  term: Term,
  schedule: Schedule,
  course: Course,
): Schedule | null {
  if (hasCourse(schedule, course)) return schedule;
  const picked = sectionsIn(term, schedule).map(({ section }) => section);
  const set = sectionSets(course).find((set) => fits(set, picked));
  return set
    ? { ...schedule, crns: [...schedule.crns, ...set.map((s) => s.crn)] }
    : null;
}

export function removeCourse(schedule: Schedule, course: Course): Schedule {
  const crns = new Set(course.sections.map((section) => section.crn));
  return { ...schedule, crns: schedule.crns.filter((crn) => !crns.has(crn)) };
}

/**
 * The courses in the schedule that a course conflicts with: removing any one
 * of them would let it fit. Empty when it would take removing more than one.
 */
export function conflictingCourses(
  term: Term,
  schedule: Schedule,
  course: Course,
): Course[] {
  const courses = new Set(sectionsIn(term, schedule).map((p) => p.course));
  return [...courses].filter(
    (other) => addCourse(term, removeCourse(schedule, other), course) !== null,
  );
}

/** Whether no two sections of a set conflict, and none conflicts with the picked ones. */
const fits = (set: Section[], picked: Section[]) =>
  set.every((section, i) =>
    [...set.slice(i + 1), ...picked].every(
      (other) => !conflicts(section, other),
    ),
  );

/** One from each list, in every combination: [[A1, A2], [B1]] → [[A1, B1], [A2, B1]]. */
const combinations = (lists: Section[][]) =>
  lists.reduce<Section[][]>(
    (sets, options) => sets.flatMap((set) => options.map((s) => [...set, s])),
    [[]],
  );

// A term never changes once loaded, so its CRN lookup is built once.
const indexes = new WeakMap<
  Term,
  Map<string, { course: Course; section: Section }>
>();
function crnIndex(term: Term) {
  let index = indexes.get(term);
  if (!index) {
    index = new Map(
      term.courses.flatMap((course) =>
        course.sections.map((section) => [section.crn, { course, section }]),
      ),
    );
    indexes.set(term, index);
  }
  return index;
}
