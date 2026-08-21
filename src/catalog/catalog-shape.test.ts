import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { CourseSearchResult } from "@/utils/catalog-types";
import { CATALOG_COURSE_COUNT, CATALOG_SUBJECTS } from "./catalog-shape";

const generatedCourses = JSON.parse(
	readFileSync(
		resolve(process.cwd(), "public/generated/course-autocomplete.json"),
		"utf8",
	),
) as CourseSearchResult[];

describe("catalog shape", () => {
	it("matches the generated catalog, subject for subject", () => {
		const counts = new Map<string, number>();
		for (const course of generatedCourses) {
			const subject = course.subjectCode.match(/^[A-Z]+/)?.[0] ?? "";
			counts.set(subject, (counts.get(subject) ?? 0) + 1);
		}

		expect(
			CATALOG_SUBJECTS.map(
				({ subject, courseCount }) => `${subject}:${courseCount}`,
			),
		).toEqual(Array.from(counts, ([subject, count]) => `${subject}:${count}`));
	});

	it("counts every course in the catalog", () => {
		expect(CATALOG_COURSE_COUNT).toBe(generatedCourses.length);
	});

	it("keeps subjects in the order the catalog lists them", () => {
		const subjects = CATALOG_SUBJECTS.map(({ subject }) => subject);
		expect(subjects).toEqual([...subjects].sort());
	});
});
