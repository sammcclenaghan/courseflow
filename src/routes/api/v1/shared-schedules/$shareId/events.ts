import { env } from "cloudflare:workers";
import { createFileRoute } from "@tanstack/react-router";
import {
	getSharedSchedule,
	scheduleErrorResponse,
} from "@/utils/scheduler-db.server";

export const Route = createFileRoute(
	"/api/v1/shared-schedules/$shareId/events",
)({
	server: {
		handlers: {
			GET: async ({ params, request }) => {
				try {
					const upgradeHeader = request.headers.get("Upgrade");
					if (upgradeHeader?.toLowerCase() !== "websocket") {
						return new Response("Expected Upgrade: websocket", { status: 426 });
					}

					const shared = await getSharedSchedule(params.shareId);
					if (!shared) {
						return new Response("Shared schedule not found", { status: 404 });
					}

					const room = env.SCHEDULE_SHARE_ROOM.getByName(params.shareId);
					return room.fetch(request);
				} catch (error) {
					return scheduleErrorResponse(error);
				}
			},
		},
	},
});
