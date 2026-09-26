export type Seats = {
	enrolled: number;
	capacity: number;
	available: number;
};

export type Meeting = {
	/** Weekdays as Date.getDay() numbers: 0 = Sunday … 6 = Saturday. */
	days: number[];
	/** Minutes after midnight; null when the time is TBA. */
	start: number | null;
	end: number | null;
	/** ISO calendar dates, e.g. "2026-09-09". */
	startDate: string;
	endDate: string;
};

export type Section = {
	term: string;
	crn: string;
	subject: string;
	courseNumber: string;
	section: string;
	title: string;
	scheduleType: string;
	instructionalMethod: string;
	partOfTerm: string;
	credits: number | null;
	linkId: string | null;
	crossList: string | null;
	crossListAvailable: number | null;
	seats: Seats;
	waitlist: Seats;
	meetings: Meeting[];
};
