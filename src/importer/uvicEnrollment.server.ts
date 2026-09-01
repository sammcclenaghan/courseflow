import { mapConcurrent } from "./catalogImport.shared.ts";
import type {
	EnrollmentCounts,
	FetchOptions,
	ImportedSection,
} from "./catalogImport.types.ts";
import { fetchText } from "./uvicHttp.server.ts";

const ENROLLMENT_URL =
	"https://banner.uvic.ca/StudentRegistrationSsb/ssb/searchResults/getEnrollmentInfo";

export async function fetchEnrollmentCounts(
	term: string,
	crn: string,
	options: FetchOptions = {},
): Promise<EnrollmentCounts | null> {
	const form = new URLSearchParams({
		term,
		courseReferenceNumber: crn,
	});

	const html = await fetchText(ENROLLMENT_URL, {
		fetchFn: options.fetchFn,
		timeoutMs: options.timeoutMs,
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			"User-Agent": "Mozilla/5.0",
		},
		body: form,
	});

	return parseEnrollmentHtml(html);
}

export async function refreshEnrollment(
	sections: ImportedSection[],
	options: FetchOptions & { concurrency?: number } = {},
): Promise<void> {
	await mapConcurrent(sections, options.concurrency ?? 8, async (section) => {
		if (section.crn === "") return;
		const counts = await fetchEnrollmentCounts(
			section.term,
			section.crn,
			options,
		);
		if (!counts) return;

		section.enrollmentActual = counts.enrollmentActual;
		section.enrollmentMaximum = counts.enrollmentMaximum;
		section.enrollmentSeatsAvailable = counts.enrollmentSeatsAvailable;
		section.waitlistCapacity = counts.waitlistCapacity;
		section.waitlistActual = counts.waitlistActual;
		section.waitlistSeatsAvailable = counts.waitlistSeatsAvailable;
		section.enrollmentRefreshed = true;
	});
}

export function parseEnrollmentHtml(html: string): EnrollmentCounts | null {
	const enrollmentActual = extractEnrollmentValue(html, [
		"Enrolment Actual",
		"Enrollment Actual",
	]);
	const enrollmentMaximum = extractEnrollmentValue(html, [
		"Enrolment Maximum",
		"Enrollment Maximum",
	]);
	const enrollmentSeatsAvailable = extractEnrollmentValue(html, [
		"Enrolment Seats Available",
		"Enrollment Seats Available",
	]);
	const waitlistCapacity = extractEnrollmentValue(html, "Waitlist Capacity");
	const waitlistActual = extractEnrollmentValue(html, "Waitlist Actual");
	const waitlistSeatsAvailable = extractEnrollmentValue(
		html,
		"Waitlist Seats Available",
	);

	if (
		enrollmentActual === null ||
		enrollmentMaximum === null ||
		enrollmentSeatsAvailable === null ||
		waitlistCapacity === null ||
		waitlistActual === null ||
		waitlistSeatsAvailable === null
	) {
		return null;
	}

	return {
		enrollmentActual,
		enrollmentMaximum,
		enrollmentSeatsAvailable,
		waitlistCapacity,
		waitlistActual,
		waitlistSeatsAvailable,
	};
}

// The value regex is anchored to the label so a non-matching value (e.g. an
// unexpected format) fails outright instead of drifting forward and capturing
// the next field's number. Banner reports over-enrolled sections with negative
// seats available, so the sign must be part of the match.
function extractEnrollmentValue(
	html: string,
	labelOrLabels: string | readonly string[],
): number | null {
	const labels = Array.isArray(labelOrLabels) ? labelOrLabels : [labelOrLabels];
	for (const label of labels) {
		const pattern = new RegExp(
			`${escapeRegExp(label)}:</span>\\s*<span[^>]*>\\s*(-?\\d+)`,
		);
		const match = pattern.exec(html);
		if (!match) continue;
		return Number.parseInt(match[1] ?? "", 10);
	}
	return null;
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
