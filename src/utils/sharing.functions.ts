import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import type {
	ScheduleShareResult,
	ScheduleWithSections,
	SharedScheduleWithSections,
} from "./scheduler-types";

type TermInput = { term: string };
type ShareInput = { shareId: string };

function noStore() {
	setResponseHeader("Cache-Control", "no-store");
	setResponseHeader("Vary", "Cookie");
}

export const getMyScheduleShare = createServerFn({ method: "GET" })
	.validator((data: TermInput) => data)
	.handler(async ({ data }): Promise<ScheduleShareResult | null> => {
		noStore();
		const [{ getScheduleShareByToken }, { getOrCreateAnonymousScheduleToken }] =
			await Promise.all([
				import("./scheduler-db.server"),
				import("./scheduler-session.server"),
			]);

		return getScheduleShareByToken(
			data.term,
			getOrCreateAnonymousScheduleToken(),
		);
	});

export const createMyScheduleShare = createServerFn({ method: "POST" })
	.validator((data: TermInput) => data)
	.handler(async ({ data }): Promise<ScheduleShareResult> => {
		noStore();
		const [{ createScheduleShare }, { getOrCreateAnonymousScheduleToken }] =
			await Promise.all([
				import("./scheduler-db.server"),
				import("./scheduler-session.server"),
			]);

		return createScheduleShare(data.term, getOrCreateAnonymousScheduleToken());
	});

export const regenerateMyScheduleShare = createServerFn({ method: "POST" })
	.validator((data: TermInput) => data)
	.handler(async ({ data }): Promise<ScheduleShareResult> => {
		noStore();
		const [{ regenerateScheduleShare }, { getOrCreateAnonymousScheduleToken }] =
			await Promise.all([
				import("./scheduler-db.server"),
				import("./scheduler-session.server"),
			]);

		return regenerateScheduleShare(
			data.term,
			getOrCreateAnonymousScheduleToken(),
		);
	});

export const revokeMyScheduleShare = createServerFn({ method: "POST" })
	.validator((data: TermInput) => data)
	.handler(async ({ data }): Promise<void> => {
		noStore();
		const [{ revokeScheduleShare }, { getOrCreateAnonymousScheduleToken }] =
			await Promise.all([
				import("./scheduler-db.server"),
				import("./scheduler-session.server"),
			]);

		await revokeScheduleShare(data.term, getOrCreateAnonymousScheduleToken());
	});

export const getSharedScheduleById = createServerFn({ method: "GET" })
	.validator((data: ShareInput) => data)
	.handler(async ({ data }): Promise<SharedScheduleWithSections | null> => {
		setResponseHeader("Cache-Control", "public, max-age=15");
		const { getSharedSchedule } = await import("./scheduler-db.server");
		return getSharedSchedule(data.shareId);
	});

export const copySharedScheduleToMine = createServerFn({ method: "POST" })
	.validator((data: ShareInput) => data)
	.handler(async ({ data }): Promise<ScheduleWithSections> => {
		noStore();
		const [{ copySharedSchedule }, { getOrCreateAnonymousScheduleToken }] =
			await Promise.all([
				import("./scheduler-db.server"),
				import("./scheduler-session.server"),
			]);

		return copySharedSchedule(
			data.shareId,
			getOrCreateAnonymousScheduleToken(),
		);
	});
