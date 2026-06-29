import { env } from "cloudflare:workers";
import type { ScheduleShareEvent } from "@/durable-objects/schedule-share-room";
import {
	InvalidScheduleCRNsError,
	normalizeScheduleCrns,
	ScheduleRequestError,
} from "./scheduler-shared";
import {
	mapSection,
	type Section,
	type SectionRow,
} from "./sections-domain.server";

export {
	InvalidScheduleCRNsError,
	normalizeScheduleCrns,
	ScheduleRequestError,
} from "./scheduler-shared";

export type ScheduleResult = {
	id: number;
	term: string;
	createdAt: string;
	updatedAt: string;
};

export type PublicScheduleResult = Omit<ScheduleResult, "id">;

export type ScheduleWithSections = {
	schedule: ScheduleResult;
	sections: Section[];
};

export type SharedScheduleWithSections = {
	share: ScheduleShareResult;
	schedule: PublicScheduleResult;
	sections: Section[];
};

export type ScheduleShareResult = {
	shareId: string;
	term: string;
	createdAt: string;
	updatedAt: string;
};

type ScheduleRow = {
	id: number;
	token: string;
	term: string;
	created_at: string;
	updated_at: string;
};

type ScheduleShareRow = {
	share_id: string;
	schedule_id: number;
	created_at: string;
	updated_at: string;
};

type SharedScheduleRow = ScheduleShareRow & {
	term: string;
	schedule_created_at: string;
	schedule_updated_at: string;
};

export async function getScheduleByToken(
	term: string,
	token: string,
): Promise<ScheduleWithSections | null> {
	const schedule = await findScheduleByToken(term, token);
	if (!schedule) return null;

	return {
		schedule: mapSchedule(schedule),
		sections: await listScheduleSections(schedule.id, schedule.term),
	};
}

