import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
	buildLegacyScheduleMigrationInput,
	LEGACY_MIGRATION_STORAGE_KEY,
	LEGACY_SAVED_COURSES_STORAGE_KEY,
	LEGACY_SCHEDULE_TOKEN_STORAGE_KEY,
} from "@/utils/legacy-schedule-migration";
import { migrateLegacySchedule } from "@/utils/scheduler.functions";

export function LegacyScheduleMigration() {
	const queryClient = useQueryClient();
	const didStartRef = useRef(false);

	useEffect(() => {
		if (didStartRef.current) return;
		didStartRef.current = true;

		let input = null;
		try {
			if (window.localStorage.getItem(LEGACY_MIGRATION_STORAGE_KEY)) return;

			input = buildLegacyScheduleMigrationInput(
				window.localStorage.getItem(LEGACY_SCHEDULE_TOKEN_STORAGE_KEY),
				window.localStorage.getItem(LEGACY_SAVED_COURSES_STORAGE_KEY),
			);

			if (!input) {
				markMigrationComplete("no-data");
				return;
			}
		} catch (error) {
			console.warn("Unable to read legacy CourseFlow schedule", error);
			return;
		}

		let cancelled = false;

		migrateLegacySchedule({ data: input })
			.then((result) => {
				if (cancelled) return;
				markMigrationComplete(result.status, result.migratedTerms);
				void queryClient.invalidateQueries({ queryKey: ["schedule"] });
			})
			.catch((error) => {
				if (!cancelled) {
					console.warn("Unable to migrate legacy CourseFlow schedule", error);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [queryClient]);

	return null;
}

function markMigrationComplete(status: string, migratedTerms: string[] = []) {
	try {
		window.localStorage.setItem(
			LEGACY_MIGRATION_STORAGE_KEY,
			JSON.stringify({
				status,
				migratedTerms,
				migratedAt: new Date().toISOString(),
			}),
		);
	} catch {
		// Ignore localStorage failures. The migration endpoint is idempotent.
	}
}
