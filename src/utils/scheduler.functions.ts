import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { isTermValue } from "./constants";
import type { LegacyScheduleMigrationInput } from "./legacy-schedule-migration";
import {
	MAX_SCHEDULE_CRNS,
	normalizeScheduleCrns,
	ScheduleRequestError,
} from "./scheduler-shared";
import type { ScheduleWithSections } from "./scheduler-types";

type TermInput = { term: string };
type SaveScheduleInput = TermInput & { crns: string[] };

type LegacyScheduleMigrationResult = {
	status: "empty" | "migrated" | "skipped";
	migratedTerms: string[];
	skippedTerms: { term: string; reason: string }[];
};

const UUID_RE =
	/^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[1-5][a-fA-F0-9]{3}-[89abAB][a-fA-F0-9]{3}-[a-fA-F0-9]{12}$/;

function noStore() {
	setResponseHeader("Cache-Control", "no-store");
	setResponseHeader("Vary", "Cookie");
}

export const getMySchedule = createServerFn({ method: "GET" })
	.validator((data: TermInput) => data)
	.handler(async ({ data }): Promise<ScheduleWithSections | null> => {
		noStore();
		const [{ getScheduleByToken }, { getOrCreateAnonymousScheduleToken }] =
			await Promise.all([
				import("./scheduler-db.server"),
				import("./scheduler-session.server"),
			]);

		return getScheduleByToken(data.term, getOrCreateAnonymousScheduleToken());
	});

export const saveMySchedule = createServerFn({ method: "POST" })
	.validator((data: SaveScheduleInput) => data)
	.handler(async ({ data }): Promise<ScheduleWithSections | null> => {
		noStore();
		const [{ saveScheduleByToken }, { getOrCreateAnonymousScheduleToken }] =
			await Promise.all([
				import("./scheduler-db.server"),
				import("./scheduler-session.server"),
			]);

		return saveScheduleByToken(
			data.term,
			getOrCreateAnonymousScheduleToken(),
			data.crns,
		);
	});

export const migrateLegacySchedule = createServerFn({ method: "POST" })
	.validator(validateLegacyScheduleMigrationInput)
	.handler(async ({ data }): Promise<LegacyScheduleMigrationResult> => {
		noStore();
		const [scheduleDb, scheduleSession] = await Promise.all([
			import("./scheduler-db.server"),
			import("./scheduler-session.server"),
		]);

		if (data.schedules.length === 0) {
			return { status: "empty", migratedTerms: [], skippedTerms: [] };
		}

		const currentToken = scheduleSession.getAnonymousScheduleToken();
		if (currentToken && currentToken !== data.legacyToken) {
			const currentSchedules = await Promise.all(
				data.schedules.map((schedule) =>
					scheduleDb.getScheduleByToken(schedule.term, currentToken),
				),
			);

			if (currentSchedules.some(Boolean)) {
				return {
					status: "skipped",
					migratedTerms: [],
					skippedTerms: data.schedules.map((schedule) => ({
						term: schedule.term,
						reason: "existing-v4-schedule",
					})),
				};
			}
		}

		scheduleSession.setAnonymousScheduleToken(data.legacyToken);

		const migratedTerms: string[] = [];
		const skippedTerms: LegacyScheduleMigrationResult["skippedTerms"] = [];

		for (const schedule of data.schedules) {
			const existingLegacySchedule = await scheduleDb.getScheduleByToken(
				schedule.term,
				data.legacyToken,
			);
			if (existingLegacySchedule) {
				skippedTerms.push({
					term: schedule.term,
					reason: "already-migrated",
				});
				continue;
			}

			const validCrns = await scheduleDb.filterExistingSectionCrns(
				schedule.term,
				schedule.crns,
			);
			if (validCrns.length === 0) {
				skippedTerms.push({ term: schedule.term, reason: "no-valid-crns" });
				continue;
			}

			await scheduleDb.saveScheduleByToken(
				schedule.term,
				data.legacyToken,
				validCrns,
			);
			migratedTerms.push(schedule.term);
		}

		return {
			status: migratedTerms.length > 0 ? "migrated" : "skipped",
			migratedTerms,
			skippedTerms,
		};
	});

function validateLegacyScheduleMigrationInput(
	data: LegacyScheduleMigrationInput,
): LegacyScheduleMigrationInput {
	if (!isRecord(data)) {
		throw new ScheduleRequestError("migration payload must be an object", 400);
	}

	if (typeof data.legacyToken !== "string" || !UUID_RE.test(data.legacyToken)) {
		throw new ScheduleRequestError("invalid legacy schedule token", 400);
	}

	if (!Array.isArray(data.schedules)) {
		throw new ScheduleRequestError("schedules must be an array", 400);
	}

	const schedulesByTerm = new Map<string, string[]>();
	for (const schedule of data.schedules) {
		if (!isRecord(schedule) || typeof schedule.term !== "string") {
			throw new ScheduleRequestError("invalid schedule migration entry", 400);
		}

		const term = schedule.term.trim();
		if (!isTermValue(term)) continue;

		const existing = schedulesByTerm.get(term) ?? [];
		schedulesByTerm.set(term, [
			...existing,
			...normalizeScheduleCrns(schedule.crns),
		]);
	}

	return {
		legacyToken: data.legacyToken,
		schedules: [...schedulesByTerm.entries()].map(([term, crns]) => ({
			term,
			crns: normalizeScheduleCrns(crns).slice(0, MAX_SCHEDULE_CRNS),
		})),
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
