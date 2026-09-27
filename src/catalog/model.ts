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

export type Requirement =
	| { type: "all"; items: Requirement[] }
	| { type: "some"; count: number; items: Requirement[] }
	| {
			type: "courses";
			/** How many of the courses, or how many units from them. */
			need: "all" | number | { units: number };
			/** Whether the courses may be taken at the same time. */
			timing: "completed" | "concurrent" | "either";
			/** e.g. "B+" */
			minGrade: string | null;
			minGpa: number | null;
			/** Course codes, e.g. "MATH100" */
			courses: string[];
	  }
	| { type: "text"; text: string };

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
	prerequisites: Requirement | null;
	preOrCorequisites: Requirement | null;
	corequisites: Requirement | null;
	recommendations: string[];
};

/** What the courses table's requisites column holds, as JSON. */
export type Requisites = Pick<
	Course,
	"prerequisites" | "preOrCorequisites" | "corequisites" | "recommendations"
>;

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
