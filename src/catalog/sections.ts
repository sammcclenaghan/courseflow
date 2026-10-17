import { clashChecker } from "./clashes.ts";
import type { Section, TermCourse } from "./model.ts";

// UVic link IDs are a section letter plus a group number: lecture A1 goes with
// lab B1 and tutorial T1, A2 with B2. Banner's own rules aren't in the bulk
// search results, so this is inferred, and checkLinks makes the build fail if
// the data ever stops fitting it.
const linkGroup = (section: Section) => section.linkId?.slice(1) ?? null;

/**
 * The lowest-numbered sections that work together: a lead section (usually
 * the lowest lecture) plus the lowest of each other type in its link group,
 * skipping any that clash with what's already picked. CSC110's A01 gets B02,
 * since B01 overlaps it. MECH580's A01 (A1) gets B01 (B1) but no tutorial,
 * since its only tutorials link to other lectures.
 *
 * Given the rest of a schedule, it prefers sections that also fit around it,
 * but never refuses: if nothing fits, it falls back to the course alone, and
 * if even that can't avoid a clash, to the lowest sections, clash and all.
 */
export function defaultSections(
  course: TermCourse,
  schedule: readonly Section[] = [],
): Section[] {
  const sorted = course.sections.toSorted((a, b) =>
    a.number < b.number ? -1 : 1,
  );
  if (sorted.length === 0) return [];
  const leadType = sorted[0].type;
  const leads = sorted.filter((s) => s.type === leadType);
  const otherTypes = [...new Set(sorted.map((s) => s.type))].filter(
    (type) => type !== leadType,
  );
  const partners = (lead: Section) =>
    otherTypes
      .map((type) =>
        sorted.filter(
          (s) => s.type === type && linkGroup(s) === linkGroup(lead),
        ),
      )
      .filter((options) => options.length > 0);

  const search = (busy?: (section: Section) => Section[]) => {
    for (const lead of leads) {
      if (busy?.(lead).length) continue;
      const found = firstFit([lead], partners(lead), busy);
      if (found) return found;
    }
    return null;
  };
  return (
    (schedule.length > 0 ? search(clashChecker([...schedule])) : null) ??
    search() ?? [leads[0], ...partners(leads[0]).map((options) => options[0])]
  );
}

// Fills one section of each remaining type, lowest first, backtracking when a
// choice leaves a later type nothing that fits.
function firstFit(
  chosen: Section[],
  options: Section[][],
  busy?: (section: Section) => Section[],
): Section[] | null {
  if (options.length === 0) return chosen;
  const clashesWith = clashChecker(chosen);
  for (const candidate of options[0]) {
    if (clashesWith(candidate).length || busy?.(candidate).length) continue;
    const found = firstFit([...chosen, candidate], options.slice(1), busy);
    if (found) return found;
  }
  return null;
}

/** Throws if a course's link IDs don't fit the convention defaultSections relies on. */
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
