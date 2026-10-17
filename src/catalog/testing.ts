import type { Meeting, Section } from "./model.ts";

/** A section for tests: only the fields that matter are passed. */
export const testSection = (
  crn: string,
  fields: Partial<Section> = {},
): Section => ({
  term: "202609",
  crn,
  subject: "CSC",
  courseNumber: "110",
  section: "A01",
  title: "Fundamentals of Programming I",
  scheduleType: "Lecture",
  instructionalMethod: "Face-to-face",
  partOfTerm: "1",
  credits: 1.5,
  linkId: null,
  crossList: null,
  crossListAvailable: null,
  seats: { enrolled: 0, capacity: 0, available: 0 },
  waitlist: { enrolled: 0, capacity: 0, available: 0 },
  meetings: [],
  note: null,
  ...fields,
});

const minutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

/** meeting("Mon Wed", "10:30-11:20") for the fall term; dates can be overridden. */
export const meeting = (
  days: string,
  time: string | null,
  startDate = "2026-09-09",
  endDate = "2026-12-07",
): Meeting => {
  const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const [start, end] = time ? time.split("-").map(minutes) : [null, null];
  return {
    days: days.split(" ").map((d) => names.indexOf(d)),
    start,
    end,
    startDate,
    endDate,
  };
};
