import { dayNumber, forEachDate } from "./dates.ts";
import type { Section } from "./model.ts";

/** One dated meeting: day is a day number, times are minutes after midnight. */
export type Occurrence = {
  section: Section;
  day: number;
  start: number;
  end: number;
};

// Catalog sections are immutable once loaded. Reuse their expansion across views and checks.
const occurrenceCache = new WeakMap<Section, Occurrence[]>();

/** Every timed meeting of a section, ordered by date and then start time. */
export function occurrences(section: Section): Occurrence[] {
  const cached = occurrenceCache.get(section);
  if (cached) return cached;

  const meetings: Occurrence[] = [];
  for (const { days, start, end, startDate, endDate } of section.meetings) {
    if (start === null || end === null) continue;
    forEachDate(dayNumber(startDate), dayNumber(endDate), days, (day) => {
      meetings.push({ section, day, start, end });
    });
  }
  meetings.sort((a, b) => a.day - b.day || a.start - b.start);
  occurrenceCache.set(section, meetings);
  return meetings;
}
