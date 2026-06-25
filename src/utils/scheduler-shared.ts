export const MAX_SCHEDULE_CRNS = 100;

export class ScheduleRequestError extends Error {
	constructor(
		message: string,
		public status: number,
	) {
		super(message);
		this.name = "ScheduleRequestError";
	}
}

export class InvalidScheduleCRNsError extends ScheduleRequestError {
	constructor(public missing: string[]) {
		super(
			missing.length > 0
				? `invalid CRNs: ${missing.join(",")}`
				: "invalid CRNs",
			400,
		);
		this.name = "InvalidScheduleCRNsError";
	}
}

export function normalizeScheduleCrns(crns: unknown): string[] {
	if (!Array.isArray(crns)) {
		throw new ScheduleRequestError("crns must be an array", 400);
	}

	if (crns.length > MAX_SCHEDULE_CRNS) {
		throw new ScheduleRequestError("too many CRNs requested", 400);
	}

	const uniqueCrns: string[] = [];
	const seen = new Set<string>();

	for (const crn of crns) {
		if (typeof crn !== "string") {
			throw new ScheduleRequestError("crns must be strings", 400);
		}

		const trimmed = crn.trim();
		if (trimmed === "" || seen.has(trimmed)) continue;

		seen.add(trimmed);
		uniqueCrns.push(trimmed);
	}

	return uniqueCrns;
}
