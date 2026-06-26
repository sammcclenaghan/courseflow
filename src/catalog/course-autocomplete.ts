import type { CourseSearchResult } from "@/utils/catalog-types";

export type CourseAutocompleteCourse = CourseSearchResult;

export function searchCourseAutocomplete(
	courses: readonly CourseAutocompleteCourse[],
	query: string,
	limit = 50,
): CourseAutocompleteCourse[] {
	const trimmedQuery = query.trim();
	if (trimmedQuery === "") return [];

	const textQuery = normalizeText(trimmedQuery);
	const compactQuery = normalizeCompact(trimmedQuery);
	const includeTitle = textQuery.length >= 3;
	const ranked: Array<{ course: CourseAutocompleteCourse; rank: number }> = [];

	for (const course of courses) {
		const rank = rankCourse(course, {
			textQuery,
			compactQuery,
			includeTitle,
		});
		if (rank !== null) ranked.push({ course, rank });
	}

	return ranked
		.sort((a, b) => {
			const rankDiff = a.rank - b.rank;
			if (rankDiff !== 0) return rankDiff;
			return a.course.subjectCode.localeCompare(
				b.course.subjectCode,
				undefined,
				{
					numeric: true,
				},
			);
		})
		.slice(0, limit)
		.map(({ course }) => course);
}

type NormalizedQuery = {
	textQuery: string;
	compactQuery: string;
	includeTitle: boolean;
};

function rankCourse(
	course: CourseAutocompleteCourse,
	{ textQuery, compactQuery, includeTitle }: NormalizedQuery,
): number | null {
	const compactCode = normalizeCompact(course.subjectCode);
	const textCode = normalizeText(course.subjectCode);

	if (compactCode === compactQuery) return 0;
	if (compactCode.startsWith(compactQuery)) return 10;
	if (textCode.startsWith(textQuery)) return 20;

	if (!includeTitle) return null;

	const title = normalizeText(course.title);
	const words = title.split(" ");

	if (words.some((word) => word === textQuery)) return 40;
	if (words.some((word) => word.startsWith(textQuery))) return 50;
	if (title.includes(textQuery)) return 60;

	return null;
}

function normalizeText(value: string): string {
	return value
		.toLowerCase()
		.replaceAll(/[^a-z0-9]+/g, " ")
		.trim();
}

function normalizeCompact(value: string): string {
	return value.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}
