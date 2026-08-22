import { describe, expect, it } from "vitest";
import {
	DEFAULT_TERM,
	getTermLabel,
	isTermValue,
	normalizeTerm,
	TERMS,
} from "./constants";

describe("term configuration", () => {
	it("pins the configured terms and the default used at rollover", () => {
		expect(TERMS).toEqual([
			{ label: "Fall 2026", value: "202609" },
			{ label: "Spring 2027", value: "202701" },
		]);
		expect(DEFAULT_TERM).toBe("202609");
	});

	it("falls back to the configured default for missing, stale, or invalid terms", () => {
		expect(normalizeTerm(undefined)).toBe(DEFAULT_TERM);
		expect(normalizeTerm("202501")).toBe(DEFAULT_TERM);
		expect(normalizeTerm("fall-2026")).toBe(DEFAULT_TERM);
	});

	it("recognizes configured values and labels unknown values without inventing one", () => {
		expect(isTermValue("202701")).toBe(true);
		expect(isTermValue("202501")).toBe(false);
		expect(getTermLabel("202701")).toBe("Spring 2027");
		expect(getTermLabel("202501")).toBe("202501");
	});
});
