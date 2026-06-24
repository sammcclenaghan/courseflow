export type CourseEntry = {
	courseId: string;
	pid: string;
	title: string;
};

export type ParsedCourseId = {
	subject: string;
	courseNumber: string;
};

export type ImportedCourse = {
	pid: string;
	subjectCode: string;
	title: string;
	description: string;
	credits: string;
	hoursCatalogText: string;
	notes: string;
	preAndCorequisites: string;
};

export type Meeting = {
	frequency: string;
	time: string;
	days: string;
	location: string;
	dateRange: string;
	scheduleType: string;
};

export type ImportedSection = {
	term: string;
	crn: string;
	coursePid: string | null;
	subject: string;
	courseNumber: string;
	courseName: string;
	section: string;
	scheduleType: string;
	instructionalMethod: string;
	frequency: string;
	time: string;
	days: string;
	location: string;
	dateRange: string;
	units: string;
	additionalInformation: string;
	enrollmentActual: number;
	enrollmentMaximum: number;
	enrollmentSeatsAvailable: number;
	waitlistCapacity: number;
	waitlistActual: number;
	waitlistSeatsAvailable: number;
	meetings: Meeting[];
	enrollmentRefreshed: boolean;
};

export type EnrollmentCounts = Pick<
	ImportedSection,
	| "enrollmentActual"
	| "enrollmentMaximum"
	| "enrollmentSeatsAvailable"
	| "waitlistCapacity"
	| "waitlistActual"
	| "waitlistSeatsAvailable"
>;

export type FetchLike = typeof fetch;

export type FetchOptions = {
	fetchFn?: FetchLike;
	timeoutMs?: number;
};
