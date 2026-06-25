import { createFileRoute } from "@tanstack/react-router";
import { getCourseBySubjectCodeFromDb } from "@/utils/catalog-db.server";

export const Route = createFileRoute("/api/v1/courses/code/$subjectCode")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const course = await getCourseBySubjectCodeFromDb(params.subjectCode);

				if (!course) {
					return Response.json({ error: "course not found" }, { status: 404 });
				}

				return Response.json(course);
			},
		},
	},
});
