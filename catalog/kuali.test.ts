import { describe, expect, it } from "vitest";
import { parseCourse } from "./kuali.ts";

describe("parseCourse", () => {
  it("takes the code and title, trimmed", () => {
    expect(
      parseCourse({
        __catalogCourseId: "CSC110",
        title: " Fundamentals of Programming I ",
        pid: "x",
      }),
    ).toEqual({ code: "CSC110", title: "Fundamentals of Programming I" });
  });

  it("rejects a code it doesn't recognise", () => {
    expect(() =>
      parseCourse({ __catalogCourseId: "csc 110", title: "x" }),
    ).toThrow();
  });
});
