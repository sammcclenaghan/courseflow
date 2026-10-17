import { dayNumber, weekday } from "./dates.ts";
import type { Section } from "./model.ts";

export type Occurrence = {
  section: Section;
  day: number;
  start: number;
  end: number;
};

// Catalog sections never change once loaded, so each is expanded once.
const expanded = new WeakMap<Section, Occurrence[]>();

/**
 * Every date and time a section meets, sorted by day then start. The calendar
 * and the clash check both read this, so they always agree. Meetings without
 * a set time are left out: they can't be drawn and never clash.
 */
export function occurrences(section: Section): Occurrence[] {
  const cached = expanded.get(section);
  if (cached) return cached;
  const out: Occurrence[] = [];
  for (const { days, start, end, startDate, endDate } of section.meetings) {
    if (start === null || end === null) continue;
    const first = dayNumber(startDate);
    const last = dayNumber(endDate);
    for (const day of days) {
      for (let d = first + ((day - weekday(first) + 7) % 7); d <= last; d += 7)
        out.push({ section, day: d, start, end });
    }
  }
  out.sort((a, b) => a.day - b.day || a.start - b.start);
  expanded.set(section, out);
  return out;
}

export type Clash = {
  /** The pair, ordered by CRN. */
  a: Section;
  b: Section;
  /** Every date they overlap, ascending. */
  days: number[];
  /**
   * A note says one of them meets on alternate weeks, which the data doesn't
   * say. It's checked as weekly, so it may not clash on every listed date.
   */
  alternateWeeks: boolean;
};

const alternates = (section: Section) => /alternat/i.test(section.note ?? "");

/**
 * Every pair of sections that meet at overlapping times on the same date.
 * Back-to-back classes (one ends at 10:20, the next starts at 10:20) don't
 * clash. A sweep over the dates, so it's O(n log n) in occurrences.
 */
export function findClashes(sections: Section[]): Clash[] {
  const all = sections
    .flatMap(occurrences)
    .sort((x, y) => x.day - y.day || x.start - y.start);
  const pairs = new Map<string, Clash>();
  let active: Occurrence[] = [];
  let today = Number.NaN;
  for (const occurrence of all) {
    if (occurrence.day !== today) {
      today = occurrence.day;
      active = [];
    }
    active = active.filter((other) => other.end > occurrence.start);
    for (const other of active) {
      if (other.section.crn === occurrence.section.crn) continue;
      const [a, b] =
        other.section.crn < occurrence.section.crn
          ? [other.section, occurrence.section]
          : [occurrence.section, other.section];
      const key = `${a.crn}|${b.crn}`;
      let clash = pairs.get(key);
      if (!clash) {
        clash = {
          a,
          b,
          days: [],
          alternateWeeks: alternates(a) || alternates(b),
        };
        pairs.set(key, clash);
      }
      if (clash.days.at(-1) !== today) clash.days.push(today);
    }
    active.push(occurrence);
  }
  return [...pairs.values()];
}

/**
 * For checking many candidates against one schedule, as a section picker
 * does: the schedule's classes are indexed by day once, so each candidate is
 * compared only with classes on its own dates. Same rule as findClashes.
 */
export function clashChecker(schedule: Section[]) {
  const byDay = new Map<number, Occurrence[]>();
  for (const occurrence of schedule.flatMap(occurrences)) {
    const day = byDay.get(occurrence.day);
    if (day) day.push(occurrence);
    else byDay.set(occurrence.day, [occurrence]);
  }
  /** The schedule's sections that clash with `candidate`. */
  return (candidate: Section): Section[] => {
    const hits = new Set<Section>();
    for (const { day, start, end } of occurrences(candidate)) {
      for (const other of byDay.get(day) ?? []) {
        if (
          other.section.crn !== candidate.crn &&
          other.start < end &&
          start < other.end
        )
          hits.add(other.section);
      }
    }
    return [...hits];
  };
}
