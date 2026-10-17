import type { Section, TermCourse } from "./model.ts";

// UVic link IDs are a section letter plus a group number: lecture A1 goes with
// lab B1 and tutorial T1, A2 with B2. Banner's own rules aren't in the bulk
// search results, so this is inferred, and checkLinks makes the build fail if
// the data ever stops fitting it.
const linkGroup = (section: Section) => section.linkId?.slice(1) ?? null;

/**
 * The lowest-numbered section, plus the lowest of each other type in its link
 * group. MECH580's A01 (A1) gets B01 (B1) but no tutorial, since its only
 * tutorials link to other lectures. Unlinked courses get the lowest of each type.
 */
export function defaultSections(course: TermCourse): Section[] {
  const [first, ...rest] = course.sections.toSorted((a, b) =>
    a.section < b.section ? -1 : 1,
  );
  if (!first) return [];
  const picked = new Map([[first.scheduleType, first]]);
  for (const section of rest) {
    if (
      !picked.has(section.scheduleType) &&
      linkGroup(section) === linkGroup(first)
    )
      picked.set(section.scheduleType, section);
  }
  return [...picked.values()];
}

/** Throws if a course's link IDs don't fit the convention defaultSections relies on. */
export function checkLinks(course: TermCourse) {
  const types = new Map<string, Set<string>>();
  for (const section of course.sections) {
    const group = linkGroup(section);
    if (group === null) continue;
    if (section.linkId?.[0] !== section.section[0])
      throw new Error(
        `${course.code} ${section.section}: link ID ${section.linkId}`,
      );
    types.set(group, (types.get(group) ?? new Set()).add(section.scheduleType));
  }
  for (const [group, inGroup] of types) {
    if (inGroup.size < 2)
      throw new Error(
        `${course.code}: link group ${group} only has ${[...inGroup].join(", ")}`,
      );
  }
}
