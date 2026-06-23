import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";

interface CourseRow {
	pid: string;
	subject_code: string;
	title: string;
	credits: string;
}

export const Route = createFileRoute("/api/v1/courses/search")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const query = url.searchParams.get("q")?.trim() ?? "";
				const term = url.searchParams.get("term")?.trim() ?? "";

				if (query === "") {
					return Response.json(
						{ error: "missing required query parameter: q" },
						{ status: 400 },
					);
				}

				const codePrefix = `${query}%`;
				const compactCodePrefix = `${query.replaceAll(" ", "")}%`;
				const includeTitle = query.length >= 3;
				const titleClause = includeTitle ? " OR c.title LIKE ?" : "";
				const titleParams = includeTitle ? [`%${query}%`] : [];
				const termClause = term
					? "EXISTS (SELECT 1 FROM sections s WHERE s.course_pid = c.pid AND s.term = ?) AND "
					: "";
				const termParams = term ? [term] : [];

				const { results } = await env.DB.prepare(
					`SELECT c.pid, c.subject_code, c.title, c.credits FROM courses c
WHERE ${termClause}(
  c.subject_code LIKE ?
  OR REPLACE(c.subject_code, ' ', '') LIKE ?
  ${titleClause}
)
ORDER BY
  (
    c.subject_code LIKE ?
    OR REPLACE(c.subject_code, ' ', '') LIKE ?
  ) DESC,
  c.subject_code
LIMIT 50`,
				)
					.bind(
						...termParams,
						codePrefix,
						compactCodePrefix,
						...titleParams,
						codePrefix,
						compactCodePrefix,
					)
					.all<CourseRow>();

				return Response.json(
					results.map((row) => ({
						pid: row.pid,
						subjectCode: row.subject_code,
						title: row.title,
						credits: row.credits,
					})),
				);
			},
		},
	},
});
