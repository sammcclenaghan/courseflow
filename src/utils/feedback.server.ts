import { env } from "cloudflare:workers";
import {
	getCookie,
	getRequestHeader,
	setResponseStatus,
} from "@tanstack/react-start/server";
import { buildDiscordPayload } from "./feedback-discord";
import { parseFeedbackSubmission } from "./feedback-sanitizer";
import type { FeedbackSubmission } from "./feedback-types";

const SCHEDULE_TOKEN_COOKIE = "cf_schedule_token";
const DISCORD_TIMEOUT_MS = 5_000;

export async function deliverFeedback(submission: FeedbackSubmission) {
	const webhookURL = (env as { DISCORD_FEEDBACK_WEBHOOK_URL?: string })
		.DISCORD_FEEDBACK_WEBHOOK_URL;
	if (!webhookURL) {
		return {
			ok: false as const,
			status: 503,
			message: "feedback delivery not configured",
		};
	}

	const payload = buildDiscordPayload(submission, {
		hadToken: Boolean(getCookie(SCHEDULE_TOKEN_COOKIE)),
		cfCountry: getRequestHeader("cf-ipcountry") ?? "",
		cfRay: getRequestHeader("cf-ray") ?? "",
		acceptLanguage: getRequestHeader("accept-language") ?? "",
	});

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), DISCORD_TIMEOUT_MS);
	try {
		const response = await fetch(webhookURL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
			signal: controller.signal,
		});
		if (!response.ok) {
			return {
				ok: false as const,
				status: 502,
				message: `discord returned ${response.status}`,
			};
		}
		return { ok: true as const };
	} catch (error) {
		return {
			ok: false as const,
			status: 502,
			message: error instanceof Error ? error.message : "unknown error",
		};
	} finally {
		clearTimeout(timeout);
	}
}

export function setFeedbackResponseStatus(status: number) {
	setResponseStatus(status);
}

export { parseFeedbackSubmission };
