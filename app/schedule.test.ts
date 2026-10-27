import { beforeEach, describe, expect, it } from "vitest";
import { add, schedules } from "./schedule.ts";

describe("add", () => {
  beforeEach(() => {
    schedules.value = {};
  });

  it("adds a course once, to its own term", () => {
    add("202701", "CSC110");
    add("202701", "MATH100");
    add("202701", "CSC110");
    add("202609", "CSC423");
    expect(schedules.value).toEqual({
      "202701": ["CSC110", "MATH100"],
      "202609": ["CSC423"],
    });
  });
});
