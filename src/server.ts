import handler from "@tanstack/react-start/server-entry";

export { ScheduleShareRoom } from "./durable-objects/schedule-share-room";

export default {
	fetch: handler.fetch,
};
