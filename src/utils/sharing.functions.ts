import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { setNoStore } from "./response-cache.server";
import type {
	ScheduleShareResult,
	ScheduleWithSections,
	SharedScheduleWithSections,
} from "./scheduler-types";

type TermInput = { term: string };
type ShareInput = { shareId: string };

export const getMyScheduleShare = createServerFn({ method: "GET" })
	.validator((data: TermInput) => data)
	.handler(async ({ data }): Promise<ScheduleShareResult | null> => {
		setNoStore({ varyByCookie: true });
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
		setNoStore({ varyByCookie: true });
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
		setNoStore({ varyByCookie: true });
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
		setNoStore({ varyByCookie: true });
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
		setNoStore({ varyByCookie: true });
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
