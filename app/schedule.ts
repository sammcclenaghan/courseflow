import { signal } from "@preact/signals";
import type { Meeting, Section, TermSections } from "../catalog/terms.ts";
import { addDays, monday, weekday } from "./dates.ts";

export type Entry = { code: string; crns: string[] };

/** A section meeting on a date. */
export type Occurrence = {
  date: string;
  code: string;
  section: Section;
  time: NonNullable<Meeting["time"]>;
};

export const schedules = signal<Record<string, Entry[]>>({});

export function add(term: string, code: string, sections: Section[]) {
  const entries = schedules.value[term] ?? [];
  if (entries.some((entry) => entry.code === code)) return;
  const crns = lowestSections(sections).map((section) => section.crn);
  schedules.value = {
    ...schedules.value,
    [term]: [...entries, { code, crns }],
  };
}

/** The lowest section of each type that goes with the lowest one overall. */
export function lowestSections(sections: Section[]): Section[] {
  const picks = new Map<string, Section>();
  for (const section of sections)
    if (goesWith(section, sections[0]) && !picks.has(section.type))
      picks.set(section.type, section);
  return [...picks.values()];
}

/**
 * The lecture is a course's leading type, the type of its first section,
 * and its group decides which other sections can be taken with it.
 */
function goesWith(section: Section, lecture: Section) {
  return !section.group || section.group === lecture.group;
}

/** Any lecture can be chosen; anything else must go with the lecture. */
export function canChoose(
  choice: Section,
  picks: Section[],
  sections: Section[],
): boolean {
  if (choice.type === sections[0].type) return true;
  const lecture = picks.find((pick) => pick.type === sections[0].type);
  return lecture !== undefined && goesWith(choice, lecture);
}

/**
 * A schedule after choosing a section. A new lecture keeps the picks that
 * still go with it and drops the rest, to be picked again, so nothing is
 * ever chosen for you.
 */
export function withChoice(
  entries: Entry[],
  code: string,
  choice: Section,
  sections: TermSections,
): Entry[] {
  return entries.map((entry) => {
    if (entry.code !== code) return entry;
    const picks = picked(entry, sections);
    if (!canChoose(choice, picks, sections[code])) return entry;
    const kept = picks.filter(
      (pick) =>
        pick.type !== choice.type &&
        (choice.type !== sections[code][0].type || goesWith(pick, choice)),
    );
    return { code, crns: [...kept, choice].map((section) => section.crn) };
  });
}

export function choose(
  term: string,
  code: string,
  choice: Section,
  sections: TermSections,
) {
  const entries = schedules.value[term] ?? [];
  schedules.value = {
    ...schedules.value,
    [term]: withChoice(entries, code, choice, sections),
  };
}

/** The types the lecture's group has that nothing is picked for yet. */
export function missingTypes(picks: Section[], sections: Section[]): string[] {
  const lecture = picks.find((pick) => pick.type === sections[0].type);
  if (!lecture) return [];
  const needed = sections
    .filter((section) => goesWith(section, lecture))
    .map((section) => section.type);
  return [...new Set(needed)].filter(
    (type) => !picks.some((pick) => pick.type === type),
  );
}

export function picked({ code, crns }: Entry, sections: TermSections) {
  return sections[code].filter((section) => crns.includes(section.crn));
}

/** Everything a schedule meets on a date, in time order. */
export function occurrences(
  entries: Entry[],
  sections: TermSections,
  date: string,
): Occurrence[] {
  const day = weekday(date);
  return entries
    .flatMap((entry) =>
      picked(entry, sections).flatMap((section) =>
        section.meetings.flatMap(({ time, days, startDate, endDate }) =>
          time && days.includes(day) && startDate <= date && date <= endDate
            ? [{ date, code: entry.code, section, time }]
            : [],
        ),
      ),
    )
    .sort((a, b) => a.time.start - b.time.start);
}

/** Two occurrences on the same date whose times overlap. */
export type Conflict = [Occurrence, Occurrence];

/** The conflicts among one day's occurrences. */
export function conflictsOn(day: Occurrence[]): Conflict[] {
  const found: Conflict[] = [];
  // Strict, so a class ending at 10:20 fits one starting at 10:20.
  for (const [index, a] of day.entries())
    for (const b of day.slice(index + 1))
      if (
        a.section.crn !== b.section.crn &&
        a.time.start < b.time.end &&
        b.time.start < a.time.end
      )
        found.push([a, b]);
  return found;
}

/** Every conflict on every day the schedule's classes run. */
export function conflicts(
  entries: Entry[],
  sections: TermSections,
): Conflict[] {
  const dates = span(entries, sections);
  if (!dates) return [];
  const found: Conflict[] = [];
  for (let date = dates.start; date <= dates.end; date = addDays(date, 1))
    found.push(...conflictsOn(occurrences(entries, sections, date)));
  return found;
}

/**
 * The Monday to open the calendar on: this week while the schedule's
 * classes run, otherwise the week they start.
 */
export function openingWeek(
  entries: Entry[],
  sections: TermSections,
  today: string,
): string | null {
  const dates = span(entries, sections);
  if (!dates) return null;
  const { start, end } = dates;
  return monday(start <= today && today <= end ? today : start);
}

/** The first and last day the schedule's classes meet. */
function span(entries: Entry[], sections: TermSections) {
  const meetings = entries
    .flatMap((entry) => picked(entry, sections))
    .flatMap((section) => section.meetings)
    .filter((meeting) => meeting.time);
  if (meetings.length === 0) return null;
  return {
    start: meetings.map((meeting) => meeting.startDate).sort()[0],
    end: meetings.map((meeting) => meeting.endDate).sort()[meetings.length - 1],
  };
}
