import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import type {
	ScheduleShareResult,
	ScheduleWithSections,
	SharedScheduleWithSections,
} from "./schedule-types";

type TermInput = { term: string };
type SaveScheduleInput = TermInput & { crns: string[] };
type ShareInput = { shareId: string };

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
				import("./schedules.server"),
				import("./schedule-session.server"),
			]);

		return getScheduleByToken(data.term, getOrCreateAnonymousScheduleToken());
	});

export const saveMySchedule = createServerFn({ method: "POST" })
	.validator((data: SaveScheduleInput) => data)
	.handler(async ({ data }): Promise<ScheduleWithSections | null> => {
		noStore();
		const [{ saveScheduleByToken }, { getOrCreateAnonymousScheduleToken }] =
			await Promise.all([
				import("./schedules.server"),
				import("./schedule-session.server"),
			]);

		return saveScheduleByToken(
			data.term,
			getOrCreateAnonymousScheduleToken(),
			data.crns,
		);
	});

export const getMyScheduleShare = createServerFn({ method: "GET" })
	.validator((data: TermInput) => data)
	.handler(async ({ data }): Promise<ScheduleShareResult | null> => {
		noStore();
		const [{ getScheduleShareByToken }, { getOrCreateAnonymousScheduleToken }] =
			await Promise.all([
				import("./schedules.server"),
				import("./schedule-session.server"),
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
				import("./schedules.server"),
				import("./schedule-session.server"),
			]);

		return createScheduleShare(data.term, getOrCreateAnonymousScheduleToken());
	});

export const regenerateMyScheduleShare = createServerFn({ method: "POST" })
	.validator((data: TermInput) => data)
	.handler(async ({ data }): Promise<ScheduleShareResult> => {
		noStore();
		const [{ regenerateScheduleShare }, { getOrCreateAnonymousScheduleToken }] =
			await Promise.all([
				import("./schedules.server"),
				import("./schedule-session.server"),
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
				import("./schedules.server"),
				import("./schedule-session.server"),
			]);

		await revokeScheduleShare(data.term, getOrCreateAnonymousScheduleToken());
	});

export const getSharedScheduleById = createServerFn({ method: "GET" })
	.validator((data: ShareInput) => data)
	.handler(async ({ data }): Promise<SharedScheduleWithSections | null> => {
		setResponseHeader("Cache-Control", "public, max-age=15");
		const { getSharedSchedule } = await import("./schedules.server");
		return getSharedSchedule(data.shareId);
	});

export const copySharedScheduleToMine = createServerFn({ method: "POST" })
	.validator((data: ShareInput) => data)
	.handler(async ({ data }): Promise<ScheduleWithSections> => {
		noStore();
		const [{ copySharedSchedule }, { getOrCreateAnonymousScheduleToken }] =
			await Promise.all([
				import("./schedules.server"),
				import("./schedule-session.server"),
			]);

		return copySharedSchedule(
			data.shareId,
			getOrCreateAnonymousScheduleToken(),
		);
	});
