import { useCallback, useEffect, useMemo, useState } from "react";
import type { CourseSearchResult } from "@/utils/catalog-types";

export const FAVOURITE_COURSES_STORAGE_KEY = "courseflow:favourite-courses";
const CHANGE_EVENT = "courseflow:favourite-courses-change";

export type FavouriteCourse = CourseSearchResult & {
	favouritedAt: string;
};

type LegacyFavouriteCourse = string;
export type StoredFavouriteCourse = FavouriteCourse | LegacyFavouriteCourse;

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

function getStoredFavouritePid(value: StoredFavouriteCourse) {
	return typeof value === "string" ? value : value.pid;
}

export function parseStoredFavouriteCourses(
	raw: string | null,
): StoredFavouriteCourse[] {
	if (!raw) return [];

	try {
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];

		return parsed.filter(
			(value): value is StoredFavouriteCourse =>
				typeof value === "string" || isFavouriteCourse(value),
		);
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

function writeStoredFavourites(courses: StoredFavouriteCourse[]) {
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

function getDisplayableFavourites(courses: StoredFavouriteCourse[]) {
	return courses
		.filter(isFavouriteCourse)
		.sort((a, b) => b.favouritedAt.localeCompare(a.favouritedAt));
}

export function useFavouriteCourses() {
	const [storedFavourites, setStoredFavourites] = useState<
		StoredFavouriteCourse[]
	>(() => readStoredFavourites());

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
		() => getDisplayableFavourites(storedFavourites),
		[storedFavourites],
	);

	const isFavourite = useCallback(
		(pid: string) =>
			storedFavourites.some(
				(savedCourse) => getStoredFavouritePid(savedCourse) === pid,
			),
		[storedFavourites],
	);

	const toggleFavourite = useCallback((course: CourseSearchResult) => {
		const current = readStoredFavourites();
		const isSaved = current.some(
			(savedCourse) => getStoredFavouritePid(savedCourse) === course.pid,
		);
		const next: StoredFavouriteCourse[] = isSaved
			? current.filter(
					(savedCourse) => getStoredFavouritePid(savedCourse) !== course.pid,
				)
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

	const removeFavourite = useCallback((pid: string) => {
		const next = readStoredFavourites().filter(
			(course) => getStoredFavouritePid(course) !== pid,
		);
		writeStoredFavourites(next);
		setStoredFavourites(next);
	}, []);

	return {
		favourites,
		isFavourite,
		toggleFavourite,
		removeFavourite,
	};
}
