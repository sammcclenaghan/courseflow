import type {
	FeedbackMood,
	FeedbackSchedulerSnapshot,
	FeedbackSubmission,
	SerializableCalendarEvent,
} from "./feedback-types";

// Discord hard limits: message content 2000, embed field value 1024,
// embed description 4096, all embed text combined 6000. The caps below stay
// under the combined budget: 2000 (description) + 1024 + 2×1000 + names.
const MAX_CONTENT_CHARS = 2000;
const MAX_FIELD_VALUE_CHARS = 1024;
const MAX_DESCRIPTION_CHARS = 2000;

export type FeedbackRequestContext = {
	hadToken: boolean;
	cfCountry: string;
	cfRay: string;
	acceptLanguage: string;
};

const moodEmoji: Record<FeedbackMood, string> = {
	sad: "😢",
	frown: "☹️",
	smile: "🙂",
	love: "😍",
};

function truncateField(value: string, max: number): string {
	return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function buildDescription(
	submission: FeedbackSubmission,
	hadToken: boolean,
): string {
	const lines: string[] = [];

	lines.push(`page: \`${submission.page}\``);
	const searchEntries = Object.entries(submission.search);
	if (searchEntries.length > 0) {
		lines.push(
			`search: ${searchEntries
				.map(([key, value]) => `\`${key}=${truncateField(value, 64)}\``)
				.join(" ")}`,
		);
	}
	lines.push(`auth: ${hadToken ? "yes" : "no"}`);

	const scheduler = submission.scheduler;
	if (scheduler) {
		const summary: string[] = [
			`term \`${truncateField(scheduler.term, 16)}\``,
			`${scheduler.courseCount} course${scheduler.courseCount === 1 ? "" : "s"}`,
			`${scheduler.totalSections} section${scheduler.totalSections === 1 ? "" : "s"}`,
			`${scheduler.totalCredits} credit${scheduler.totalCredits === 1 ? "" : "s"}`,
		];
		lines.push(`scheduler: ${summary.join(" · ")}`);
	}

	const client = submission.client;
	const clientLines: string[] = [];
	if (client.timezone) clientLines.push(`tz \`${client.timezone}\``);
	if (client.platform)
		clientLines.push(`platform \`${truncateField(client.platform, 32)}\``);
	if (client.userAgent)
		clientLines.push(`ua \`${truncateField(client.userAgent, 96)}\``);
	if (client.viewportWidth && client.viewportHeight) {
		clientLines.push(`vp \`${client.viewportWidth}×${client.viewportHeight}\``);
	} else if (client.screenWidth && client.screenHeight) {
		clientLines.push(`screen \`${client.screenWidth}×${client.screenHeight}\``);
	}
	if (client.devicePixelRatio)
		clientLines.push(`dpr \`${client.devicePixelRatio}\``);
	if (client.language)
		clientLines.push(`lang \`${truncateField(client.language, 16)}\``);
	if (client.referrer)
		clientLines.push(`ref \`${truncateField(client.referrer, 96)}\``);
	if (client.connection?.effectiveType) {
		clientLines.push(`net \`${client.connection.effectiveType}\``);
	}
	if (client.touchSupport) clientLines.push("touch");
	if (clientLines.length > 0) lines.push(`client: ${clientLines.join(" · ")}`);

	return truncateField(lines.join("\n"), MAX_DESCRIPTION_CHARS);
}

function buildSchedulerField(scheduler: FeedbackSchedulerSnapshot): string {
	const lines: string[] = [];
	lines.push(
		`**${scheduler.courseCount} course${scheduler.courseCount === 1 ? "" : "s"} · ${scheduler.totalSections} section${scheduler.totalSections === 1 ? "" : "s"} · ${scheduler.totalCredits} credit${scheduler.totalCredits === 1 ? "" : "s"}**`,
	);
	for (const course of scheduler.selectedCourses) {
		const sectionList = course.sections
			.map((section) => {
				const time = section.time ? ` ${section.time}` : "";
				return `\`${section.crn}\` ${section.scheduleType}${time}`;
			})
			.join("; ");
		lines.push(
			`• \`${course.subjectCode}\` — ${truncateField(course.title, 80)} (${sectionList || "no sections"})`,
		);
	}
	return truncateField(lines.join("\n"), 1000);
}

