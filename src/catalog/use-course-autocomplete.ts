import { useEffect, useState } from "react";
import type { CourseAutocompleteCourse } from "./course-autocomplete";

const COURSE_AUTOCOMPLETE_URL = "/generated/course-autocomplete.json";

let cachedCourses: CourseAutocompleteCourse[] | null = null;
let loadPromise: Promise<CourseAutocompleteCourse[]> | null = null;

export function useCourseAutocomplete(enabled: boolean): {
	courses: CourseAutocompleteCourse[] | null;
	isLoading: boolean;
	isError: boolean;
} {
	const [courses, setCourses] = useState<CourseAutocompleteCourse[] | null>(
		() => cachedCourses,
	);
	const [isError, setIsError] = useState(false);

	useEffect(() => {
		if (!enabled || courses !== null || isError) return;

		let cancelled = false;

		loadCourseAutocomplete()
			.then((loadedCourses) => {
				if (!cancelled) setCourses(loadedCourses);
			})
			.catch(() => {
				if (!cancelled) setIsError(true);
			});

		return () => {
			cancelled = true;
		};
	}, [enabled, courses, isError]);

	return {
		courses,
		isLoading: enabled && courses === null && !isError,
		isError,
	};
}

async function loadCourseAutocomplete(): Promise<CourseAutocompleteCourse[]> {
	if (cachedCourses) return cachedCourses;

	loadPromise ??= fetch(COURSE_AUTOCOMPLETE_URL)
		.then(async (response) => {
			if (!response.ok) {
				throw new Error(`Course autocomplete failed: ${response.status}`);
			}
			return (await response.json()) as CourseAutocompleteCourse[];
		})
		.then((courses) => {
			cachedCourses = courses;
			return courses;
		})
		.catch((error: unknown) => {
			loadPromise = null;
			throw error;
		});

	return loadPromise;
}
