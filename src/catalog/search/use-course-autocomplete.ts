import { useEffect, useState } from "react";
import {
	buildCourseAutocompleteIndex,
	type CourseAutocompleteCourse,
	type CourseAutocompleteIndex,
} from "./course-autocomplete";

const COURSE_AUTOCOMPLETE_URL = "/generated/course-autocomplete.json";

let cachedIndex: CourseAutocompleteIndex | null = null;
let loadPromise: Promise<CourseAutocompleteIndex> | null = null;

export function useCourseAutocomplete(enabled: boolean): {
	courses: readonly CourseAutocompleteCourse[] | null;
	index: CourseAutocompleteIndex | null;
	isLoading: boolean;
	isError: boolean;
} {
	const [index, setIndex] = useState<CourseAutocompleteIndex | null>(
		() => cachedIndex,
	);
	const [isError, setIsError] = useState(false);

	useEffect(() => {
		if (!enabled || index !== null || isError) return;

		let cancelled = false;

		loadCourseAutocomplete()
			.then((loadedIndex) => {
				if (!cancelled) setIndex(loadedIndex);
			})
			.catch(() => {
				if (!cancelled) setIsError(true);
			});

		return () => {
			cancelled = true;
		};
	}, [enabled, index, isError]);

	return {
		courses: index?.courses ?? null,
		index,
		isLoading: enabled && index === null && !isError,
		isError,
	};
}

async function loadCourseAutocomplete(): Promise<CourseAutocompleteIndex> {
	if (cachedIndex) return cachedIndex;

	loadPromise ??= fetch(COURSE_AUTOCOMPLETE_URL)
		.then(async (response) => {
			if (!response.ok) {
				throw new Error(`Course autocomplete failed: ${response.status}`);
			}
			return (await response.json()) as CourseAutocompleteCourse[];
		})
		.then((courses) => {
			const index = buildCourseAutocompleteIndex(courses);
			cachedIndex = index;
			return index;
		})
		.catch((error: unknown) => {
			loadPromise = null;
			throw error;
		});

	return loadPromise;
}
