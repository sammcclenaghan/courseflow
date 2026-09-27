import { useEffect } from "react";

export type CourseSearchSurface = "explore" | "scheduler";

const ENABLED = import.meta.env.DEV;

export function markCourseSearchInput(surface: CourseSearchSurface): void {
	if (!canMeasure()) return;
	performance.mark(inputMarkName(surface));
}

export function useCourseSearchPerformance({
	surface,
	query,
	resultCount,
	isLoading,
}: {
	surface: CourseSearchSurface;
	query: string;
	resultCount: number;
	isLoading: boolean;
}): void {
	useEffect(() => {
		if (!canMeasure() || query === "" || isLoading) return;

		const inputMark = inputMarkName(surface);
		if (performance.getEntriesByName(inputMark, "mark").length === 0) return;

		const resultsMark = resultsMarkName(surface);
		const measureName = measureNameFor(surface);

		performance.mark(resultsMark);
		performance.measure(measureName, inputMark, resultsMark);

		const measure = performance.getEntriesByName(measureName, "measure").at(-1);

		if (measure) {
			console.debug("[perf] course search", {
				surface,
				query,
				resultCount,
				durationMs: Number(measure.duration.toFixed(2)),
			});
		}

		performance.clearMarks(inputMark);
		performance.clearMarks(resultsMark);
	}, [surface, query, resultCount, isLoading]);
}

function canMeasure(): boolean {
	return ENABLED && typeof performance !== "undefined";
}

function inputMarkName(surface: CourseSearchSurface): string {
	return `course-search:${surface}:input`;
}

function resultsMarkName(surface: CourseSearchSurface): string {
	return `course-search:${surface}:results`;
}

function measureNameFor(surface: CourseSearchSurface): string {
	return `course-search:${surface}:input-to-results`;
}
