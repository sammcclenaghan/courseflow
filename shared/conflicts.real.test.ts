// Every pair of real sections, against a deliberately naive reference that
// walks the calendar one day at a time. Hand-written cases miss bugs in the
// week masks that this catches.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { conflicts, findConflicts } from "./conflicts";
import type { TermFile } from "./model";

const file = JSON.parse(
  readFileSync("public/data/terms/202609.json", "utf8"),
) as TermFile;
const sections = file.courses.flatMap((course) => course.sections);
const n = sections.length;

// Reference: for each real date, which timed classes happen, then every
// overlapping pair on that date. Pairs are numbered i * n + j (i < j) and
// dates are whole days, so nothing here builds strings.
function naiveConflicts() {
  const byDate = new Map<number, { i: number; start: number; end: number }[]>();
  sections.forEach((section, i) => {
    for (const m of section.meetings) {
      if (m.start === null || m.end === null) continue;
      const last = Date.parse(`${m.endDate}T00:00:00Z`);
      for (
        let t = Date.parse(`${m.startDate}T00:00:00Z`);
        t <= last;
        t += 86_400_000
      ) {
        if (!m.days.includes(new Date(t).getUTCDay())) continue;
        const day = t / 86_400_000;
        const list = byDate.get(day) ?? [];
        list.push({ i, start: m.start, end: m.end });
        byDate.set(day, list);
      }
    }
  });
  const pairs = new Map<number, Set<number>>();
  for (const [day, list] of byDate)
    for (const x of list)
      for (const y of list) {
        if (x.i >= y.i || x.start >= y.end || y.start >= x.end) continue;
        const key = x.i * n + y.i;
        pairs.set(key, (pairs.get(key) ?? new Set()).add(day));
      }
  return pairs;
}

describe("conflicts on every real 202609 section pair", {
  timeout: 30_000,
}, () => {
  const expected = naiveConflicts();

  it("agrees with the day-by-day reference on all pairs", () => {
    let wrong = 0;
    for (let i = 0; i < n; i++)
      for (let j = i + 1; j < n; j++)
        if (conflicts(sections[i], sections[j]) !== expected.has(i * n + j))
          wrong++;
    expect(wrong).toBe(0);
    expect(expected.size).toBeGreaterThan(100_000);
  });

  it("lists exactly the reference's dates for every conflicting pair", () => {
    let wrong = 0;
    for (const [key, days] of expected) {
      const [found] = findConflicts([
        sections[Math.floor(key / n)],
        sections[key % n],
      ]);
      if (found?.days.join() !== [...days].sort((a, b) => a - b).join())
        wrong++;
    }
    expect(wrong).toBe(0);
  });
});
