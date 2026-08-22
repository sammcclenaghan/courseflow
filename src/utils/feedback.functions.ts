import { createServerFn } from "@tanstack/react-start";
import {
	deliverFeedback,
	parseFeedbackSubmission,
	setFeedbackResponseStatus,
} from "./feedback.server";
import type { FeedbackSubmission } from "./feedback-types";
import { setNoStore } from "./response-cache.server";

export const submitFeedback = createServerFn({ method: "POST" })
	.validator((data: unknown) => data)
	.handler(async ({ data }): Promise<null> => {
		setNoStore();
		const parsed = parseFeedbackSubmission(data, 0);
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
