import { queryOptions } from "@tanstack/react-query";
import { getSharedScheduleById } from "../utils/sharing.functions";

export const sharedScheduleQueries = {
	byShareId(shareId: string) {
		return queryOptions({
			queryKey: ["sharedSchedule", shareId],
			queryFn: () => getSharedScheduleById({ data: { shareId } }),
			refetchOnWindowFocus: true,
		});
	},
};
