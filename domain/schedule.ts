import type { Course } from "./course.ts";
import { conflicts, linkGroup, type Section } from "./section.ts";
import type { Term } from "./term.ts";

/**
 * What a student picked in one term: exactly what gets saved and shared.
 * CRNs are in the order their courses were added. Every course always has a
 * full legal set of sections. Two sections can meet at the same time, but
 * only when the student added a course that didn't fit; conflictsIn lists
 * them, and picking a section never makes a new one.
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
 * around the rest. When none fit, it's added anyway, in the lowest sections
 * that at least fit each other, conflicts and all.
 */
export function addCourse(
  term: Term,
  schedule: Schedule,
  course: Course,
): Schedule {
  if (hasCourse(schedule, course)) return schedule;
  const picked = sectionsIn(term, schedule).map(({ section }) => section);
  const sets = sectionSets(course);
  const set =
    sets.find((set) => fits(set, picked)) ??
    sets.find((set) => fits(set, [])) ??
    sets[0];
  return { ...schedule, crns: [...schedule.crns, ...set.map((s) => s.crn)] };
}

export function removeCourse(schedule: Schedule, course: Course): Schedule {
  const crns = new Set(course.sections.map((section) => section.crn));
  return { ...schedule, crns: schedule.crns.filter((crn) => !crns.has(crn)) };
}

/**
 * The schedule with a section of a course picked, or null when no legal
 * schedule includes it. The course's other sections move only when they must:
 * a different group-1 lab keeps CSC 110's lecture, but lecture A16 moves the
 * lab into group 2. Of the sets that fit, the one keeping most of the course's
 * current sections wins, then the lowest-numbered. The course keeps its place.
 */
export function pickSection(
  term: Term,
  schedule: Schedule,
  course: Course,
  section: Section,
): Schedule | null {
  const current = new Set(course.sections.map((s) => s.crn));
  const rest = schedule.crns.filter((crn) => !current.has(crn));
  const others = sectionsIn(term, { ...schedule, crns: rest }).map(
    (p) => p.section,
  );
  const sets = sectionSets(course).filter(
    (set) => set.includes(section) && fits(set, others),
  );
  if (sets.length === 0) return null;
  const kept = (set: Section[]) =>
    set.filter((s) => schedule.crns.includes(s.crn)).length;
  const best = sets.reduce((a, b) => (kept(b) > kept(a) ? b : a));
  const at = schedule.crns.findIndex((crn) => current.has(crn));
  const place = at === -1 ? rest.length : at;
  return {
    ...schedule,
    crns: [
      ...rest.slice(0, place),
      ...best.map((s) => s.crn),
      ...rest.slice(place),
    ],
  };
}

/**
 * The other courses in the schedule standing in the way of picking a section:
 * removing any one of them would let it be picked. Empty when it would take
 * removing more than one.
 */
export function conflictingCourses(
  term: Term,
  schedule: Schedule,
  course: Course,
  section: Section,
): Course[] {
  const courses = new Set(sectionsIn(term, schedule).map((p) => p.course));
  courses.delete(course);
  return [...courses].filter(
    (other) =>
      pickSection(term, removeCourse(schedule, other), course, section) !==
      null,
  );
}

/** Every pair of picked sections that meet at the same time, on even one date. */
export function conflictsIn(term: Term, schedule: Schedule) {
  const picked = sectionsIn(term, schedule);
  return picked.flatMap((a, i) =>
    picked
      .slice(i + 1)
      .filter((b) => conflicts(a.section, b.section))
      .map((b) => ({ a, b })),
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
