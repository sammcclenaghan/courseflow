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

export type Course = {
	pid: string;
	/** e.g. "CSC110" */
	code: string;
	title: string;
	description: string | null;
	notes: string[];
	/** "1.5", "1.5–3" or "1.5 or 3"; null when the calendar doesn't say */
	credits: string | null;
	/** Lecture-lab-tutorial hours, e.g. "3-2-0" */
	hours: string | null;
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
