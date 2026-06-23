#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const fixturePath = resolve(root, "data/seed/csc.json");
const sqlPath = resolve(root, ".wrangler/tmp/seed-csc.sql");

const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));
const courses = fixture.courses ?? [];
const sections = fixture.sections ?? [];
const terms = fixture.terms ?? [...new Set(sections.map((section) => section.term))];
const coursePids = courses.map((course) => course.pid);

if (courses.length === 0) {
	throw new Error(`No courses found in ${fixturePath}`);
}

function sqlString(value) {
	if (value === null || value === undefined) return "NULL";
	return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlNumber(value) {
	if (value === null || value === undefined || value === "") return "0";
	const number = Number(value);
	if (!Number.isFinite(number)) {
		throw new Error(`Invalid number: ${value}`);
	}
	return String(Math.trunc(number));
}

function sqlJson(value) {
	if (value === null || value === undefined) return "NULL";
	return sqlString(JSON.stringify(value));
}

const statements = [
	"PRAGMA foreign_keys = ON;",
	"BEGIN TRANSACTION;",
	`DELETE FROM sections WHERE term IN (${terms.map(sqlString).join(", ")}) AND course_pid IN (${coursePids.map(sqlString).join(", ")});`,
];

for (const course of courses) {
	statements.push(`INSERT INTO courses (
  pid,
  subject_code,
  title,
  description,
  credits,
  hours_catalog_text,
  notes,
  pre_and_corequisites,
  updated_at
) VALUES (
  ${sqlString(course.pid)},
  ${sqlString(course.subject_code)},
  ${sqlString(course.title)},
  ${sqlString(course.description)},
  ${sqlString(course.credits)},
  ${sqlString(course.hours_catalog_text)},
  ${sqlString(course.notes)},
  ${sqlString(course.pre_and_corequisites)},
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
)
ON CONFLICT(pid) DO UPDATE SET
  subject_code = excluded.subject_code,
  title = excluded.title,
  description = excluded.description,
  credits = excluded.credits,
  hours_catalog_text = excluded.hours_catalog_text,
  notes = excluded.notes,
  pre_and_corequisites = excluded.pre_and_corequisites,
  updated_at = excluded.updated_at;`);
}

for (const section of sections) {
	statements.push(`INSERT INTO sections (
  term,
  crn,
  course_pid,
  subject,
  course_number,
  course_name,
  section,
  schedule_type,
  instructional_method,
  frequency,
  time,
  days,
  location,
  date_range,
  units,
  additional_information,
  enrollment_actual,
  enrollment_maximum,
  enrollment_seats_available,
  waitlist_capacity,
  waitlist_actual,
  waitlist_seats_available,
  meetings,
  updated_at
) VALUES (
  ${sqlString(section.term)},
  ${sqlString(section.crn)},
  ${sqlString(section.course_pid)},
  ${sqlString(section.subject)},
  ${sqlString(section.course_number)},
  ${sqlString(section.course_name)},
  ${sqlString(section.section)},
  ${sqlString(section.schedule_type)},
  ${sqlString(section.instructional_method)},
  ${sqlString(section.frequency)},
  ${sqlString(section.time)},
  ${sqlString(section.days)},
  ${sqlString(section.location)},
  ${sqlString(section.date_range)},
  ${sqlString(section.units)},
  ${sqlString(section.additional_information)},
  ${sqlNumber(section.enrollment_actual)},
  ${sqlNumber(section.enrollment_maximum)},
  ${sqlNumber(section.enrollment_seats_available)},
  ${sqlNumber(section.waitlist_capacity)},
  ${sqlNumber(section.waitlist_actual)},
  ${sqlNumber(section.waitlist_seats_available)},
  ${sqlJson(section.meetings)},
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);`);
}

statements.push("COMMIT;");

mkdirSync(dirname(sqlPath), { recursive: true });
writeFileSync(sqlPath, `${statements.join("\n\n")}\n`);

execFileSync(
	"npx",
	[
		"wrangler",
		"d1",
		"execute",
		"course-flow-v4",
		"--local",
		"--file",
		sqlPath,
	],
	{ cwd: root, stdio: "inherit" },
);

console.info(
	`Seeded ${courses.length} courses and ${sections.length} sections from ${fixturePath}`,
);
