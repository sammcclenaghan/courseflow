import { dayNumber, mondayOf, weekday } from "./dates.ts";
import type { Section } from "./model.ts";
import { occurrences } from "./occurrences.ts";

// A block is one weekday and time, with a bit for each week it meets.
type Block = { day: number; start: number; end: number; weeks: number };
type Blocks = { firstWeek: number; blocks: Block[] };

// Keep the bitmask's week encoding local to the conflict hot path.
const FIRST_MONDAY = dayNumber("1970-01-05");
const weekOf = (day: number) => (mondayOf(day) - FIRST_MONDAY) / 7;
const dateOf = (week: number, weekday: number) =>
  FIRST_MONDAY + week * 7 + ((weekday + 6) % 7);

const compiled = new WeakMap<Section, Blocks>();

function blocksOf(section: Section): Blocks {
  const cached = compiled.get(section);
  if (cached) return cached;
  const dated = occurrences(section);
  const firstWeek = dated.length > 0 ? weekOf(dated[0].day) : 0;
  const byTime = new Map<string, Block>();
  for (const { day, start, end } of dated) {
    const key = `${weekday(day)} ${start} ${end}`;
    const block = byTime.get(key) ?? {
      day: weekday(day),
      start,
      end,
      weeks: 0,
    };
    block.weeks |= 1 << (weekOf(day) - firstWeek);
    byTime.set(key, block);
  }
  const result = { firstWeek, blocks: [...byTime.values()] };
  compiled.set(section, result);
  return result;
}

type Shared = { weekday: number; weeks: number; firstWeek: number };

/** The weekdays and times two sections both meet, with the weeks they share. */
function sharedWeeks(a: Section, b: Section): Shared[] {
  if (a.crn === b.crn) return [];
  let early = blocksOf(a);
  let late = blocksOf(b);
  if (early.firstWeek > late.firstWeek) [early, late] = [late, early];
  const shift = late.firstWeek - early.firstWeek;
  /** Sections over 31 weeks apart can't share a date. */
  if (shift > 31) return [];
  const shared: Shared[] = [];
  for (const x of early.blocks)
    for (const y of late.blocks) {
      if (x.day !== y.day || x.start >= y.end || y.start >= x.end) continue;
      const weeks = x.weeks & (y.weeks << shift);
      if (weeks !== 0)
        shared.push({ weekday: x.day, weeks, firstWeek: early.firstWeek });
    }
  return shared;
}

/** Whether two sections ever meet at overlapping times on the same date. */
export const conflicts = (a: Section, b: Section) =>
  sharedWeeks(a, b).length > 0;

/** Every date two sections meet at overlapping times, ascending. */
function conflictDays(a: Section, b: Section): number[] {
  const days = new Set<number>();
  for (const { weekday, weeks, firstWeek } of sharedWeeks(a, b))
    for (let week = 0; week < 32; week++)
      if (weeks & (1 << week)) days.add(dateOf(firstWeek + week, weekday));
  return [...days].sort((p, q) => p - q);
}

type Conflict = {
  a: Section;
  b: Section;
  days: number[];
  /** Some labs really meet every other week, but Banner lists them as weekly. */
  alternateWeeks: boolean;
};

const alternates = (section: Section) => /alternat/i.test(section.note ?? "");

/** Every conflicting pair, ordered by CRN. Back-to-back classes don't conflict. */
export function findConflicts(sections: Section[]): Conflict[] {
  const unique = [...new Map(sections.map((s) => [s.crn, s])).values()];
  unique.sort((x, y) => (x.crn < y.crn ? -1 : 1));
  const found: Conflict[] = [];
  for (const [i, a] of unique.entries())
    for (const b of unique.slice(i + 1)) {
      const days = conflictDays(a, b);
      if (days.length > 0)
        found.push({
          a,
          b,
          days,
          alternateWeeks: alternates(a) || alternates(b),
        });
    }
  return found;
}

/** The schedule's sections that conflict with a candidate, for a section picker. */
export function conflictChecker(schedule: readonly Section[]) {
  return (candidate: Section): Section[] =>
    schedule.filter((section) => conflicts(section, candidate));
}
