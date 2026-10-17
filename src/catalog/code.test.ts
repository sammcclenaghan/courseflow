import { describe, expect, it } from "vitest";
import { displayCode, parseCode } from "./code";

describe("parseCode", () => {
  it("splits subject and number, keeping suffixes and hyphens", () => {
    expect(parseCode("CSC110")).toEqual({ subject: "CSC", number: "110" });
    expect(parseCode("ENSH347P")).toEqual({ subject: "ENSH", number: "347P" });
    expect(parseCode("ED-D101")).toEqual({ subject: "ED-D", number: "101" });
    expect(parseCode("AE103A")).toEqual({ subject: "AE", number: "103A" });
  });

  it("rejects codes it does not understand", () => {
    for (const code of ["CSC1100", "CSC11", "csc110", "110", "CSC 110"]) {
      expect(() => parseCode(code)).toThrow(code);
    }
  });
});

describe("displayCode", () => {
  it("puts a space between subject and number", () => {
    expect(displayCode("CSC110")).toBe("CSC 110");
    expect(displayCode("ED-D101")).toBe("ED-D 101");
  });
});
