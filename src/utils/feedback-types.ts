export type FeedbackMood = "sad" | "frown" | "smile" | "love";

export type SerializableScheduledSection = {
	crn: string;
	subject: string;
	courseNumber: string;
	sectionCode: string;
	scheduleType: string;
	term: string;
	frequency: string;
	time: string;
	days: string;
	location: string;
	dateRange: string;
};

export type SerializableSelectedCourse = {
	pid: string;
	subjectCode: string;
	title: string;
	credits: number;
	term: string;
	sections: SerializableScheduledSection[];
};

export type SerializableCalendarEvent = {
	id: string;
	title: string;
	start: string;
	end: string;
	color: string;
	crn: string;
	subject: string;
	courseNumber: string;
	sectionCode: string;
	scheduleType: string;
	dayOfWeek: number;
};

export type FeedbackSchedulerSnapshot = {
	term: string;
	courseCount: number;
	totalSections: number;
	totalCredits: number;
	selectedCourses: SerializableSelectedCourse[];
	calendarEvents: SerializableCalendarEvent[];
};

export type FeedbackClientMeta = {
	userAgent: string;
	language: string;
	platform: string;
	screenWidth: number;
	screenHeight: number;
	viewportWidth: number;
	viewportHeight: number;
	devicePixelRatio: number;
	timezone: string;
	referrer: string;
	online: boolean;
	connection?: { effectiveType?: string; downlink?: number; rtt?: number };
	touchSupport: boolean;
};

export type FeedbackSubmission = {
	message: string;
	mood?: FeedbackMood;
	page: string;
	search: Record<string, string>;
	scheduler?: FeedbackSchedulerSnapshot;
	client: FeedbackClientMeta;
};
