import { queryOptions } from "@tanstack/react-query";
import { getMySchedule } from "../utils/scheduler.functions";
import { getMyScheduleShare } from "../utils/sharing.functions";

export const scheduleQueryKey = (term: string) => ["schedule", term] as const;
export const scheduleShareQueryKey = (term: string) =>
	["schedule", term, "share"] as const;

export const scheduleQueries = {
	mine(term: string) {
		return queryOptions({
			queryKey: scheduleQueryKey(term),
			queryFn: () => getMySchedule({ data: { term } }),
			staleTime: 10_000,
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
