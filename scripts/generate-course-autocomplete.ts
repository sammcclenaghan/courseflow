/// <reference types="node" />

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCourseEntries } from "../src/importer/catalogImport.shared.ts";
import type { CourseAutocompleteCourse } from "../src/catalog/course-autocomplete.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const coursesPath = resolve(root, "data/import/courses.json");
const outputPath = resolve(root, "public/generated/course-autocomplete.json");

const courses: CourseAutocompleteCourse[] = parseCourseEntries(
	JSON.parse(readFileSync(coursesPath, "utf8")),
)
	.map((entry) => ({
		pid: entry.pid,
		subjectCode: entry.courseId,
		title: entry.title,
		credits: "",
	}))
	.sort((a, b) =>
		a.subjectCode.localeCompare(b.subjectCode, undefined, { numeric: true }),
	);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(courses)}\n`);

console.info(`Generated ${courses.length} autocomplete courses at ${outputPath}`);
