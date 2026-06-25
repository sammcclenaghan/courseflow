import { queryOptions } from "@tanstack/react-query";
import { searchCourses } from "./courses";
import {
	getMySchedule,
	getMyScheduleShare,
	getSharedScheduleById,
} from "./schedules";
import { listSectionsByPidAndTerm } from "./sections";

export const scheduleQueryKey = (term: string) => ["schedule", term] as const;
export const scheduleShareQueryKey = (term: string) =>
	["schedule", term, "share"] as const;
export const sharedScheduleQueryKey = (shareId: string) =>
	["sharedSchedule", shareId] as const;

export const courseQueries = {
	search(query: string, term?: string) {
		return queryOptions({
			queryKey: ["courses", "search", query, term ?? "all"],
			queryFn: () => searchCourses({ data: { query, term } }),
			enabled: query.length > 0,
		});
	},
};

export const scheduleQueries = {
	mine(term: string) {
		return queryOptions({
			queryKey: scheduleQueryKey(term),
			queryFn: () => getMySchedule({ data: { term } }),
			staleTime: 10_000,
		});
	},
};

export const sectionQueries = {
	byPidAndTerm(pid: string, term: string) {
		return queryOptions({
			queryKey: ["sections", pid, term],
			queryFn: () => listSectionsByPidAndTerm({ data: { pid, term } }),
			staleTime: 60_000,
		});
	},
};

export const scheduleShareQueries = {
	mine(term: string) {
		return queryOptions({
			queryKey: scheduleShareQueryKey(term),
			queryFn: () => getMyScheduleShare({ data: { term } }),
			staleTime: 10_000,
		});
	},
};

export const sharedScheduleQueries = {
	byShareId(shareId: string) {
		return queryOptions({
			queryKey: sharedScheduleQueryKey(shareId),
			queryFn: () => getSharedScheduleById({ data: { shareId } }),
			refetchOnWindowFocus: true,
		});
	},
};
