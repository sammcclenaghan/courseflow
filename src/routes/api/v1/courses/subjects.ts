import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";

interface SubjectCodeRow {
	subject_code: string;
}

export const Route = createFileRoute("/api/v1/courses/subjects")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const term = url.searchParams.get("term")?.trim() ?? "";

				const statement = term
					? env.DB.prepare(
							`SELECT DISTINCT c.subject_code
FROM courses c
JOIN sections s ON s.course_pid = c.pid
WHERE s.term = ?
ORDER BY c.subject_code`,
						).bind(term)
					: env.DB.prepare(
							"SELECT subject_code FROM courses ORDER BY subject_code",
						);

				const { results } = await statement.all<SubjectCodeRow>();
				const counts = new Map<string, number>();

				for (const row of results) {
					const subject =
						row.subject_code.match(/^[A-Za-z]+/)?.[0] ?? row.subject_code;
					const normalizedSubject = subject.toUpperCase();
					counts.set(
						normalizedSubject,
						(counts.get(normalizedSubject) ?? 0) + 1,
					);
				}

				return Response.json(
					Array.from(counts, ([subject, courseCount]) => ({
						subject,
						courseCount,
					})).sort((a, b) => a.subject.localeCompare(b.subject)),
				);
			},
		},
	},
});
