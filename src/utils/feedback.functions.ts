import { createServerFn } from "@tanstack/react-start";
import {
	getRequestHeader,
	setResponseHeader,
} from "@tanstack/react-start/server";
import {
	deliverFeedback,
	parseFeedbackSubmission,
	setFeedbackResponseStatus,
} from "./feedback.server";
import type { FeedbackSubmission } from "./feedback-types";

function noStore() {
	setResponseHeader("Cache-Control", "no-store");
}

// The transport has already parsed the body, so measure the real request size
// from Content-Length when the client sent one; the JSON re-encode is only the
// fallback estimate.
function measureBodyBytes(data: unknown): number {
	const contentLength = Number.parseInt(
		getRequestHeader("content-length") ?? "",
		10,
	);
	if (Number.isFinite(contentLength) && contentLength >= 0) {
		return contentLength;
	}
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
