export type SectionMeeting = {
	frequency: string;
	time: string;
	days: string;
	location: string;
	dateRange: string;
	scheduleType: string;
};

export type Section = {
	id: number;
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
	meetings: SectionMeeting[];
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
	createdAt: string;
	updatedAt: string;
};

export type GroupedSections = {
	lectures: Section[];
	labs: Section[];
	tutorials: Section[];
	other: Section[];
};
