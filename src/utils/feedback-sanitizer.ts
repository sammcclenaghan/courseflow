import { asRecord } from "@/lib/validation";
import type {
	FeedbackClientMeta,
	FeedbackMood,
	FeedbackSchedulerSnapshot,
	FeedbackSubmission,
	SerializableCalendarEvent,
	SerializableScheduledSection,
	SerializableSelectedCourse,
} from "./feedback-types";

const MAX_REQUEST_BYTES = 64 * 1024;
const MAX_MESSAGE_RUNES = 1800;
const MAX_PAGE_RUNES = 256;

export const FEEDBACK_MAX_REQUEST_BYTES = MAX_REQUEST_BYTES;
export const FEEDBACK_MAX_MESSAGE_RUNES = MAX_MESSAGE_RUNES;
export const FEEDBACK_MAX_PAGE_RUNES = MAX_PAGE_RUNES;

const isFeedbackMood = (value: unknown): value is FeedbackMood =>
	value === "sad" || value === "frown" || value === "smile" || value === "love";

function clip(value: string, maxRunes: number): string {
	if (value.length <= maxRunes) return value;
	return value.slice(0, maxRunes);
}

function clipInt(value: unknown, fallback: number): number {
	const n = typeof value === "number" ? value : Number(value);
	return Number.isFinite(n) ? Math.round(n) : fallback;
}

function clipString(value: unknown, max = 200): string {
	if (typeof value !== "string") return "";
	return clip(value.slice(0, max), max);
}

function readNumber(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string" && value.trim() !== "") {
		const n = Number(value);
		return Number.isFinite(n) ? n : undefined;
	}
	return undefined;
}

function readRecordArray(value: unknown): Record<string, unknown>[] {
	if (!Array.isArray(value)) return [];
	return value
		.map((entry) => asRecord(entry))
		.filter((entry): entry is Record<string, unknown> => entry !== null);
}

function sanitizeScheduler(
	value: unknown,
): FeedbackSchedulerSnapshot | undefined {
	const raw = asRecord(value);
	if (!raw) return undefined;

	const term = clipString(raw.term, 32);
	if (!term) return undefined;

	const courseCount = Math.max(0, clipInt(raw.courseCount, 0));
	const totalSections = Math.max(0, clipInt(raw.totalSections, 0));
	const totalCreditsRaw = readNumber(raw.totalCredits);
	const totalCredits = totalCreditsRaw == null ? 0 : totalCreditsRaw;

	const selectedCourses: SerializableSelectedCourse[] = readRecordArray(
		raw.selectedCourses as unknown,
	)
		.map((entry) => {
			const record = asRecord(entry);
			if (!record) return null;
			const sections = readRecordArray(record.sections as unknown)
				.map((section) => {
					return {
						crn: clipString(section.crn, 16),
						subject: clipString(section.subject, 16),
						courseNumber: clipString(section.courseNumber, 16),
						sectionCode: clipString(section.sectionCode, 16),
						scheduleType: clipString(section.scheduleType, 32),
						term: clipString(section.term, 32),
						frequency: clipString(section.frequency, 32),
						time: clipString(section.time, 64),
						days: clipString(section.days, 32),
						location: clipString(section.location, 128),
						dateRange: clipString(section.dateRange, 64),
					} satisfies SerializableScheduledSection;
				})
				.filter(
					(entry): entry is SerializableScheduledSection => entry !== null,
				);
			const course: SerializableSelectedCourse = {
				pid: clipString(record.pid, 64),
				subjectCode: clipString(record.subjectCode, 32),
				title: clipString(record.title, 200),
				credits: Math.max(0, clipInt(record.credits, 0)),
				term: clipString(record.term, 32),
				sections,
			};
			return course;
		})
		.filter((entry): entry is SerializableSelectedCourse => entry !== null)
		.slice(0, 32);

	const calendarEvents: SerializableCalendarEvent[] = readRecordArray(
		raw.calendarEvents as unknown,
	)
		.map((entry) => {
			const record = asRecord(entry);
			if (!record) return null;
			return {
				id: clipString(record.id, 128),
				title: clipString(record.title, 200),
				start: clipString(record.start, 64),
				end: clipString(record.end, 64),
				color: clipString(record.color, 16),
				crn: clipString(record.crn, 16),
				subject: clipString(record.subject, 16),
				courseNumber: clipString(record.courseNumber, 16),
				sectionCode: clipString(record.sectionCode, 16),
				scheduleType: clipString(record.scheduleType, 32),
				dayOfWeek: clipInt(record.dayOfWeek, 0) % 7,
			} satisfies SerializableCalendarEvent;
		})
		.filter((entry): entry is SerializableCalendarEvent => entry !== null)
		.slice(0, 200);

	return {
		term,
		courseCount,
		totalSections,
		totalCredits,
		selectedCourses,
		calendarEvents,
	};
}

