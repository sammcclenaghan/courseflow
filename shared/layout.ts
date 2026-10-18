import { type Occurrence, occurrences, overlapsAnother } from "./conflicts.ts";
import type { Section } from "./model.ts";

/** Where a class sits in its day column, as fractions of the column's width. */
export type Placed<T> = T & {
  left: number;
  width: number;
  /** Later-starting groups draw on top. */
  z: number;
  /** Something starting later sits on this class, so only a strip shows. */
  covered: boolean;
};

const NEAR = 30;
const INDENT = 0.4;
const MAX_INDENT = 0.6;

/**
 * Google Calendar's rule. Classes that overlap form a cluster. Within it,
 * classes starting less than 30 minutes after a group's first class share the
 * width side by side; a later group is indented 40% (at most 60%) and drawn
 * on top, so a staggered conflict visibly lands partway through. Classes that
 * only touch (10:20 end, 10:20 start) don't overlap and get the full width.
 */
export function layoutDay<T extends { start: number; end: number }>(
  events: readonly T[],
): Placed<T>[] {
  const sorted = events.toSorted((a, b) => a.start - b.start || b.end - a.end);
  const placed: Placed<T>[] = [];
  let cluster: T[] = [];
  let clusterEnd = -1;
  for (const event of sorted) {
    if (event.start >= clusterEnd && cluster.length > 0) {
      placed.push(...placeCluster(cluster));
      cluster = [];
    }
    cluster.push(event);
    clusterEnd = Math.max(clusterEnd, event.end);
  }
  if (cluster.length > 0) placed.push(...placeCluster(cluster));
  return placed;
}

function placeCluster<T extends { start: number; end: number }>(
  cluster: T[],
): Placed<T>[] {
  const groups: T[][] = [];
  for (const event of cluster) {
    const group = groups.at(-1);
    if (group && event.start - group[0].start < NEAR) group.push(event);
    else groups.push([event]);
  }
  return groups.flatMap((group, k) => {
    const left = Math.min(k * INDENT, MAX_INDENT);
    const width = (1 - left) / group.length;
    const later = groups.slice(k + 1).flat();
    return group.map((event, i) => ({
      ...event,
      left: left + i * width,
      width,
      z: k + 1,
      covered: later.some((other) => other.start < event.end),
    }));
  });
}

/** A class on the grid, flagged when it conflicts with another on its date. */
export type DayEvent = Placed<Occurrence & { conflicting: boolean }>;

/**
 * The week starting `monday` (a dayNumber) as five laid-out day columns,
 * Monday to Friday. Weekend classes and untimed meetings aren't on the grid.
 */
export function weekDays(
  sections: readonly Section[],
  monday: number,
): DayEvent[][] {
  const days: Occurrence[][] = [[], [], [], [], []];
  for (const section of sections) {
    for (const occurrence of occurrences(section)) {
      const i = occurrence.day - monday;
      if (i >= 0 && i < 5) days[i].push(occurrence);
    }
  }
  return days.map((day) =>
    layoutDay(day.map((o) => ({ ...o, conflicting: overlapsAnother(o, day) }))),
  );
}
