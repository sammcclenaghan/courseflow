import { queryOptions, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
	buildCourseAutocompleteIndex,
	type CourseAutocompleteCourse,
} from "@/catalog/search/course-autocomplete";

export const COURSE_AUTOCOMPLETE_URL = "/generated/course-autocomplete.json";
export const COURSE_OFFERINGS_URL = "/generated/course-offerings.json";

type CourseOfferingsByTerm = Record<string, string[]>;

// Plain fetch() on purpose: the landing page preloads these files, and only a
// request with fetch()'s default credentials mode reuses the preload.
async function fetchGenerated<T>(url: string): Promise<T> {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`${url} failed: ${response.status}`);
	return response.json();
}

// Generated at build time, so they never change while the page is open.
const generatedQueries = {
	courseAutocomplete: queryOptions({
		queryKey: ["generated", "course-autocomplete"],
		queryFn: async () =>
			buildCourseAutocompleteIndex(
				await fetchGenerated<CourseAutocompleteCourse[]>(
					COURSE_AUTOCOMPLETE_URL,
				),
			),
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: Number.POSITIVE_INFINITY,
	}),
	courseOfferings: queryOptions({
		queryKey: ["generated", "course-offerings"],
		queryFn: () => fetchGenerated<CourseOfferingsByTerm>(COURSE_OFFERINGS_URL),
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: Number.POSITIVE_INFINITY,
	}),
};

export function useCourseAutocomplete(enabled: boolean) {
	const { data, isLoading, isError } = useQuery({
		...generatedQueries.courseAutocomplete,
		enabled,
	});
	return {
		courses: data?.courses ?? null,
		index: data ?? null,
		isLoading,
		isError,
	};
}

export function useCourseOfferings(term: string, enabled: boolean) {
	const { data, isLoading, isError } = useQuery({
		...generatedQueries.courseOfferings,
		enabled,
	});
	const offeredPids = useMemo(() => {
		const pids = data?.[term];
		return pids ? new Set(pids) : null;
	}, [data, term]);
	return { offeredPids, isLoading, isError };
}
