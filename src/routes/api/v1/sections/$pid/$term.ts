import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import { groupSections, type SectionRow } from "@/utils/sections.server";

export const Route = createFileRoute("/api/v1/sections/$pid/$term")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const { results } = await env.DB.prepare(
					`SELECT * FROM sections
WHERE course_pid = ? AND term = ?
ORDER BY schedule_type, crn`,
				)
					.bind(params.pid, params.term)
					.all<SectionRow>();

				return Response.json(groupSections(results));
			},
		},
	},
});
