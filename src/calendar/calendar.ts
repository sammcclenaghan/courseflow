import { computed, signal } from "@preact/signals";
import { findConflicts } from "../../shared/conflicts.ts";
import { dayNumber, mondayOf, weekday } from "../../shared/dates.ts";
import { type DayEvent, weekDays } from "../../shared/layout.ts";
import { occurrences } from "../../shared/occurrences.ts";
import { catalog } from "../catalog.ts";
import { selectedCourses, selectedSections } from "../schedule/schedule.ts";

const now = new Date();
const today = dayNumber(
  [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-"),
);

/**
 * The Mondays you can move between: the term's weeks, stretched to cover
 * any selected class that runs outside them.
 */
const weekRange = computed(() => {
  const c = catalog.value;
  let first = c.kind === "ok" ? dayNumber(c.data.startDate) : today;
  let last = c.kind === "ok" ? dayNumber(c.data.endDate) : today;
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

/** Each selected section's color, from its course. */
export const colorByCrn = computed(
  () =>
    new Map(
      selectedCourses.value.flatMap(({ sections, color }) =>
        sections.map((s) => [s.crn, color] as const),
      ),
    ),
);

export const gridEnd = computed(() => {
  let latest = 20 * 60;
  for (const section of selectedSections.value)
    for (const { day, end } of occurrences(section))
      if (weekday(day) >= 1 && weekday(day) <= 5)
        latest = Math.max(latest, end);
  return Math.ceil(latest / 60) * 60;
});

export const GRID_START = 8 * 60;

/** The hour lines between the grid's top and bottom, in minutes. */
export const hourLines = computed(() => {
  const lines: number[] = [];
  for (let m = GRID_START + 60; m < gridEnd.value; m += 60) lines.push(m);
  return lines;
});

/** How far down the grid a time sits, as a percentage. */
export const gridPercent = (minutes: number) =>
  ((minutes - GRID_START) / (gridEnd.value - GRID_START)) * 100;

/** The Monday of today's week, for "This week". */
export const thisWeek = mondayOf(today);

export const showWeek = (monday: number) => {
  chosen.value = monday;
};

/** Every week you can move to, laid out, for the Weeks overlay. */
export const weeks = computed(() => {
  const { first, last } = weekRange.value;
  const out: { monday: number; days: DayEvent[][] }[] = [];
  for (let monday = first; monday <= last; monday += 7)
    out.push({ monday, days: weekDays(selectedSections.value, monday) });
  return out;
});

export const conflicts = computed(() => findConflicts(selectedSections.value));
