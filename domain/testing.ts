// Builders for tests: only the fields a test cares about are passed.
import type { Course } from "./course.ts";
import type { Meeting, Section } from "./section.ts";
import type { Term } from "./term.ts";

const LETTERS = "UMTWRFS"; // UVic's day letters, from Sunday

/** meeting("MR", "14:30-15:50"), or meeting("W", null) for TBA. Full Fall 2026 term by default. */
export function meeting(
  days: string,
  time: string | null,
  startDate = "2026-09-09",
  endDate = "2026-12-07",
): Meeting {
  const minutes = (clock: string) => {
    const [hours, mins] = clock.split(":").map(Number);
    return hours * 60 + mins;
  };
  const [start, end] = time?.split("-").map(minutes) ?? [];
  return {
    days: [...days].map((letter) => LETTERS.indexOf(letter)),
    time: time ? { start, end } : null,
    startDate,
    endDate,
  };
}

let nextCrn = 10000;

/** section("A01", meeting(…)): a Lecture for A, Lab for B, Tutorial for T. */
export function section(
  number: string,
  meetings: Meeting[] = [],
  fields: Partial<Section> = {},
): Section {
  const types: Record<string, string> = {
    A: "Lecture",
    B: "Lab",
    T: "Tutorial",
  };
  return {
    crn: String(nextCrn++),
    number,
    type: types[number[0]] ?? "Lecture",
    linkId: null,
    seats: { enrolled: 0, capacity: 0 },
    waitlist: { enrolled: 0, capacity: 0 },
    note: null,
    meetings,
    ...fields,
  };
}

export const course = (code: string, sections: Section[]): Course => ({
  code,
  title: code,
  sections,
});

export const term = (courses: Course[]): Term => ({
  code: "202609",
  startDate: "2026-09-09",
  endDate: "2026-12-07",
  courses,
});