function buildEventsField(events: SerializableCalendarEvent[]): string {
	if (events.length === 0) return "_no events_";
	const byDay = new Map<number, SerializableCalendarEvent[]>();
	for (const event of events) {
		const list = byDay.get(event.dayOfWeek) ?? [];
		list.push(event);
		byDay.set(event.dayOfWeek, list);
	}
	const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
	const orderedDays = [...byDay.entries()].sort(([a], [b]) => a - b);
	const lines: string[] = [];
	for (const [day, dayEvents] of orderedDays) {
		const sorted = dayEvents
			.slice()
			.sort(
				(a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
			);
		lines.push(
			`**${dayNames[day] ?? `D${day}`}** ${sorted
				.map((event) => {
					const start = new Date(event.start);
					const format = (date: Date) =>
						`${String(date.getUTCHours()).padStart(2, "0")}:${String(
							date.getUTCMinutes(),
						).padStart(2, "0")}`;
					return `${format(start)}–${format(
						new Date(event.end),
					)} \`${event.subject}\` (\`${event.crn}\`)`;
				})
				.join("; ")}`,
		);
	}
	return truncateField(lines.join("\n"), 1000);
}

function buildCalendarField(scheduler: FeedbackSchedulerSnapshot): string {
	if (scheduler.calendarEvents.length === 0) {
		return "calendar: _empty_";
	}
	return `calendar (${scheduler.calendarEvents.length} events):\n${buildEventsField(scheduler.calendarEvents)}`;
}

function buildEmbedFields(submission: FeedbackSubmission) {
	const fields: { name: string; value: string; inline?: boolean }[] = [];
	if (submission.scheduler) {
		fields.push({
			name: "Schedule",
			value: buildSchedulerField(submission.scheduler),
		});
		fields.push({
			name: "Calendar",
			value: buildCalendarField(submission.scheduler),
		});
	}

	const messageField = {
		name: "Message",
		value: truncateField(submission.message, MAX_FIELD_VALUE_CHARS),
	};

	type EmbedField = { name: string; value: string; inline?: boolean };
	const combined: EmbedField[] = [messageField, ...fields].filter((field) =>
		Boolean(field.value),
	);

	return combined.map((field) => ({
		name: truncateField(field.name, 200),
		value: truncateField(field.value, MAX_FIELD_VALUE_CHARS),
		inline: field.inline ?? false,
	}));
}

export function buildDiscordPayload(
	submission: FeedbackSubmission,
	context: FeedbackRequestContext,
) {
	const moodEmojiChar = submission.mood ? moodEmoji[submission.mood] : "";
	const heading = moodEmojiChar
		? `**New feedback** ${moodEmojiChar}`
		: "**New feedback**";

	const contextParts: string[] = [];
	if (context.cfCountry)
		contextParts.push(`\`cf-country=${context.cfCountry}\``);
	if (context.cfRay) contextParts.push(`\`cf-ray=${context.cfRay}\``);
	if (context.acceptLanguage)
		contextParts.push(
			`\`accept-language=${truncateField(context.acceptLanguage, 64)}\``,
		);
	const contextLine =
		contextParts.length > 0 ? `\n${contextParts.join(" · ")}` : "";

	// Quote-expansion adds "> " after every newline, so the quoted message must
	// be re-truncated after expansion or content can exceed Discord's 2000 cap.
	const quoted = submission.message.replace(/\n/g, "\n> ");
	const content = `${truncateField(
		`${heading}\n> ${quoted}`,
		MAX_CONTENT_CHARS - contextLine.length,
	)}${contextLine}`;

	return {
		content,
		allowed_mentions: { parse: [] },
		embeds: [
			{
				description: buildDescription(submission, context.hadToken),
				fields: buildEmbedFields(submission),
			},
		],
	};
}
