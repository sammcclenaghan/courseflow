import { env } from "cloudflare:workers";
import type {
	Course,
	CourseAlternative,
	CourseAlternativesResponse,
	CourseSearchResult,
	GetCourseAlternativesInput,
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

type CourseRecommendationRow = {
	pid: string;
	subject_code: string;
	title: string;
	credits: string;
	semantic_score: number;
	final_score: number;
	reasons_json: string;
	recommendation_rank: number;
	offered_in_term: number;
	has_available_seats: number;
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

export async function getCourseAlternativesFromDb({
	subjectCode,
	term,
	mode = "all",
	limit = 8,
}: GetCourseAlternativesInput): Promise<CourseAlternativesResponse> {
	const course = await getCourseBySubjectCodeFromDb(subjectCode);
	if (!course) {
		return {
			subjectCode,
			term,
			mode,
			results: [],
		};
	}

	const latestAlgorithm = await env.DB.prepare(
		`SELECT algorithm_version FROM course_recommendations
WHERE source_pid = ?
ORDER BY computed_at DESC
LIMIT 1`,
	)
		.bind(course.pid)
		.first<{ algorithm_version: string }>();

	if (!latestAlgorithm) {
		return {
			subjectCode: course.subjectCode,
			term,
			mode,
			results: [],
		};
	}

	const rows = await listRecommendationRows(
		course.pid,
		latestAlgorithm.algorithm_version,
		term,
	);
	const sourceSubject = subjectPrefix(course.subjectCode);

	const results = rows
		.map((row) => {
			const offeredInTerm = Boolean(row.offered_in_term);
			const hasAvailableSeats = Boolean(row.has_available_seats);

			return {
				pid: row.pid,
				subjectCode: row.subject_code,
				title: row.title,
				credits: row.credits,
				rank: row.recommendation_rank,
				score: row.final_score,
				semanticScore: row.semantic_score,
				offeredInTerm,
				hasAvailableSeats,
				isCrossSubject: subjectPrefix(row.subject_code) !== sourceSubject,
				reasons: parseReasons(row.reasons_json),
			} satisfies CourseAlternative;
		})
		.filter((alternative) => mode !== "offered" || alternative.offeredInTerm)
		.sort((a, b) => b.score - a.score)
		.slice(0, Math.max(1, Math.min(limit, 24)));

	return {
		subjectCode: course.subjectCode,
		term,
		mode,
		results,
	};
}

async function listRecommendationRows(
	sourcePid: string,
	algorithmVersion: string,
	term: string,
): Promise<CourseRecommendationRow[]> {
	const { results } = await env.DB.prepare(
		`SELECT
  c.pid,
  c.subject_code,
  c.title,
  c.credits,
  r.semantic_score,
  r.final_score,
  r.reasons_json,
  r.recommendation_rank,
  EXISTS(SELECT 1 FROM sections s WHERE s.course_pid = c.pid AND s.term = ?) AS offered_in_term,
  EXISTS(SELECT 1 FROM sections s WHERE s.course_pid = c.pid AND s.term = ? AND s.enrollment_seats_available > 0) AS has_available_seats
FROM course_recommendations r
JOIN courses c ON c.pid = r.related_pid
WHERE r.source_pid = ? AND r.algorithm_version = ?
ORDER BY r.recommendation_rank
LIMIT 96`,
	)
		.bind(term, term, sourcePid, algorithmVersion)
		.all<CourseRecommendationRow>();

	return results;
}

function parseReasons(raw: string): string[] {
	try {
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed)
			? parsed.filter((reason): reason is string => typeof reason === "string")
			: [];
	} catch {
		return [];
	}
}

function subjectPrefix(subjectCode: string): string {
	return subjectCode.match(/^[A-Za-z]+/)?.[0].toUpperCase() ?? subjectCode;
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
