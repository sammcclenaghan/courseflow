/// <reference types="node" />

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CourseAutocompleteCourse } from "../src/catalog/search/course-autocomplete.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Written by `scripts/import.ts courses`, already sorted by code.
const coursesPath = resolve(root, "data/import/courses.json");
const outputPath = resolve(root, "public/generated/course-autocomplete.json");

const entries: { courseID: string; pid: string; title: string }[] = JSON.parse(
	readFileSync(coursesPath, "utf8"),
);
const courses: CourseAutocompleteCourse[] = entries.map((entry) => ({
	pid: entry.pid,
	subjectCode: entry.courseID,
	title: entry.title,
	credits: "",
}));

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(courses)}\n`);

console.info(`Generated ${courses.length} autocomplete courses at ${outputPath}`);
