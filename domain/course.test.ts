import { describe, expect, it } from "vitest";
import { displayCode, parseCode } from "./course.ts";

describe("parseCode", () => {
  it("splits subject from number, keeping hyphens and letter suffixes", () => {
    expect(parseCode("CSC110")).toEqual({ subject: "CSC", number: "110" });
    expect(parseCode("ED-D101")).toEqual({ subject: "ED-D", number: "101" });
    expect(parseCode("ENSH347P")).toEqual({ subject: "ENSH", number: "347P" });
  });

  it("rejects a code it doesn't understand", () => {
    expect(() => parseCode("CSC1100")).toThrow("CSC1100");
  });
});

describe("displayCode", () => {
  it("puts a space between subject and number", () => {
    expect(displayCode("ED-D101")).toBe("ED-D 101");
  });
});
