import { env } from "cloudflare:workers";
import type {
	Course,
	CourseSearchResult,
	ListSubjectsInput,
	SearchCoursesInput,
	SubjectResult,
} from "./catalog-types";

type CourseRow = {
	id: number;
	pid: string;
	subject_code: string;
	title: string;
	description: string;
	credits: string;
	hours_catalog_text: string;
	notes: string;
	pre_and_corequisites: string;
	created_at: string;
	updated_at: string;
};

type CourseSearchRow = Pick<
	CourseRow,
	"pid" | "subject_code" | "title" | "credits"
>;

type SubjectCodeRow = {
	subject_code: string;
};

export async function searchCoursesFromDb({
	query,
	term,
}: SearchCoursesInput): Promise<CourseSearchResult[]> {
	const trimmedQuery = query.trim();
	const trimmedTerm = term?.trim() ?? "";

	if (trimmedQuery === "") {
		return [];
	}

	const codePrefix = `${trimmedQuery}%`;
	const compactCodePrefix = `${trimmedQuery.replaceAll(" ", "")}%`;
	const includeTitle = trimmedQuery.length >= 3;
	const titleClause = includeTitle ? " OR c.title LIKE ?" : "";
	const titleParams = includeTitle ? [`%${trimmedQuery}%`] : [];
	const termClause = trimmedTerm
		? "EXISTS (SELECT 1 FROM sections s WHERE s.course_pid = c.pid AND s.term = ?) AND "
		: "";
	const termParams = trimmedTerm ? [trimmedTerm] : [];

	const { results } = await env.DB.prepare(
		`SELECT c.pid, c.subject_code, c.title, c.credits FROM courses c
WHERE ${termClause}(
  c.subject_code LIKE ?
  OR REPLACE(c.subject_code, ' ', '') LIKE ?
  ${titleClause}
)
ORDER BY
  (
    c.subject_code LIKE ?
    OR REPLACE(c.subject_code, ' ', '') LIKE ?
  ) DESC,
  c.subject_code
LIMIT 50`,
	)
		.bind(
			...termParams,
			codePrefix,
			compactCodePrefix,
			...titleParams,
			codePrefix,
			compactCodePrefix,
		)
		.all<CourseSearchRow>();

	return results.map(mapCourseSearchRow);
}

export async function getCourseBySubjectCodeFromDb(
	subjectCode: string,
): Promise<Course | null> {
	const trimmedSubjectCode = subjectCode.trim();
	if (trimmedSubjectCode === "") {
		return null;
	}

	const course = await env.DB.prepare(
		"SELECT * FROM courses WHERE subject_code = ? COLLATE NOCASE LIMIT 1",
	)
		.bind(trimmedSubjectCode)
		.first<CourseRow>();

	return course ? mapCourseRow(course) : null;
}

export async function listSubjectsFromDb({
	term,
}: ListSubjectsInput = {}): Promise<SubjectResult[]> {
	const trimmedTerm = term?.trim() ?? "";
	const statement = trimmedTerm
		? env.DB.prepare(
				`SELECT DISTINCT c.subject_code
FROM courses c
JOIN sections s ON s.course_pid = c.pid
WHERE s.term = ?
ORDER BY c.subject_code`,
			).bind(trimmedTerm)
		: env.DB.prepare("SELECT subject_code FROM courses ORDER BY subject_code");

	const { results } = await statement.all<SubjectCodeRow>();
	const counts = new Map<string, number>();

	for (const row of results) {
		const subject =
			row.subject_code.match(/^[A-Za-z]+/)?.[0] ?? row.subject_code;
		const normalizedSubject = subject.toUpperCase();
		counts.set(normalizedSubject, (counts.get(normalizedSubject) ?? 0) + 1);
	}

	return Array.from(counts, ([subject, courseCount]) => ({
		subject,
		courseCount,
	})).sort((a, b) => a.subject.localeCompare(b.subject));
}

function mapCourseRow(row: CourseRow): Course {
	return {
		id: row.id,
		pid: row.pid,
		subjectCode: row.subject_code,
		title: row.title,
		description: row.description,
		credits: row.credits,
		hoursCatalogText: row.hours_catalog_text,
		notes: row.notes,
		preAndCorequisites: row.pre_and_corequisites,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function mapCourseSearchRow(row: CourseSearchRow): CourseSearchResult {
	return {
		pid: row.pid,
		subjectCode: row.subject_code,
		title: row.title,
		credits: row.credits,
	};
}
