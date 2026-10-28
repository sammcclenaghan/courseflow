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

/**
 * The lowest-numbered section of each type that can be taken with the
 * lowest section overall. A link ID's number pairs sections: lecture A1
 * goes with tutorials T1, and lecture A2 with tutorials T2.
 */
export function lowestSections(sections: Section[]): Section[] {
  const group = sections[0].linkId?.slice(1);
  const picks = new Map<string, Section>();
  for (const section of sections) {
    const fits = !section.linkId || section.linkId.slice(1) === group;
    if (fits && !picks.has(section.type)) picks.set(section.type, section);
  }
  return [...picks.values()];
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
