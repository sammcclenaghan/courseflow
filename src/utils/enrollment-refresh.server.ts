import { mapConcurrent } from "@/importer/catalogImport.shared";
import { fetchEnrollmentCounts } from "@/importer/uvicEnrollment.server";
import { TERMS } from "./constants";

// Each Banner request is a subrequest; the free tier allows 50 per invocation,
// so leave headroom for D1. Least-recently-refreshed sections go first (nulls
// before everything), so the pool rotates across runs.
const MAX_SECTIONS_PER_RUN = 40;
const FETCH_CONCURRENCY = 5;

type RefreshTarget = {
	term: string;
	crn: string;
};

export type EnrollmentRefreshSummary = {
	targeted: number;
	refreshed: number;
	failed: number;
};

export async function refreshSavedScheduleEnrollment(
	db: D1Database,
): Promise<EnrollmentRefreshSummary> {
	const termPlaceholders = TERMS.map(() => "?").join(", ");
	const targets = await db
		.prepare(
			`SELECT DISTINCT s.term AS term, s.crn AS crn
			 FROM sections s
			 JOIN schedule_sections ss ON ss.term = s.term AND ss.crn = s.crn
			 WHERE s.term IN (${termPlaceholders})
			 ORDER BY s.enrollment_updated_at IS NOT NULL, s.enrollment_updated_at
			 LIMIT ?`,
		)
		.bind(...TERMS.map((term) => term.value), MAX_SECTIONS_PER_RUN)
		.all<RefreshTarget>();

	const updates: D1PreparedStatement[] = [];
	let failed = 0;

	await mapConcurrent(
		targets.results,
		FETCH_CONCURRENCY,
		async (target: RefreshTarget) => {
			try {
				const counts = await fetchEnrollmentCounts(target.term, target.crn);
				if (!counts) {
					failed += 1;
					return;
				}
				updates.push(
					db
						.prepare(
							`UPDATE sections SET
							 enrollment_actual = ?,
							 enrollment_maximum = ?,
							 enrollment_seats_available = ?,
							 waitlist_capacity = ?,
							 waitlist_actual = ?,
							 waitlist_seats_available = ?,
							 enrollment_updated_at = ?
							 WHERE term = ? AND crn = ?`,
						)
						.bind(
							counts.enrollmentActual,
							counts.enrollmentMaximum,
							counts.enrollmentSeatsAvailable,
							counts.waitlistCapacity,
							counts.waitlistActual,
							counts.waitlistSeatsAvailable,
							new Date().toISOString(),
							target.term,
							target.crn,
						),
				);
			} catch {
				failed += 1;
			}
		},
	);

	if (updates.length > 0) {
		await db.batch(updates);
	}

	return {
		targeted: targets.results.length,
		refreshed: updates.length,
		failed,
	};
}
