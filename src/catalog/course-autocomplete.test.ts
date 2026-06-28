import { describe, expect, it } from "vitest";
import {
	buildCourseAutocompleteIndex,
	type CourseAutocompleteCourse,
	filterCourseAutocompleteIndexByOfferings,
	filterCoursesByOfferings,
	searchCourseAutocomplete,
} from "./course-autocomplete";

const courses: CourseAutocompleteCourse[] = [
	{
		pid: "csc110",
		subjectCode: "CSC110",
		title: "Fundamentals of Programming I",
		credits: "1.5",
	},
	{
		pid: "csc115",
		subjectCode: "CSC115",
		title: "Fundamentals of Programming II",
		credits: "1.5",
	},
	{
		pid: "csc230",
		subjectCode: "CSC230",
		title: "Introduction to Computer Architecture",
		credits: "1.5",
	},
	{
		pid: "seng265",
		subjectCode: "SENG265",
		title: "Software Development Methods",
		credits: "1.5",
	},
];

describe("searchCourseAutocomplete", () => {
	it("matches compact course code prefixes", () => {
		expect(
			searchCourseAutocomplete(courses, "csc1").map((c) => c.subjectCode),
		).toEqual(["CSC110", "CSC115"]);
	});

	it("matches course codes typed with spaces", () => {
		expect(
			searchCourseAutocomplete(courses, "csc 23").map((c) => c.subjectCode),
		).toEqual(["CSC230"]);
	});

	it("uses title search for useful length queries", () => {
		expect(
			searchCourseAutocomplete(courses, "software").map((c) => c.subjectCode),
		).toEqual(["SENG265"]);
	});

	it("does not title-search one or two character queries", () => {
		expect(searchCourseAutocomplete(courses, "of")).toEqual([]);
	});

	it("ranks course-code matches before title matches", () => {
		expect(
			searchCourseAutocomplete(courses, "csc").map((c) => c.subjectCode),
		).toEqual(["CSC110", "CSC115", "CSC230"]);
	});

	it("searches a prebuilt normalized index", () => {
		const index = buildCourseAutocompleteIndex(courses);

		expect(
			searchCourseAutocomplete(index, "software").map((c) => c.subjectCode),
		).toEqual(["SENG265"]);
	});

	it("filters courses to static term offerings", () => {
		expect(
			filterCoursesByOfferings(courses, new Set(["csc110", "seng265"])).map(
				(c) => c.subjectCode,
			),
		).toEqual(["CSC110", "SENG265"]);
	});

	it("filters a prebuilt index to static term offerings", () => {
		const index = filterCourseAutocompleteIndexByOfferings(
			buildCourseAutocompleteIndex(courses),
			new Set(["csc110", "seng265"]),
		);

		expect(
			searchCourseAutocomplete(index, "software").map((c) => c.subjectCode),
		).toEqual(["SENG265"]);
	});
});
