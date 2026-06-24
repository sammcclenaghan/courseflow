import { mapConcurrent, parseCourseId } from "./catalogImport.shared.ts";
import type {
	CourseEntry,
	ImportedCourse,
	ImportedSection,
} from "./catalogImport.types.ts";
import { fetchSectionsForCourse } from "./uvicBanner.server.ts";
import { refreshEnrollment } from "./uvicEnrollment.server.ts";
import { fetchCourseInfo } from "./uvicKuali.server.ts";

export type CatalogImportOptions = {
	entries: CourseEntry[];
	term: string;
	catalogId?: string;
	concurrency: number;
	enrollmentConcurrency: number;
	timeoutMs: number;
	skipEnrollment: boolean;
	onProgress?: (message: string) => void;
};

export type CatalogImportCourseResult = {
	entry: CourseEntry;
	course: ImportedCourse | null;
	sections: ImportedSection[];
	errors: string[];
};

export type CatalogImportResult = {
	courses: ImportedCourse[];
	sections: ImportedSection[];
	courseResults: CatalogImportCourseResult[];
	errors: Array<{ courseId: string; pid: string; error: string }>;
};

export async function importCatalog({
	entries,
	term,
	catalogId,
	concurrency,
	enrollmentConcurrency,
	timeoutMs,
	skipEnrollment,
	onProgress,
}: CatalogImportOptions): Promise<CatalogImportResult> {
	const courseResults = await mapConcurrent(
		entries,
		concurrency,
		async (entry, index) =>
			importEntry(entry, index, entries.length, {
				term,
				catalogId,
				enrollmentConcurrency,
				timeoutMs,
				skipEnrollment,
				onProgress,
			}),
	);

	const courses = courseResults
		.map((result) => result.course)
		.filter((course): course is ImportedCourse => course !== null);
	const sections = courseResults.flatMap((result) => result.sections);
	const errors = courseResults.flatMap((result) =>
		result.errors.map((error) => ({
			courseId: result.entry.courseId,
			pid: result.entry.pid,
			error,
		})),
	);

	return { courses, sections, courseResults, errors };
}

type ImportEntryOptions = Pick<
	CatalogImportOptions,
	| "term"
	| "catalogId"
	| "enrollmentConcurrency"
	| "timeoutMs"
	| "skipEnrollment"
	| "onProgress"
>;

async function importEntry(
	entry: CourseEntry,
	index: number,
	total: number,
	options: ImportEntryOptions,
): Promise<CatalogImportCourseResult> {
	const label = `[${index + 1}/${total}] ${entry.courseId} (${entry.pid})`;
	const errors: string[] = [];
	let course: ImportedCourse | null = null;
	let sections: ImportedSection[] = [];

	try {
		course = await fetchCourseInfo(entry.pid, {
			catalogId: options.catalogId,
			timeoutMs: options.timeoutMs,
		});
		options.onProgress?.(`${label} course ✓ ${course.title}`);
	} catch (error) {
		errors.push(`course: ${errorMessage(error)}`);
		options.onProgress?.(`${label} course ✗ ${errorMessage(error)}`);
		return { entry, course, sections, errors };
	}

	const parsedCourseId = parseCourseId(entry.courseId);
	if (!parsedCourseId) {
		errors.push(`sections: could not parse course id ${entry.courseId}`);
		return { entry, course, sections, errors };
	}

	try {
		sections = await fetchSectionsForCourse(
			{ ...parsedCourseId, term: options.term, coursePid: entry.pid },
			{ timeoutMs: options.timeoutMs },
		);
		options.onProgress?.(`${label} sections ✓ ${sections.length}`);
	} catch (error) {
		errors.push(`sections: ${errorMessage(error)}`);
		options.onProgress?.(`${label} sections ✗ ${errorMessage(error)}`);
		return { entry, course, sections, errors };
	}

	if (!options.skipEnrollment && sections.length > 0) {
		try {
			await refreshEnrollment(sections, {
				concurrency: options.enrollmentConcurrency,
				timeoutMs: options.timeoutMs,
			});
			const refreshed = sections.filter(
				(section) => section.enrollmentRefreshed,
			).length;
			options.onProgress?.(
				`${label} enrollment ✓ ${refreshed}/${sections.length}`,
			);
		} catch (error) {
			errors.push(`enrollment: ${errorMessage(error)}`);
			options.onProgress?.(`${label} enrollment ✗ ${errorMessage(error)}`);
		}
	}

	return { entry, course, sections, errors };
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
