import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";

interface CourseRow {
	id: number;
	pid: string;
	subject_code: string;
	title: string;
	description: string;
	credits: string;
	hours_catalog_text: string;
	notes: string;
	pre_and_corequisites: string;
	created_at: string;
	updated_at: string;
}

export const Route = createFileRoute("/api/v1/courses/code/$subjectCode")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				const course = await env.DB.prepare(
					"SELECT * FROM courses WHERE subject_code = ? COLLATE NOCASE LIMIT 1",
				)
					.bind(params.subjectCode)
					.first<CourseRow>();

				if (!course) {
					return Response.json({ error: "course not found" }, { status: 404 });
				}

				return Response.json({
					id: course.id,
					pid: course.pid,
					subjectCode: course.subject_code,
					title: course.title,
					description: course.description,
					credits: course.credits,
					hoursCatalogText: course.hours_catalog_text,
					notes: course.notes,
					preAndCorequisites: course.pre_and_corequisites,
					createdAt: course.created_at,
					updatedAt: course.updated_at,
				});
			},
		},
	},
});
