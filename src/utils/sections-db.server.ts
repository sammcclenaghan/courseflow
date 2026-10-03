import { env } from "cloudflare:workers";
import { refreshStaleSeats } from "./seat-refresh.server";
import { groupSections, type SectionRow } from "./sections-domain.server";

export async function listSectionsByPidAndTermFromDb(
	pid: string,
	term: string,
) {
	const { results } = await env.DB.prepare(
		`SELECT * FROM sections
WHERE course_pid = ? AND term = ?
ORDER BY schedule_type, crn`,
	)
		.bind(pid, term)
		.all<SectionRow>();

	refreshStaleSeats(term, results);
	return groupSections(results);
}
