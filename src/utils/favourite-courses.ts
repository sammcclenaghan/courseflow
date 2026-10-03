import { useCallback, useEffect, useMemo, useState } from "react";
import type { CourseSearchResult } from "@/utils/catalog-types";

export const FAVOURITE_COURSES_STORAGE_KEY = "courseflow:favourite-courses";
const CHANGE_EVENT = "courseflow:favourite-courses-change";

type FavouriteCourse = CourseSearchResult & {
	favouritedAt: string;
};

function isFavouriteCourse(value: unknown): value is FavouriteCourse {
	if (!value || typeof value !== "object") return false;

	const course = value as Partial<FavouriteCourse>;
	return (
		typeof course.pid === "string" &&
		typeof course.subjectCode === "string" &&
		typeof course.title === "string" &&
		typeof course.credits === "string" &&
		typeof course.favouritedAt === "string"
	);
}

export function parseStoredFavouriteCourses(
	raw: string | null,
): FavouriteCourse[] {
	if (!raw) return [];

	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];

		return parsed.filter(isFavouriteCourse);
	} catch {
		return [];
	}
}

function readStoredFavourites() {
	if (typeof window === "undefined") return [];
	return parseStoredFavouriteCourses(
		window.localStorage.getItem(FAVOURITE_COURSES_STORAGE_KEY),
	);
}

function writeStoredFavourites(courses: FavouriteCourse[]) {
	if (typeof window === "undefined") return;

	try {
		window.localStorage.setItem(
			FAVOURITE_COURSES_STORAGE_KEY,
			JSON.stringify(courses),
		);
		window.dispatchEvent(new Event(CHANGE_EVENT));
	} catch {
		// Ignore localStorage failures.
	}
}

function byNewest(courses: FavouriteCourse[]) {
	return [...courses].sort((a, b) =>
		b.favouritedAt.localeCompare(a.favouritedAt),
	);
}

export function useFavouriteCourses() {
	const [storedFavourites, setStoredFavourites] = useState<FavouriteCourse[]>(
		() => readStoredFavourites(),
	);

	useEffect(() => {
		function refreshFavourites() {
			setStoredFavourites(readStoredFavourites());
		}

		window.addEventListener(CHANGE_EVENT, refreshFavourites);
		window.addEventListener("storage", refreshFavourites);

		return () => {
			window.removeEventListener(CHANGE_EVENT, refreshFavourites);
			window.removeEventListener("storage", refreshFavourites);
		};
	}, []);

	const favourites = useMemo(
		() => byNewest(storedFavourites),
		[storedFavourites],
	);

	const isFavourite = useCallback(
		(pid: string) =>
			storedFavourites.some((savedCourse) => savedCourse.pid === pid),
		[storedFavourites],
	);

	const toggleFavourite = useCallback((course: CourseSearchResult) => {
		const current = readStoredFavourites();
		const isSaved = current.some(
			(savedCourse) => savedCourse.pid === course.pid,
		);
		const next: FavouriteCourse[] = isSaved
			? current.filter((savedCourse) => savedCourse.pid !== course.pid)
			: [
					{
						pid: course.pid,
						subjectCode: course.subjectCode,
						title: course.title,
						credits: course.credits,
						favouritedAt: new Date().toISOString(),
					},
					...current,
				];

		writeStoredFavourites(next);
		setStoredFavourites(next);
	}, []);

	return {
		favourites,
		isFavourite,
		toggleFavourite,
	};
}
