import { describe, expect, it } from "vitest";
import { dayNumber } from "./dates";
import { occurrences } from "./occurrences";
import { meeting, testSection } from "./testing";

describe("occurrences", () => {
  it("expands meeting rules into dated meetings in chronological order", () => {
    const section = testSection("10001", {
      meetings: [
        meeting("Mon Wed", "14:00-15:00", "2026-09-09", "2026-09-16"),
        meeting("Wed", "09:00-10:00", "2026-09-09", "2026-09-09"),
      ],
    });
    expect(occurrences(section)).toEqual([
      { section, day: dayNumber("2026-09-09"), start: 540, end: 600 },
      { section, day: dayNumber("2026-09-09"), start: 840, end: 900 },
      { section, day: dayNumber("2026-09-14"), start: 840, end: 900 },
      { section, day: dayNumber("2026-09-16"), start: 840, end: 900 },
    ]);
  });

  it("skips meetings missing either time and sections without meetings", () => {
    const timed = meeting("Mon", "10:00-11:00");
    const section = testSection("10001", {
      meetings: [
        meeting("Mon", null),
        { ...timed, start: null },
        { ...timed, end: null },
      ],
    });
    expect(occurrences(section)).toEqual([]);
    expect(occurrences(testSection("10002"))).toEqual([]);
  });

  it("includes weekend meetings and preserves overlapping meetings", () => {
    const section = testSection("10001", {
      meetings: [
        meeting("Sat", "09:00-12:00", "2026-10-03", "2026-10-03"),
        meeting("Sat", "11:00-13:00", "2026-10-03", "2026-10-03"),
      ],
    });
    expect(occurrences(section)).toEqual([
      { section, day: dayNumber("2026-10-03"), start: 540, end: 720 },
      { section, day: dayNumber("2026-10-03"), start: 660, end: 780 },
    ]);
  });

  it("reuses expansions by section identity, including empty results", () => {
    const section = testSection("10001", {
      meetings: [meeting("Mon", "10:00-11:00")],
    });
    const expanded = occurrences(section);
    expect(occurrences(section)).toBe(expanded);

    const other = { ...section };
    expect(occurrences(other)).not.toBe(expanded);
    expect(occurrences(other).every((event) => event.section === other)).toBe(
      true,
    );

    const empty = testSection("10002");
    expect(occurrences(empty)).toBe(occurrences(empty));
  });
});
