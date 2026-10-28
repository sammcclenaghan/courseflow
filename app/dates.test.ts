import { describe, expect, it } from "vitest";
import { addDays, formatDate, monday, weekday } from "./dates.ts";

describe("dates", () => {
  it("adds days across months, years and daylight saving", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(addDays("2027-03-12", 7)).toBe("2027-03-19");
  });

  it("finds a date's weekday and its week's Monday", () => {
    expect(weekday("2027-03-22")).toBe(1);
    expect(monday("2027-03-24")).toBe("2027-03-22");
    expect(monday("2027-03-28")).toBe("2027-03-22");
    expect(monday("2027-03-22")).toBe("2027-03-22");
  });

  it("formats a date", () => {
    expect(formatDate("2027-03-22")).toBe("Mon, Mar 22");
  });
});
