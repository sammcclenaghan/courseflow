import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import type { ScheduleWithSections } from "./scheduler-types";

type TermInput = { term: string };
type SaveScheduleInput = TermInput & { crns: string[] };

function noStore() {
	setResponseHeader("Cache-Control", "no-store");
	setResponseHeader("Vary", "Cookie");
}

export const getMySchedule = createServerFn({ method: "GET" })
	.validator((data: TermInput) => data)
	.handler(async ({ data }): Promise<ScheduleWithSections | null> => {
		noStore();
		const [{ getScheduleByToken }, { getOrCreateAnonymousScheduleToken }] =
			await Promise.all([
				import("./scheduler-db.server"),
				import("./scheduler-session.server"),
			]);

		return getScheduleByToken(data.term, getOrCreateAnonymousScheduleToken());
	});

export const saveMySchedule = createServerFn({ method: "POST" })
	.validator((data: SaveScheduleInput) => data)
	.handler(async ({ data }): Promise<ScheduleWithSections | null> => {
		noStore();
		const [{ saveScheduleByToken }, { getOrCreateAnonymousScheduleToken }] =
			await Promise.all([
				import("./scheduler-db.server"),
				import("./scheduler-session.server"),
			]);

		return saveScheduleByToken(
			data.term,
			getOrCreateAnonymousScheduleToken(),
			data.crns,
		);
	});
