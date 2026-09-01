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

	const statements = ["PRAGMA foreign_keys = ON;"];
	if (wrapTransaction) statements.push("BEGIN TRANSACTION;");

	for (const course of uniqueCourses) {
		statements.push(courseUpsertStatement(course));
	}

	for (const section of uniqueSections) {
		statements.push(sectionInsertStatement(section));
	}

	statements.push(...staleSectionPruneStatements(uniqueSections, term));

	if (wrapTransaction) statements.push("COMMIT;");
	return `${statements.join("\n\n")}\n`;
}

// Deleting a section cascades into users' saved schedule_sections, so pruning
// must only remove CRNs that genuinely no longer exist for a course whose
// sections were fetched this run. Courses with zero fetched sections are left
// untouched: a failed upstream fetch must not delete good data.
function staleSectionPruneStatements(
	sections: readonly ImportedSection[],
	term: string,
): string[] {
	const crnsByCoursePid = new Map<string, string[]>();
	for (const section of sections) {
		if (section.term !== term || !section.coursePid) continue;
		const crns = crnsByCoursePid.get(section.coursePid) ?? [];
		crns.push(section.crn);
		crnsByCoursePid.set(section.coursePid, crns);
	}
	return Array.from(crnsByCoursePid, ([coursePid, crns]) => {
		return `DELETE FROM sections WHERE term = ${sqlString(term)} AND course_pid = ${sqlString(coursePid)} AND crn NOT IN (${crns.map(sqlString).join(", ")});`;
	});
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
  enrollment_updated_at,
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
  ${section.enrollmentRefreshed ? "strftime('%Y-%m-%dT%H:%M:%fZ', 'now')" : "NULL"},
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
  enrollment_actual = CASE WHEN excluded.enrollment_updated_at IS NOT NULL THEN excluded.enrollment_actual ELSE enrollment_actual END,
  enrollment_maximum = CASE WHEN excluded.enrollment_updated_at IS NOT NULL THEN excluded.enrollment_maximum ELSE enrollment_maximum END,
  enrollment_seats_available = CASE WHEN excluded.enrollment_updated_at IS NOT NULL THEN excluded.enrollment_seats_available ELSE enrollment_seats_available END,
  waitlist_capacity = CASE WHEN excluded.enrollment_updated_at IS NOT NULL THEN excluded.waitlist_capacity ELSE waitlist_capacity END,
  waitlist_actual = CASE WHEN excluded.enrollment_updated_at IS NOT NULL THEN excluded.waitlist_actual ELSE waitlist_actual END,
  waitlist_seats_available = CASE WHEN excluded.enrollment_updated_at IS NOT NULL THEN excluded.waitlist_seats_available ELSE waitlist_seats_available END,
  enrollment_updated_at = COALESCE(excluded.enrollment_updated_at, enrollment_updated_at),
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