export async function saveScheduleByToken(
	term: string,
	token: string,
	crns: string[],
): Promise<ScheduleWithSections | null> {
	const uniqueCrns = normalizeScheduleCrns(crns);
	if (uniqueCrns.length === 0) {
		await deleteScheduleByToken(term, token);
		return null;
	}

	const sections = await loadSectionsByCrns(term, uniqueCrns);
	assertAllCrnsExist(uniqueCrns, sections);

	await env.DB.batch([
		env.DB.prepare(
			`INSERT INTO schedules (token, term)
VALUES (?, ?)
ON CONFLICT(token, term) DO UPDATE SET
  updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
		).bind(token, term),
		env.DB.prepare(
			`DELETE FROM schedule_sections
WHERE schedule_id = (SELECT id FROM schedules WHERE token = ? AND term = ?)`,
		).bind(token, term),
		...uniqueCrns.map((crn, position) =>
			env.DB.prepare(
				`INSERT INTO schedule_sections (schedule_id, term, crn, position)
VALUES ((SELECT id FROM schedules WHERE token = ? AND term = ?), ?, ?, ?)`,
			).bind(token, term, term, crn, position),
		),
	]);

	const saved = await findScheduleByToken(term, token);
	if (!saved) {
		throw new ScheduleRequestError("schedule not found after save", 500);
	}

	await notifyScheduleUpdated(saved.id, saved.updated_at);

	return {
		schedule: mapSchedule(saved),
		sections,
	};
}

export async function filterExistingSectionCrns(
	term: string,
	crns: string[],
): Promise<string[]> {
	const uniqueCrns = normalizeScheduleCrns(crns);
	const sections = await loadSectionsByCrns(term, uniqueCrns);
	const existing = new Set(sections.map((section) => section.crn));
	return uniqueCrns.filter((crn) => existing.has(crn));
}

export async function deleteScheduleByToken(
	term: string,
	token: string,
): Promise<void> {
	const schedule = await findScheduleByToken(term, token);
	const share = schedule ? await findShareByScheduleId(schedule.id) : null;

	await env.DB.batch([
		env.DB.prepare(
			`DELETE FROM schedule_shares
WHERE schedule_id = (SELECT id FROM schedules WHERE token = ? AND term = ?)`,
		).bind(token, term),
		env.DB.prepare(
			`DELETE FROM schedule_sections
WHERE schedule_id = (SELECT id FROM schedules WHERE token = ? AND term = ?)`,
		).bind(token, term),
		env.DB.prepare("DELETE FROM schedules WHERE token = ? AND term = ?").bind(
			token,
			term,
		),
	]);

	if (share) {
		await broadcastShareEvent({
			type: "schedule.deleted",
			shareId: share.share_id,
		});
	}
}

export async function getScheduleShareByToken(
	term: string,
	token: string,
): Promise<ScheduleShareResult | null> {
	const schedule = await findScheduleByToken(term, token);
	if (!schedule) return null;

	const share = await findShareByScheduleId(schedule.id);
	return share ? mapScheduleShare(share, schedule.term) : null;
}

export async function createScheduleShare(
	term: string,
	token: string,
): Promise<ScheduleShareResult> {
	const schedule = await findScheduleByToken(term, token);
	if (!schedule) {
		throw new ScheduleRequestError("schedule not found", 404);
	}

	const existing = await findShareByScheduleId(schedule.id);
	if (existing) return mapScheduleShare(existing, schedule.term);

	const shareId = createShareId();
	await env.DB.prepare(
		"INSERT INTO schedule_shares (share_id, schedule_id) VALUES (?, ?)",
	)
		.bind(shareId, schedule.id)
		.run();

	const share = await findShareByScheduleId(schedule.id);
	if (!share) {
		throw new ScheduleRequestError("share not found after create", 500);
	}

	return mapScheduleShare(share, schedule.term);
}

export async function regenerateScheduleShare(
	term: string,
	token: string,
): Promise<ScheduleShareResult> {
	const schedule = await findScheduleByToken(term, token);
	if (!schedule) {
		throw new ScheduleRequestError("schedule not found", 404);
	}

	const existing = await findShareByScheduleId(schedule.id);
	const shareId = createShareId();

	if (existing) {
		await env.DB.prepare(
			`UPDATE schedule_shares
SET share_id = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
WHERE schedule_id = ?`,
		)
			.bind(shareId, schedule.id)
			.run();

		await broadcastShareEvent({
			type: "schedule.share_revoked",
			shareId: existing.share_id,
		});
	} else {
		await env.DB.prepare(
			"INSERT INTO schedule_shares (share_id, schedule_id) VALUES (?, ?)",
		)
			.bind(shareId, schedule.id)
			.run();
	}

	const share = await findShareByScheduleId(schedule.id);
	if (!share) {
		throw new ScheduleRequestError("share not found after regenerate", 500);
	}

	return mapScheduleShare(share, schedule.term);
}

export async function revokeScheduleShare(
	term: string,
	token: string,
): Promise<void> {
	const schedule = await findScheduleByToken(term, token);
	if (!schedule) return;

	const share = await findShareByScheduleId(schedule.id);
	await env.DB.prepare("DELETE FROM schedule_shares WHERE schedule_id = ?")
		.bind(schedule.id)
		.run();

	if (share) {
		await broadcastShareEvent({
			type: "schedule.share_revoked",
			shareId: share.share_id,
		});
	}
}

export async function getSharedSchedule(
	shareId: string,
): Promise<SharedScheduleWithSections | null> {
	const shared = await findSharedSchedule(shareId);
	if (!shared) return null;

	return {
		share: mapSharedScheduleShare(shared),
		schedule: {
			term: shared.term,
			createdAt: shared.schedule_created_at,
			updatedAt: shared.schedule_updated_at,
		},
		sections: await listScheduleSections(shared.schedule_id, shared.term),
	};
}

export async function copySharedSchedule(
	shareId: string,
	token: string,
): Promise<ScheduleWithSections> {
	const shared = await getSharedSchedule(shareId);
	if (!shared) {
		throw new ScheduleRequestError("shared schedule not found", 404);
	}

	const copied = await saveScheduleByToken(
		shared.schedule.term,
		token,
		shared.sections.map((section) => section.crn),
	);
	if (!copied) {
		throw new ScheduleRequestError("shared schedule is empty", 404);
	}
	return copied;
}

export function scheduleErrorResponse(error: unknown): Response {
	if (error instanceof ScheduleRequestError) {
		return Response.json({ error: error.message }, { status: error.status });
	}

	console.error("Schedule request failed", error);
	return Response.json({ error: "internal error" }, { status: 500 });
}

async function findScheduleByToken(
	term: string,
	token: string,
): Promise<ScheduleRow | null> {
	return env.DB.prepare(
		"SELECT * FROM schedules WHERE token = ? AND term = ? LIMIT 1",
	)
		.bind(token, term)
		.first<ScheduleRow>();
}

async function findShareByScheduleId(
	scheduleId: number,
): Promise<ScheduleShareRow | null> {
	return env.DB.prepare(
		"SELECT * FROM schedule_shares WHERE schedule_id = ? LIMIT 1",
	)
		.bind(scheduleId)
		.first<ScheduleShareRow>();
}

async function findSharedSchedule(
	shareId: string,
): Promise<SharedScheduleRow | null> {
	return env.DB.prepare(
		`SELECT
  ss.share_id,
  ss.schedule_id,
  ss.created_at,
  ss.updated_at,
  s.term,
  s.created_at AS schedule_created_at,
  s.updated_at AS schedule_updated_at
FROM schedule_shares ss
JOIN schedules s ON s.id = ss.schedule_id
WHERE ss.share_id = ?
LIMIT 1`,
	)
		.bind(shareId)
		.first<SharedScheduleRow>();
}

async function listScheduleSections(
	scheduleId: number,
	term: string,
): Promise<Section[]> {
	const { results } = await env.DB.prepare(
		`SELECT sections.* FROM schedule_sections ss
JOIN sections ON sections.term = ss.term AND sections.crn = ss.crn
WHERE ss.schedule_id = ? AND ss.term = ?
ORDER BY ss.position, ss.created_at`,
	)
		.bind(scheduleId, term)
		.all<SectionRow>();

	return results.map(mapSection);
}

async function loadSectionsByCrns(
	term: string,
	crns: string[],
): Promise<Section[]> {
	if (crns.length === 0) return [];

	const placeholders = crns.map(() => "?").join(", ");
	const { results } = await env.DB.prepare(
		`SELECT * FROM sections WHERE term = ? AND crn IN (${placeholders})`,
	)
		.bind(term, ...crns)
		.all<SectionRow>();

	const sectionsByCrn = new Map(
		results.map((row) => [row.crn, mapSection(row)]),
	);
	return crns.flatMap((crn) => {
		const section = sectionsByCrn.get(crn);
		return section ? [section] : [];
	});
}

function assertAllCrnsExist(crns: string[], sections: Section[]): void {
	const found = new Set(sections.map((section) => section.crn));
	const missing = crns.filter((crn) => !found.has(crn));

	if (missing.length > 0) {
		throw new InvalidScheduleCRNsError(missing);
	}
}

function mapSchedule(row: ScheduleRow): ScheduleResult {
	return {
		id: row.id,
		term: row.term,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function mapScheduleShare(
	row: ScheduleShareRow,
	term: string,
): ScheduleShareResult {
	return {
		shareId: row.share_id,
		term,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function mapSharedScheduleShare(row: SharedScheduleRow): ScheduleShareResult {
	return mapScheduleShare(row, row.term);
}

function createShareId(): string {
	return crypto.randomUUID();
}

async function notifyScheduleUpdated(
	scheduleId: number,
	updatedAt: string,
): Promise<void> {
	const share = await findShareByScheduleId(scheduleId);
	if (!share) return;

	await broadcastShareEvent({
		type: "schedule.updated",
		shareId: share.share_id,
		updatedAt,
	});
}

async function broadcastShareEvent(event: ScheduleShareEvent): Promise<void> {
	try {
		const room = env.SCHEDULE_SHARE_ROOM.getByName(event.shareId);
		await room.broadcastUpdate(event);
	} catch (error) {
		console.warn("Failed to broadcast shared schedule event", {
			shareId: event.shareId,
			error: error instanceof Error ? error.message : String(error),
		});
	}
}
