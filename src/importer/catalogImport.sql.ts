import type { ImportedCourse, ImportedSection } from "./catalogImport.types.ts";

export type CatalogImportSqlInput = {
	courses: readonly ImportedCourse[];
	sections: readonly ImportedSection[];
	term: string;
	wrapTransaction?: boolean;
};

export function buildCatalogImportSql({
	courses,
	sections,
	term,
	wrapTransaction = false,
}: CatalogImportSqlInput): string {
	const uniqueCourses = uniqueBy(courses, (course) => course.pid);
	const uniqueSections = uniqueBy(
		sections,
		(section) => `${section.term}:${section.crn}`,
	);
	const coursePids = uniqueCourses.map((course) => course.pid).filter(Boolean);

	const statements = ["PRAGMA foreign_keys = ON;"];
	if (wrapTransaction) statements.push("BEGIN TRANSACTION;");

	if (coursePids.length > 0) {
		statements.push(
			`DELETE FROM sections WHERE term = ${sqlString(term)} AND course_pid IN (${coursePids.map(sqlString).join(", ")});`,
		);
	}

	for (const course of uniqueCourses) {
		statements.push(courseUpsertStatement(course));
	}

	for (const section of uniqueSections) {
		statements.push(sectionInsertStatement(section));
	}

	if (wrapTransaction) statements.push("COMMIT;");
	return `${statements.join("\n\n")}\n`;
}

function courseUpsertStatement(course: ImportedCourse): string {
	return `INSERT INTO courses (
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
  ${sqlString(course.subjectCode)},
  ${sqlString(course.title)},
  ${sqlString(course.description)},
  ${sqlString(course.credits)},
  ${sqlString(course.hoursCatalogText)},
  ${sqlString(course.notes)},
  ${sqlString(course.preAndCorequisites)},
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
  updated_at = excluded.updated_at;`;
}

function sectionInsertStatement(section: ImportedSection): string {
	return `INSERT INTO sections (
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
  ${sqlString(section.coursePid)},
  ${sqlString(section.subject)},
  ${sqlString(section.courseNumber)},
  ${sqlString(section.courseName)},
  ${sqlString(section.section)},
  ${sqlString(section.scheduleType)},
  ${sqlString(section.instructionalMethod)},
  ${sqlString(section.frequency)},
  ${sqlString(section.time)},
  ${sqlString(section.days)},
  ${sqlString(section.location)},
  ${sqlString(section.dateRange)},
  ${sqlString(section.units)},
  ${sqlString(section.additionalInformation)},
  ${sqlNumber(section.enrollmentActual)},
  ${sqlNumber(section.enrollmentMaximum)},
  ${sqlNumber(section.enrollmentSeatsAvailable)},
  ${sqlNumber(section.waitlistCapacity)},
  ${sqlNumber(section.waitlistActual)},
  ${sqlNumber(section.waitlistSeatsAvailable)},
  ${sqlJson(section.meetings)},
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
)
ON CONFLICT(term, crn) DO UPDATE SET
  course_pid = excluded.course_pid,
  subject = excluded.subject,
  course_number = excluded.course_number,
  course_name = excluded.course_name,
  section = excluded.section,
  schedule_type = excluded.schedule_type,
  instructional_method = excluded.instructional_method,
  frequency = excluded.frequency,
  time = excluded.time,
  days = excluded.days,
  location = excluded.location,
  date_range = excluded.date_range,
  units = excluded.units,
  additional_information = excluded.additional_information,
  enrollment_actual = excluded.enrollment_actual,
  enrollment_maximum = excluded.enrollment_maximum,
  enrollment_seats_available = excluded.enrollment_seats_available,
  waitlist_capacity = excluded.waitlist_capacity,
  waitlist_actual = excluded.waitlist_actual,
  waitlist_seats_available = excluded.waitlist_seats_available,
  meetings = excluded.meetings,
  updated_at = excluded.updated_at;`;
}

function sqlString(value: string | null | undefined): string {
	if (value === null || value === undefined) return "NULL";
	return `'${String(value).replaceAll("'", "''")}'`;
}

function sqlNumber(value: number): string {
	if (!Number.isFinite(value)) return "0";
	return String(Math.trunc(value));
}

function sqlJson(value: unknown): string {
	if (value === null || value === undefined) return "NULL";
	return sqlString(JSON.stringify(value));
}

function uniqueBy<T>(
	items: readonly T[],
	keyForItem: (item: T) => string,
): T[] {
	const seen = new Set<string>();
	const output: T[] = [];
	for (const item of items) {
		const key = keyForItem(item);
		if (seen.has(key)) continue;
		seen.add(key);
		output.push(item);
	}
	return output;
}
