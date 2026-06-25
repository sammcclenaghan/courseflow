import { createFileRoute } from "@tanstack/react-router";
import { listSubjectsFromDb } from "@/utils/catalog-db.server";

export const Route = createFileRoute("/api/v1/courses/subjects")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const url = new URL(request.url);
				const term = url.searchParams.get("term")?.trim() ?? "";

				return Response.json(await listSubjectsFromDb({ term }));
			},
		},
	},
});
