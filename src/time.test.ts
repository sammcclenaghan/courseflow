import { describe, expect, it } from "vitest";
import { dayNumber } from "../shared/dates";
import { formatHour, formatTime, formatTimeRange, formatWeek } from "./time";

const at = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

describe("times", () => {
  it("writes a 12-hour clock", () => {
    expect(formatTime(at("09:30"))).toBe("9:30");
    expect(formatTime(at("12:05"))).toBe("12:05");
    expect(formatTime(at("13:00"))).toBe("1:00");
    expect(formatTime(at("23:20"))).toBe("11:20");
  });

  it("labels hours on the grid", () => {
    expect(formatHour(at("08:00"))).toBe("8 AM");
    expect(formatHour(at("12:00"))).toBe("12 PM");
    expect(formatHour(at("20:00"))).toBe("8 PM");
  });

  it("writes AM or PM once when both ends share it", () => {
    expect(formatTimeRange(at("09:30"), at("10:20"))).toBe("9:30–10:20 AM");
    expect(formatTimeRange(at("14:30"), at("15:20"))).toBe("2:30–3:20 PM");
    expect(formatTimeRange(at("11:30"), at("12:50"))).toBe("11:30 AM–12:50 PM");
  });
});

describe("formatWeek", () => {
  it("shortens a week inside one month", () => {
    expect(formatWeek(dayNumber("2026-09-14"))).toBe("Sep 14 – 18, 2026");
  });

  it("names both months when the week crosses one", () => {
    expect(formatWeek(dayNumber("2026-09-28"))).toBe("Sep 28 – Oct 2, 2026");
  });

  it("names both years when the week crosses one", () => {
    expect(formatWeek(dayNumber("2026-12-28"))).toBe(
      "Dec 28, 2026 – Jan 1, 2027",
    );
  });

  it("leaves the year out when asked", () => {
    expect(formatWeek(dayNumber("2026-09-28"), { year: false })).toBe(
      "Sep 28 – Oct 2",
    );
    expect(formatWeek(dayNumber("2026-12-28"), { year: false })).toBe(
      "Dec 28 – Jan 1",
    );
  });
});
