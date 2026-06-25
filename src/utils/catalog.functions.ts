import { notFound } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import type {
	GetCourseBySubjectCodeInput,
	ListSubjectsInput,
	SearchCoursesInput,
} from "./catalog-types";

export type {
	Course,
	CourseSearchResult,
	GetCourseBySubjectCodeInput,
	ListSubjectsInput,
	SearchCoursesInput,
	SubjectResult,
} from "./catalog-types";

export const searchCourses = createServerFn({ method: "GET" })
	.validator((data: SearchCoursesInput) => data)
	.handler(async ({ data }) => {
		const { searchCoursesFromDb } = await import("./catalog-db.server");
		return searchCoursesFromDb(data);
	});

export const getCourseBySubjectCode = createServerFn({ method: "GET" })
	.validator((data: GetCourseBySubjectCodeInput) => data)
	.handler(async ({ data }) => {
		const { getCourseBySubjectCodeFromDb } = await import(
			"./catalog-db.server"
		);
		const course = await getCourseBySubjectCodeFromDb(data.subjectCode);
		if (!course) {
			throw notFound();
		}
		return course;
	});

export const listSubjects = createServerFn({ method: "GET" })
	.validator((data?: ListSubjectsInput) => data ?? {})
	.handler(async ({ data }) => {
		const { listSubjectsFromDb } = await import("./catalog-db.server");
		return listSubjectsFromDb(data);
	});
