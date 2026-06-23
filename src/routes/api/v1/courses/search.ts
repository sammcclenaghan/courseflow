import { createFileRoute } from "@tanstack/react-router";
import { searchCoursesFromDb } from "@/utils/courses.server";

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

				return Response.json(await searchCoursesFromDb({ query, term }));
			},
		},
	},
});
