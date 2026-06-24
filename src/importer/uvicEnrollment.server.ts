import { mapConcurrent } from "./catalogImport.shared.ts";
import type {
	EnrollmentCounts,
	FetchOptions,
	ImportedSection,
} from "./catalogImport.types.ts";
import { fetchText } from "./uvicHttp.server.ts";

const ENROLLMENT_VALUE_RE = /:<\/span>\s*<span[^>]*>(\d+)/;

export async function refreshEnrollment(
	sections: ImportedSection[],
	options: FetchOptions & { concurrency?: number } = {},
): Promise<void> {
	await mapConcurrent(sections, options.concurrency ?? 8, async (section) => {
		if (section.crn === "") return;
		const form = new URLSearchParams({
			term: section.term,
			courseReferenceNumber: section.crn,
		});

		const html = await fetchText(
			"https://banner.uvic.ca/StudentRegistrationSsb/ssb/searchResults/getEnrollmentInfo",
			{
				fetchFn: options.fetchFn,
				timeoutMs: options.timeoutMs,
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					"User-Agent": "Mozilla/5.0",
				},
				body: form,
			},
		);

		const counts = parseEnrollmentHtml(html);
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

function extractEnrollmentValue(
	html: string,
	labelOrLabels: string | readonly string[],
): number | null {
	const labels = Array.isArray(labelOrLabels) ? labelOrLabels : [labelOrLabels];
	for (const label of labels) {
		const start = html.indexOf(`${label}:</span>`);
		if (start === -1) continue;
		const match = ENROLLMENT_VALUE_RE.exec(html.slice(start + label.length));
		if (!match) return null;
		return Number.parseInt(match[1] ?? "", 10);
	}
	return null;
}
