import { computed, signal } from "@preact/signals";
import {
  findConflicts,
  type Occurrence,
  occurrences,
} from "../catalog/conflicts.ts";
import { dayNumber, mondayOf, weekday } from "../catalog/dates.ts";
import { weekDays } from "../catalog/layout.ts";
import { catalog } from "./catalog.ts";
import { selectedCourses, selectedSections } from "./schedule.ts";

const now = new Date();
const today = dayNumber(
  [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-"),
);

/** The term's usual dates: the most common meeting date range ("Sep 9 – Dec 7"). */
const termDates = computed(() => {
  const c = catalog.value;
  if (c.kind !== "ok") return null;
  const counts = new Map<string, number>();
  for (const course of c.data.courses)
    for (const section of course.sections)
      for (const { start, startDate, endDate } of section.meetings)
        if (start !== null) {
          const range = `${startDate}/${endDate}`;
          counts.set(range, (counts.get(range) ?? 0) + 1);
        }
  const [common] = [...counts].sort((a, b) => b[1] - a[1]);
  if (!common) return null;
  const [first, last] = common[0].split("/").map(dayNumber);
  return { first, last };
});

/**
 * The Mondays you can move between: the term's weeks, stretched to cover
 * any selected class that runs outside them.
 */
export const weekRange = computed(() => {
  const term = termDates.value;
  let first = term?.first ?? today;
  let last = term?.last ?? today;
  for (const section of selectedSections.value)
    for (const { day } of occurrences(section)) {
      if (day < first) first = day;
      if (day > last) last = day;
    }
  return { first: mondayOf(first), last: mondayOf(last) };
});

const chosen = signal<number | null>(null);

/** The Monday on screen: this week by default, kept inside weekRange. */
export const week = computed(() => {
  const { first, last } = weekRange.value;
  return Math.min(Math.max(chosen.value ?? mondayOf(today), first), last);
});

export const isFirstWeek = computed(() => week.value === weekRange.value.first);
export const isLastWeek = computed(() => week.value === weekRange.value.last);

export const showToday = () => {
  chosen.value = mondayOf(today);
};
export const showPreviousWeek = () => {
  chosen.value = week.value - 7;
};
export const showNextWeek = () => {
  chosen.value = week.value + 7;
};

/** Monday to Friday of the week on screen, each laid out for drawing. */
export const days = computed(() =>
  weekDays(selectedSections.value, week.value),
);

/** Each selected section's colour, from its course. */
export const colorByCrn = computed(
  () =>
    new Map(
      selectedCourses.value.flatMap(({ sections, colour }) =>
        sections.map((s) => [s.crn, colour] as const),
      ),
    ),
);

/**
 * The grid runs 8 AM to 8 PM, and later only when a selected weekday class
 * ends after 8 PM somewhere in the term.
 */
export const gridEnd = computed(() => {
  let latest = 20 * 60;
  for (const section of selectedSections.value)
    for (const { day, end } of occurrences(section))
      if (weekday(day) >= 1 && weekday(day) <= 5)
        latest = Math.max(latest, end);
  return Math.ceil(latest / 60) * 60;
});

export const GRID_START = 8 * 60;

/** The Monday of today's week, for "This week". */
export const thisWeek = mondayOf(today);

export const showWeek = (monday: number) => {
  chosen.value = monday;
};

/** Every week you can move to, laid out, for the Weeks overlay. */
export const weeks = computed(() => {
  const { first, last } = weekRange.value;
  const out: { monday: number; days: ReturnType<typeof weekDays> }[] = [];
  for (let monday = first; monday <= last; monday += 7)
    out.push({ monday, days: weekDays(selectedSections.value, monday) });
  return out;
});

export const conflicts = computed(() => findConflicts(selectedSections.value));

const keyOf = (o: Occurrence) => `${o.section.crn} ${o.day} ${o.start}`;

/** The classes that overlap another on their date, as keys for `isConflicting`. */
const conflicting = computed(() => {
  const keys = new Set<string>();
  for (const { a, b, days } of conflicts.value) {
    const shared = new Set(days);
    for (const x of occurrences(a))
      if (shared.has(x.day))
        for (const y of occurrences(b))
          if (y.day === x.day && x.start < y.end && y.start < x.end) {
            keys.add(keyOf(x));
            keys.add(keyOf(y));
          }
  }
  return keys;
});

export const isConflicting = (o: Occurrence) => conflicting.value.has(keyOf(o));
