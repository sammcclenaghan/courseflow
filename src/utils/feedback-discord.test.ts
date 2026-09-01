import { describe, expect, it } from "vitest";
import { buildDiscordPayload } from "./feedback-discord";
import type { FeedbackSubmission } from "./feedback-types";

const baseClient: FeedbackSubmission["client"] = {
	userAgent: "test-agent",
	language: "en-CA",
	platform: "MacIntel",
	screenWidth: 1440,
	screenHeight: 900,
	viewportWidth: 1200,
	viewportHeight: 800,
	devicePixelRatio: 2,
	timezone: "America/Vancouver",
	referrer: "",
	online: true,
	touchSupport: false,
};

function submission(message: string): FeedbackSubmission {
	return {
		message,
		mood: "smile",
		page: "/scheduler",
		search: {},
		client: baseClient,
	};
}

const context = {
	hadToken: true,
	cfCountry: "CA",
	cfRay: "8f3a2b1c9d0e1234-YVR",
	acceptLanguage: "en-CA,en;q=0.9",
};

describe("buildDiscordPayload", () => {
	it("keeps content within Discord's 2000-char limit after quote expansion", () => {
		// 400 newline-separated lines: quote expansion adds "> " per line, which
		// used to push an in-limit message past 2000 characters.
		const message = Array.from({ length: 400 }, () => "abc").join("\n");
		expect(message.length).toBeLessThanOrEqual(1800);

		const payload = buildDiscordPayload(submission(message), context);
		expect(payload.content.length).toBeLessThanOrEqual(2000);
		// The request context survives truncation.
		expect(payload.content).toContain("cf-ray=");
	});

	it("keeps embed field values within Discord's 1024-char limit", () => {
		const payload = buildDiscordPayload(submission("x".repeat(1800)), context);
		for (const embed of payload.embeds) {
			for (const field of embed.fields) {
				expect(field.value.length).toBeLessThanOrEqual(1024);
			}
			expect(embed.description.length).toBeLessThanOrEqual(2000);
		}
	});

	it("passes short messages through untruncated", () => {
		const payload = buildDiscordPayload(submission("works great"), context);
		expect(payload.content).toContain("> works great");
		const messageField = payload.embeds[0]?.fields.find(
			(field) => field.name === "Message",
		);
		expect(messageField?.value).toBe("works great");
		expect(payload.allowed_mentions).toEqual({ parse: [] });
	});
});
