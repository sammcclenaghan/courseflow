import { queryOptions } from "@tanstack/react-query";
import {
	getCourseAlternatives,
	getCourseBySubjectCode,
	listSubjects,
	searchCourses,
} from "@/utils/catalog.functions";
import type { AlternativeMode } from "@/utils/catalog-types";
import { listSectionsByPidAndTerm } from "@/utils/sections.functions";

export const catalogQueries = {
	subjects(term?: string) {
		return queryOptions({
			queryKey: ["courses", "subjects", term ?? "all"],
			queryFn: () => listSubjects({ data: { term } }),
			staleTime: 10 * 60_000,
		});
	},
	search(query: string, term?: string) {
		return queryOptions({
			queryKey: ["courses", "search", query, term ?? "all"],
			queryFn: () => searchCourses({ data: { query, term } }),
			enabled: query.length > 0,
			staleTime: 60_000,
		});
	},
	bySubjectCode(subjectCode: string) {
		return queryOptions({
			queryKey: ["courses", "bySubjectCode", subjectCode],
			queryFn: () => getCourseBySubjectCode({ data: { subjectCode } }),
			enabled: subjectCode.length > 0,
			staleTime: 10 * 60_000,
		});
	},
	alternatives(params: {
		subjectCode: string;
		term: string;
		mode: AlternativeMode;
		limit?: number;
	}) {
		return queryOptions({
			queryKey: [
				"courses",
				"alternatives",
				params.subjectCode,
				params.term,
				params.mode,
				params.limit ?? 8,
			],
			queryFn: () => getCourseAlternatives({ data: params }),
			enabled: params.subjectCode.length > 0,
			staleTime: 10 * 60_000,
		});
	},
};

export const catalogSectionQueries = {
	byPidAndTerm(pid: string, term: string) {
		return queryOptions({
			queryKey: ["sections", pid, term],
			queryFn: () => listSectionsByPidAndTerm({ data: { pid, term } }),
			enabled: pid.length > 0,
			staleTime: 60_000,
		});
	},
};
