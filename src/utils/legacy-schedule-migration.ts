import { isTermValue } from "./constants";

export const LEGACY_SCHEDULE_TOKEN_STORAGE_KEY = "courseflow:schedule-token";
export const LEGACY_SAVED_COURSES_STORAGE_KEY = "courseflow:saved-courses";
export const LEGACY_MIGRATION_STORAGE_KEY = "courseflow:v4-migrated";

export type LegacyScheduleMigrationInput = {
	legacyToken: string;
	schedules: LegacyScheduleMigrationTerm[];
};

export type LegacyScheduleMigrationTerm = {
	term: string;
	crns: string[];
};

const UUID_RE =
	/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[1-5][a-fA-F0-9]{3}-[89abAB][a-fA-F0-9]{3}-[a-fA-F0-9]{12}$/;

export function buildLegacyScheduleMigrationInput(
	legacyToken: string | null,
	savedCoursesJson: string | null,
): LegacyScheduleMigrationInput | null {
	const token = legacyToken?.trim();
	if (!token || !UUID_RE.test(token)) return null;
	if (!savedCoursesJson) return null;

	const savedCourses = parseJson(savedCoursesJson);
	if (!Array.isArray(savedCourses)) return null;

	const crnsByTerm = new Map<string, Set<string>>();

	for (const savedCourse of savedCourses) {
		if (!isRecord(savedCourse) || typeof savedCourse.term !== "string") {
			continue;
		}

		const term = savedCourse.term.trim();
		if (!isTermValue(term) || !Array.isArray(savedCourse.sections)) continue;

		let crns = crnsByTerm.get(term);
		if (!crns) {
			crns = new Set<string>();
			crnsByTerm.set(term, crns);
		}

		for (const section of savedCourse.sections) {
			if (!isRecord(section) || typeof section.crn !== "string") continue;
			const crn = section.crn.trim();
			if (crn !== "") crns.add(crn);
		}
	}

	const schedules = [...crnsByTerm.entries()]
		.map(([term, crns]) => ({ term, crns: [...crns] }))
		.filter((schedule) => schedule.crns.length > 0);

	return schedules.length > 0 ? { legacyToken: token, schedules } : null;
}

function parseJson(value: string): unknown {
	try {
		return JSON.parse(value);
	} catch {
		return null;
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