function sanitizeClient(value: unknown): FeedbackClientMeta {
	const raw = asRecord(value) ?? {};
	const connection = asRecord(raw.connection);

	return {
		userAgent: clipString(raw.userAgent, 512),
		language: clipString(raw.language, 32),
		platform: clipString(raw.platform, 64),
		screenWidth: Math.max(0, clipInt(raw.screenWidth, 0)),
		screenHeight: Math.max(0, clipInt(raw.screenHeight, 0)),
		viewportWidth: Math.max(0, clipInt(raw.viewportWidth, 0)),
		viewportHeight: Math.max(0, clipInt(raw.viewportHeight, 0)),
		devicePixelRatio: Math.max(0, clipInt(raw.devicePixelRatio, 1)),
		timezone: clipString(raw.timezone, 64),
		referrer: clipString(raw.referrer, 512),
		online: raw.online === undefined ? true : Boolean(raw.online),
		connection: connection
			? {
					effectiveType: clipString(connection.effectiveType, 16) || undefined,
					downlink: readNumber(connection.downlink),
					rtt: readNumber(connection.rtt),
				}
			: undefined,
		touchSupport: Boolean(raw.touchSupport),
	};
}

function sanitizeSearch(value: unknown): Record<string, string> {
	if (!value || typeof value !== "object" || Array.isArray(value)) return {};
	const out: Record<string, string> = {};
	for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
		if (typeof key !== "string" || key.length > 64) continue;
		if (typeof raw === "string") {
			out[key] = clip(raw, 256);
		} else if (typeof raw === "number" || typeof raw === "boolean") {
			out[key] = clip(String(raw), 256);
		}
	}
	return out;
}

export function parseFeedbackSubmission(
	raw: unknown,
	bodyBytes: number,
):
	| { ok: true; submission: FeedbackSubmission }
	| { ok: false; status: number; message: string } {
	if (bodyBytes > MAX_REQUEST_BYTES) {
		return { ok: false, status: 413, message: "request body too large" };
	}

	const record = asRecord(raw);
	if (!record) {
		return { ok: false, status: 400, message: "invalid request body" };
	}

	const messageRaw = clipString(record.message, MAX_MESSAGE_RUNES).trim();
	if (!messageRaw) {
		return { ok: false, status: 400, message: "message is required" };
	}

	const moodValue = record.mood;
	if (moodValue !== undefined && !isFeedbackMood(moodValue)) {
		return { ok: false, status: 400, message: "invalid mood" };
	}

	const pageRaw = clipString(record.page, MAX_PAGE_RUNES).trim() || "(unknown)";

	return {
		ok: true,
		submission: {
			message: messageRaw,
			mood: isFeedbackMood(moodValue) ? moodValue : undefined,
			page: pageRaw,
			search: sanitizeSearch(record.search),
			scheduler: sanitizeScheduler(record.scheduler),
			client: sanitizeClient(record.client),
		},
	};
}
