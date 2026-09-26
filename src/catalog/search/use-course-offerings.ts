import { useEffect, useMemo, useState } from "react";

const COURSE_OFFERINGS_URL = "/generated/course-offerings.json";

export type CourseOfferingsByTerm = Record<string, string[]>;

let cachedOfferings: CourseOfferingsByTerm | null = null;
let loadPromise: Promise<CourseOfferingsByTerm> | null = null;

export function useCourseOfferings(
	term: string,
	enabled: boolean,
): {
	offeredPids: ReadonlySet<string> | null;
	isLoading: boolean;
	isError: boolean;
} {
	const [offerings, setOfferings] = useState<CourseOfferingsByTerm | null>(
		() => cachedOfferings,
	);
	const [isError, setIsError] = useState(false);

	useEffect(() => {
		if (!enabled || offerings !== null || isError) return;

		let cancelled = false;

		loadCourseOfferings()
			.then((loadedOfferings) => {
				if (!cancelled) setOfferings(loadedOfferings);
			})
			.catch(() => {
				if (!cancelled) setIsError(true);
			});

		return () => {
			cancelled = true;
		};
	}, [enabled, offerings, isError]);

	const offeredPids = useMemo(() => {
		const pids = offerings?.[term];
		return pids ? new Set(pids) : null;
	}, [offerings, term]);

	return {
		offeredPids,
		isLoading: enabled && offerings === null && !isError,
		isError,
	};
}

async function loadCourseOfferings(): Promise<CourseOfferingsByTerm> {
	if (cachedOfferings) return cachedOfferings;

	loadPromise ??= fetch(COURSE_OFFERINGS_URL)
		.then(async (response) => {
			if (!response.ok) {
				throw new Error(`Course offerings failed: ${response.status}`);
			}
			return (await response.json()) as CourseOfferingsByTerm;
		})
		.then((offerings) => {
			cachedOfferings = offerings;
			return offerings;
		})
		.catch((error: unknown) => {
			loadPromise = null;
			throw error;
		});

	return loadPromise;
}
