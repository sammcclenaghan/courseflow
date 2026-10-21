/**
 * Lays out one day's classes, sorted by start time. Classes that overlap
 * share the day's width side by side: each gets a `column`, and `columns`
 * is how many its overlapping group needs. A class that starts once every
 * earlier one has ended takes the full width again.
 */
export function sideBySide<T extends { start: number; end: number }>(
  classes: T[],
): (T & { column: number; columns: number })[] {
  const laidOut: (T & { column: number; columns: number })[] = [];
  let group: (T & { column: number; columns: number })[] = [];
  let ends: number[] = []; // when each column of the group is next free
  for (const item of classes) {
    if (ends.length > 0 && ends.every((end) => end <= item.start)) {
      for (const placed of group) placed.columns = ends.length;
      laidOut.push(...group);
      group = [];
      ends = [];
    }
    const free = ends.findIndex((end) => end <= item.start);
    const column = free === -1 ? ends.length : free;
    ends[column] = item.end;
    group.push({ ...item, column, columns: 1 });
  }
  for (const placed of group) placed.columns = ends.length;
  return [...laidOut, ...group];
}
