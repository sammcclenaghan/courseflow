import { describe, expect, it } from "vitest";
import { highlightTextSegments } from "./text-highlight";

describe("highlightTextSegments", () => {
	it("highlights direct text matches", () => {
		expect(highlightTextSegments("Public Administration", "admin", 1)).toEqual([
			{ text: "Public ", highlighted: false },
			{ text: "Admin", highlighted: true },
			{ text: "istration", highlighted: false },
		]);
	});

	it("highlights compact course-code matches when the query has spaces", () => {
		expect(highlightTextSegments("ADMN310", "admn 3", 1)).toEqual([
			{ text: "ADMN3", highlighted: true },
			{ text: "10", highlighted: false },
		]);
	});

	it("highlights compact course-code matches when the text has spaces", () => {
		expect(highlightTextSegments("CSC 110", "csc1", 1)).toEqual([
			{ text: "CSC 1", highlighted: true },
			{ text: "10", highlighted: false },
		]);
	});

	it("respects minimum query length", () => {
		expect(highlightTextSegments("CSC110", "cs", 3)).toEqual([
			{ text: "CSC110", highlighted: false },
		]);
	});
});
