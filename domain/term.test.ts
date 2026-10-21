import { describe, expect, it } from "vitest";
import { termName } from "./term.ts";

describe("termName", () => {
  it("names each season", () => {
    expect(termName("202701")).toBe("Spring 2027");
    expect(termName("202605")).toBe("Summer 2026");
    expect(termName("202609")).toBe("Fall 2026");
  });

  it("rejects a code that isn't a term", () => {
    expect(() => termName("202603")).toThrow("202603");
    expect(() => termName("2027")).toThrow("2027");
  });
});
