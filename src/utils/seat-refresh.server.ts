import { env, waitUntil } from "cloudflare:workers";
import { openSearch } from "@/catalog/banner";
import type { SectionRow } from "./sections-domain.server";

const STALE_AFTER_MS = 6 * 60 * 60 * 1000;
const MAX_COURSES = 8;

export function refreshStaleSeats(term: string, rows: SectionRow[]): void {
	if (import.meta.env.DEV) return;
	waitUntil(
		refresh(term, rows).catch((error) =>
			console.error("seat refresh failed", error),
		),
	);
}

async function refresh(term: string, rows: SectionRow[]): Promise<void> {
	const cutoff = new Date(Date.now() - STALE_AFTER_MS).toISOString();
	const stale = new Map<string, SectionRow>();
	for (const row of rows) {
		if (
			row.enrollment_updated_at !== null &&
			row.enrollment_updated_at > cutoff
		)
			continue;
		stale.set(`${row.subject} ${row.course_number}`, row);
	}
	const candidates = [...stale.values()].slice(0, MAX_COURSES);
	if (candidates.length === 0) return;

	const claims = await env.DB.batch(
		candidates.map((row) =>
			env.DB.prepare(
				`UPDATE sections SET enrollment_updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE term = ? AND subject = ? AND course_number = ?
AND (enrollment_updated_at IS NULL OR enrollment_updated_at <= ?)`,
			).bind(term, row.subject, row.course_number, cutoff),
		),
	);
	const claimed = candidates.filter((_, i) => claims[i].meta.changes > 0);

	if (claimed.length === 0) return;

	const search = await openSearch(term);
	const updates: D1PreparedStatement[] = [];
	for (const course of claimed) {
		const sections = await search({
			txt_subject: course.subject,
			txt_courseNumber: course.course_number,
		});
		for (const section of sections) {
			updates.push(
				env.DB.prepare(
					`UPDATE sections SET
enrollment_actual = ?, enrollment_maximum = ?, enrollment_seats_available = ?,
waitlist_actual = ?, waitlist_capacity = ?, waitlist_seats_available = ?
WHERE term = ? AND crn = ?`,
				).bind(
					section.seats.enrolled,
					section.seats.capacity,
					section.seats.available,
					section.waitlist.enrolled,
					section.waitlist.capacity,
					section.waitlist.available,
					term,
					section.crn,
				),
			);
		}
	}
	if (updates.length > 0) await env.DB.batch(updates);
}
