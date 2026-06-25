import { queryOptions } from "@tanstack/react-query";
import { getSharedScheduleById } from "../utils/sharing.functions";

export const sharedScheduleQueryKey = (shareId: string) =>
	["sharedSchedule", shareId] as const;

export const sharedScheduleQueries = {
	byShareId(shareId: string) {
		return queryOptions({
			queryKey: sharedScheduleQueryKey(shareId),
			queryFn: () => getSharedScheduleById({ data: { shareId } }),
			refetchOnWindowFocus: true,
		});
	},
};
