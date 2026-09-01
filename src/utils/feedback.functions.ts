import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import {
	deliverFeedback,
	parseFeedbackSubmission,
	setFeedbackResponseStatus,
} from "./feedback.server";
import type { FeedbackSubmission } from "./feedback-types";

function noStore() {
	setResponseHeader("Cache-Control", "no-store");
}

function measureBodyBytes(data: unknown): number {
	try {
		return new TextEncoder().encode(JSON.stringify(data) ?? "").length;
	} catch {
		return Number.MAX_SAFE_INTEGER;
	}
}

export const submitFeedback = createServerFn({ method: "POST" })
	.validator((data: unknown) => data)
	.handler(async ({ data }): Promise<null> => {
		noStore();
		const parsed = parseFeedbackSubmission(data, measureBodyBytes(data));
		if (!parsed.ok) {
			setFeedbackResponseStatus(parsed.status);
			throw new Error(parsed.message);
		}

		const result = await deliverFeedback(parsed.submission);
		if (!result.ok) {
			setFeedbackResponseStatus(result.status);
			throw new Error(result.message);
		}
		return null;
	});

export type { FeedbackSubmission };
