import { conflictChecker } from "./conflicts.ts";
import type { Section, TermCourse } from "./model.ts";

const linkGroup = (section: Section) => section.linkId?.slice(1) ?? null;

/**
 * The lowest-numbered sections that work together: a lead section (usually
 * the lowest lecture) plus the lowest of each other type in its link group,
 * skipping any that conflict with what's already picked. CSC110's A01 gets B02,
 * since B01 overlaps it. MECH580's A01 (A1) gets B01 (B1) but no tutorial,
 * since its only tutorials link to other lectures.
 *
 * Given the rest of a schedule, it prefers sections that also fit around it,
 * but never refuses: if nothing fits, it falls back to the course alone, and
 * if even that can't avoid a conflict, to the lowest sections, conflict and all.
 */
export function defaultSectionSet(
  course: TermCourse,
  schedule: readonly Section[] = [],
): Section[] {
  const byType = Map.groupBy(byNumber(course.sections), (s) => s.type);
  const lead = leadType(course);
  if (lead === undefined) return [];
  // Each lead section's options: itself, then each other type in its link group.
  const candidates =
    byType.get(lead)?.map((leadSection) => [
      [leadSection],
      ...[...byType]
        .filter(([type]) => type !== lead)
        .map(([, sections]) =>
          sections.filter((s) => linkGroup(s) === linkGroup(leadSection)),
        )
        .filter((options) => options.length > 0),
    ]) ?? [];

  const conflictsWithSchedule = conflictChecker(schedule);
  const fitsSchedule = (s: Section) => conflictsWithSchedule(s).length === 0;
  for (const allowed of [fitsSchedule, () => true]) {
    for (const options of candidates) {
      const found = firstFit([], options, allowed);
      if (found) return found;
    }
  }
  return candidates[0].map((options) => options[0]);
}

const byNumber = (sections: readonly Section[]) =>
  sections.toSorted((a, b) => (a.number < b.number ? -1 : 1));

/** The type a section set is built around: the course's lowest section's, usually Lecture. */
const leadType = (course: TermCourse) => byNumber(course.sections)[0]?.type;

/** Picking a section swaps out the picked section of the same type. */
export function pickSection(
  picked: readonly Section[],
  section: Section,
): Section[] {
  return [section, ...picked.filter((s) => s.type !== section.type)];
}

/** One section from each list, lowest first, backtracking when a choice leaves a later list nothing that fits. */
function firstFit(
  chosen: Section[],
  options: Section[][],
  allowed: (section: Section) => boolean,
): Section[] | null {
  if (options.length === 0) return chosen;
  const [first, ...rest] = options;
  const conflictsWith = conflictChecker(chosen);
  for (const candidate of first) {
    if (!allowed(candidate) || conflictsWith(candidate).length > 0) continue;
    const found = firstFit([...chosen, candidate], rest, allowed);
    if (found) return found;
  }
  return null;
}

/** Throws if a course's link IDs don't fit the convention defaultSectionSet relies on. */
export function checkLinks(course: TermCourse) {
  const types = new Map<string, Set<string>>();
  for (const section of course.sections) {
    const group = linkGroup(section);
    if (group === null) continue;
    if (section.linkId?.[0] !== section.number[0])
      throw new Error(
        `${course.code} ${section.number}: link ID ${section.linkId}`,
      );
    types.set(group, (types.get(group) ?? new Set()).add(section.type));
  }
  for (const [group, inGroup] of types) {
    if (inGroup.size < 2)
      throw new Error(
        `${course.code}: link group ${group} only has ${[...inGroup].join(", ")}`,
      );
  }
}
