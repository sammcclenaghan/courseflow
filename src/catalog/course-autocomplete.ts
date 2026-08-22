import type { CourseSearchResult } from "@/utils/catalog-types";

export type CourseAutocompleteCourse = CourseSearchResult;

export type CourseAutocompleteIndex = {
	courses: readonly CourseAutocompleteCourse[];
	entries: readonly CourseAutocompleteIndexEntry[];
};

export type NormalizedCourseSearchQuery = {
	text: string;
	compactCode: string;
	titleWords: readonly string[];
	includeTitle: boolean;
};

type CourseAutocompleteIndexEntry = {
	course: CourseAutocompleteCourse;
	compactCode: string;
	textCode: string;
	title: string;
	titleWords: readonly string[];
};

type CourseAutocompleteSource =
	| readonly CourseAutocompleteCourse[]
	| CourseAutocompleteIndex;

export function buildCourseAutocompleteIndex(
	courses: readonly CourseAutocompleteCourse[],
): CourseAutocompleteIndex {
	return {
		courses,
		entries: courses.map((course) => {
			const title = normalizeText(course.title);
			return {
				course,
				compactCode: normalizeCompact(course.subjectCode),
				textCode: normalizeText(course.subjectCode),
				title,
				titleWords: title.split(" ").filter(Boolean),
			};
		}),
	};
}

export function filterCoursesByOfferings(
	courses: readonly CourseAutocompleteCourse[],
	offeredPids: ReadonlySet<string>,
): CourseAutocompleteCourse[] {
	return courses.filter((course) => offeredPids.has(course.pid));
}

export function filterCourseAutocompleteIndexByOfferings(
	index: CourseAutocompleteIndex,
	offeredPids: ReadonlySet<string>,
): CourseAutocompleteIndex {
	const entries = index.entries.filter((entry) =>
		offeredPids.has(entry.course.pid),
	);
	return {
		courses: entries.map((entry) => entry.course),
		entries,
	};
}

export function searchCourseAutocomplete(
	source: CourseAutocompleteSource,
	query: string,
	limit = 50,
): CourseAutocompleteCourse[] {
	const trimmedQuery = query.trim();
	if (trimmedQuery === "") return [];

	const normalizedQuery = normalizeCourseSearchQuery(trimmedQuery);
	if (normalizedQuery.text === "") return [];
	const ranked: Array<{ entry: CourseAutocompleteIndexEntry; rank: number }> =
		[];
	const index = toCourseAutocompleteIndex(source);

	for (const entry of index.entries) {
		const rank = rankCourse(entry, normalizedQuery);
		if (rank !== null) ranked.push({ entry, rank });
	}

	return ranked
		.sort((a, b) => {
			const rankDiff = a.rank - b.rank;
			if (rankDiff !== 0) return rankDiff;
			return a.entry.course.subjectCode.localeCompare(
				b.entry.course.subjectCode,
				undefined,
				{
					numeric: true,
				},
			);
		})
		.slice(0, limit)
		.map(({ entry }) => entry.course);
}

function toCourseAutocompleteIndex(
	source: CourseAutocompleteSource,
): CourseAutocompleteIndex {
	return isCourseArray(source) ? buildCourseAutocompleteIndex(source) : source;
}

function isCourseArray(
	source: CourseAutocompleteSource,
): source is readonly CourseAutocompleteCourse[] {
	return Array.isArray(source);
}

function rankCourse(
	entry: CourseAutocompleteIndexEntry,
	query: NormalizedCourseSearchQuery,
): number | null {
	if (entry.compactCode === query.compactCode) return 0;
	if (entry.compactCode.startsWith(query.compactCode)) return 10;
	if (entry.textCode.startsWith(query.text)) return 20;

	if (!query.includeTitle) return null;

	if (entry.titleWords.some((word) => word === query.text)) return 40;
	if (entry.titleWords.some((word) => word.startsWith(query.text))) return 50;
	if (entry.title.includes(query.text)) return 60;

	return null;
}

export function normalizeCourseSearchQuery(
	query: string,
): NormalizedCourseSearchQuery {
	const text = normalizeText(query);
	return {
		text,
		compactCode: normalizeCompact(query),
		titleWords: text.split(" ").filter(Boolean),
		includeTitle: text.length >= 3,
	};
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
