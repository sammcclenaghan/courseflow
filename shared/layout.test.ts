import { describe, expect, it } from "vitest";
import { findConflicts } from "./conflicts";
import { dayNumber } from "./dates";
import { layoutDay, weekDays } from "./layout";
import { meeting, testSection } from "./testing";

const minutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};
const event = (id: string, time: string) => {
  const [start, end] = time.split("-").map(minutes);
  return { id, start, end };
};
const place = (...events: ReturnType<typeof event>[]) =>
  Object.fromEntries(
    layoutDay(events).map(({ id, left, width, z, covered }) => [
      id,
      { left: +left.toFixed(2), width: +width.toFixed(2), z, covered },
    ]),
  );

const FULL = { left: 0, width: 1, z: 1, covered: false };

describe("layoutDay", () => {
  it("gives a lone class the full width", () => {
    expect(place(event("a", "10:30-11:20"))).toEqual({ a: FULL });
  });

  it("gives back-to-back classes the full width", () => {
    expect(place(event("a", "10:30-11:20"), event("b", "11:20-12:10"))).toEqual(
      {
        a: FULL,
        b: FULL,
      },
    );
  });

  it("puts classes starting within 30 minutes side by side", () => {
    expect(place(event("a", "10:00-11:00"), event("b", "10:29-11:20"))).toEqual(
      {
        a: { left: 0, width: 0.5, z: 1, covered: false },
        b: { left: 0.5, width: 0.5, z: 1, covered: false },
      },
    );
  });

  it("indents a class starting 30 or more minutes later, on top", () => {
    expect(place(event("a", "10:00-11:20"), event("b", "10:30-11:20"))).toEqual(
      {
        a: { left: 0, width: 1, z: 1, covered: true },
        b: { left: 0.4, width: 0.6, z: 2, covered: false },
      },
    );
  });

  it("caps the indent at 60%", () => {
    const placed = place(
      event("a", "09:00-12:00"),
      event("b", "09:30-12:00"),
      event("c", "10:00-12:00"),
      event("d", "10:30-12:00"),
    );
    expect([placed.b.left, placed.c.left, placed.d.left]).toEqual([
      0.4, 0.6, 0.6,
    ]);
    expect([placed.c.z, placed.d.z]).toEqual([3, 4]);
  });

  it("keeps a chain of overlaps in one cluster", () => {
    // c doesn't touch a, but overlaps b, which overlaps a.
    expect(
      place(
        event("a", "09:00-11:00"),
        event("b", "10:30-12:00"),
        event("c", "11:30-12:30"),
      ),
    ).toEqual({
      a: { left: 0, width: 1, z: 1, covered: true },
      b: { left: 0.4, width: 0.6, z: 2, covered: true },
      c: { left: 0.6, width: 0.4, z: 3, covered: false },
    });
  });

  it("doesn't depend on input order or change its input", () => {
    const events = [event("b", "10:30-11:20"), event("a", "10:00-11:20")];
    const copy = structuredClone(events);
    expect(place(...events)).toEqual(place(...events.toReversed()));
    expect(events).toEqual(copy);
  });
});

describe("weekDays", () => {
  const monday = dayNumber("2026-09-14");

  it("lays out Monday to Friday, leaving out weekends and untimed meetings", () => {
    const week = weekDays(
      [
        testSection("10001", { meetings: [meeting("Mon Wed", "10:30-11:20")] }),
        testSection("10002", { meetings: [meeting("Sat", "09:00-12:00")] }),
        testSection("10003", { meetings: [meeting("Fri", null)] }),
      ],
      monday,
    );
    expect(week.map((day) => day.map((o) => o.section.crn))).toEqual([
      ["10001"],
      [],
      ["10001"],
      [],
      [],
    ]);
  });

  it("only shows a partial-term section in the weeks it runs", () => {
    const november = [
      testSection("10001", {
        meetings: [meeting("Mon", "10:30-11:20", "2026-11-02", "2026-11-30")],
      }),
    ];
    expect(weekDays(november, monday).flat()).toEqual([]);
    expect(weekDays(november, dayNumber("2026-11-02"))[0]).toHaveLength(1);
  });

  it("places what the conflict check reports as a conflict side by side", () => {
    const sections = [
      testSection("10001", { meetings: [meeting("Mon", "10:30-11:20")] }),
      testSection("10002", { meetings: [meeting("Mon", "10:30-11:20")] }),
    ];
    expect(findConflicts(sections)[0].days).toContain(monday);
    expect(weekDays(sections, monday)[0].map((o) => o.width)).toEqual([
      0.5, 0.5,
    ]);
  });
});
