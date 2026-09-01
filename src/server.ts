import handler from "@tanstack/react-start/server-entry";
import { refreshSavedScheduleEnrollment } from "./utils/enrollment-refresh.server";

export { ScheduleShareRoom } from "./durable-objects/schedule-share-room";

export default {
	fetch: handler.fetch,
	async scheduled(
		_controller: ScheduledController,
		env: Env,
		_ctx: ExecutionContext,
	) {
		try {
			const summary = await refreshSavedScheduleEnrollment(env.DB);
			console.log(
				`enrollment refresh: ${summary.refreshed}/${summary.targeted} sections refreshed, ${summary.failed} failed`,
			);
		} catch (error) {
			console.error("enrollment refresh failed", error);
		}
	},
};
