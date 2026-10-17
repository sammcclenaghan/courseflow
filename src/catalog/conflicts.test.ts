import { describe, expect, it } from "vitest";
import { conflictChecker, findConflicts, occurrences } from "./conflicts";
import { dayNumber, weekday } from "./dates";
import type { Section } from "./model";
import { meeting, testSection } from "./testing";

const at = (crn: string, ...meetings: ReturnType<typeof meeting>[]) =>
  testSection(crn, { meetings });

const conflictDays = (...sections: Section[]) =>
  findConflicts(sections).map((c) => c.days);

const MONDAYS = 13; // Sep 14 … Dec 7, 2026

describe("findConflicts", () => {
  it("lists every date two overlapping sections share", () => {
    const [conflict] = findConflicts([
      at("10001", meeting("Mon Wed", "10:30-11:20")),
      at("10002", meeting("Mon", "11:00-11:50")),
    ]);
    expect(conflict.days).toHaveLength(MONDAYS);
    expect(conflict.days[0]).toBe(dayNumber("2026-09-14"));
    expect(conflict.days.at(-1)).toBe(dayNumber("2026-12-07"));
  });

  it("lets back-to-back classes touch", () => {
    expect(
      conflictDays(
        at("10001", meeting("Mon", "10:30-11:20")),
        at("10002", meeting("Mon", "11:20-12:10")),
      ),
    ).toEqual([]);
  });

  it("ignores the same time on different weekdays", () => {
    expect(
      conflictDays(
        at("10001", meeting("Mon Wed", "10:30-11:20")),
        at("10002", meeting("Tue Thu", "10:30-11:20")),
      ),
    ).toEqual([]);
  });

  it("ignores partial-term sections whose dates never meet", () => {
    expect(
      conflictDays(
        at("10001", meeting("Mon", "10:30-11:20", "2026-09-09", "2026-10-23")),
        at("10002", meeting("Mon", "10:30-11:20", "2026-10-26", "2026-12-07")),
      ),
    ).toEqual([]);
  });

  it("conflicts only on the weeks partial-term dates share", () => {
    expect(
      conflictDays(
        at("10001", meeting("Mon", "10:30-11:20")),
        at("10002", meeting("Mon", "10:30-11:20", "2026-11-02", "2026-11-30")),
      ),
    ).toEqual([
      [
        "2026-11-02",
        "2026-11-09",
        "2026-11-16",
        "2026-11-23",
        "2026-11-30",
      ].map(dayNumber),
    ]);
  });

  it("catches a one-day meeting", () => {
    expect(
      conflictDays(
        at("10001", meeting("Mon Wed", "10:30-11:20")),
        at("10002", meeting("Wed", "10:00-12:00", "2026-11-04", "2026-11-04")),
      ),
    ).toEqual([[dayNumber("2026-11-04")]]);
  });

  it("never conflicts a meeting without a set time", () => {
    const untimed = at("10001", meeting("Mon", null));
    expect(occurrences(untimed)).toEqual([]);
    expect(
      conflictDays(untimed, at("10002", meeting("Mon", "10:30-11:20"))),
    ).toEqual([]);
  });

  // ANTH398 A01 meets Tue 2:30-4:20 and Fri 2:30-3:20.
  it("checks each meeting of a multi-meeting section", () => {
    const [days] = conflictDays(
      at("10001", meeting("Tue", "14:30-16:20"), meeting("Fri", "14:30-15:20")),
      at("10002", meeting("Fri", "15:00-15:50")),
    );
    expect(days).toHaveLength(13);
    expect(days.every((day) => weekday(day) === 5)).toBe(true);
  });

  it("lists a date once even when several meetings overlap on it", () => {
    const [days] = conflictDays(
      at("10001", meeting("Mon", "10:00-11:00"), meeting("Mon", "10:30-11:30")),
      at("10002", meeting("Mon", "10:45-11:00")),
    );
    expect(days).toHaveLength(MONDAYS);
    expect(new Set(days).size).toBe(MONDAYS);
  });

  it("includes weekend meetings", () => {
    expect(
      conflictDays(
        at("10001", meeting("Sat", "09:00-12:00", "2026-10-03", "2026-10-03")),
        at("10002", meeting("Sat", "11:00-13:00", "2026-10-03", "2026-10-03")),
      ),
    ).toEqual([[dayNumber("2026-10-03")]]);
  });

  it("never conflicts a section with itself", () => {
    const lecture = at("10001", meeting("Mon", "10:30-11:20"));
    expect(findConflicts([lecture, lecture])).toEqual([]);
  });

  it("reports every pair in a three-way conflict, ordered by CRN", () => {
    const conflicts = findConflicts([
      at("10003", meeting("Mon", "10:00-11:00")),
      at("10001", meeting("Mon", "10:30-11:30")),
      at("10002", meeting("Mon", "10:45-11:15")),
    ]);
    expect(conflicts.map((c) => `${c.a.crn}|${c.b.crn}`).sort()).toEqual([
      "10001|10002",
      "10001|10003",
      "10002|10003",
    ]);
  });

  it("flags sections a note says meet on alternate weeks", () => {
    const lab = testSection("10002", {
      meetings: [meeting("Mon", "10:30-11:20")],
      note: "Labs meet on alternate weeks. A schedule will be handed out at the first lab.",
    });
    const lecture = at("10001", meeting("Mon", "10:30-11:20"));
    const other = at("10003", meeting("Mon", "10:30-11:20"));
    const flags = Object.fromEntries(
      findConflicts([lecture, lab, other]).map((c) => [
        `${c.a.crn}|${c.b.crn}`,
        c.alternateWeeks,
      ]),
    );
    expect(flags).toEqual({
      "10001|10002": true,
      "10001|10003": false,
      "10002|10003": true,
    });
  });
});

describe("conflictChecker", () => {
  const lecture = at("10001", meeting("Mon Wed", "10:30-11:20"));
  const lab = at("10002", meeting("Tue", "14:30-16:20"));
  const conflictsWith = conflictChecker([lecture, lab]);

  it("names the schedule's sections a candidate conflicts with", () => {
    const candidate = at(
      "10003",
      meeting("Wed", "11:00-11:50"),
      meeting("Tue", "16:00-17:00"),
    );
    expect(
      conflictsWith(candidate)
        .map((s) => s.crn)
        .sort(),
    ).toEqual(["10001", "10002"]);
  });

  it("follows findConflicts' rules: touching, dates, untimed, itself", () => {
    expect(conflictsWith(at("10004", meeting("Mon", "11:20-12:10")))).toEqual(
      [],
    );
    expect(
      conflictsWith(
        at("10005", meeting("Mon", "10:30-11:20", "2027-01-06", "2027-04-07")),
      ),
    ).toEqual([]);
    expect(conflictsWith(at("10006", meeting("Mon", null)))).toEqual([]);
    expect(conflictsWith(lecture)).toEqual([]);
  });
});
