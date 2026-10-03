import type { Course } from "./catalog-types";
import type { LegacySection } from "./sections-types";

export type CalendarEvent = {
	id: string;
	title: string;
	start: Date;
	end: Date;
	color: string;
	section: LegacySection;
};

export type SavedCourse = {
	course: Course;
	sections: LegacySection[];
	term: string;
};

export type ScheduleResult = {
	id: number;
	term: string;
	createdAt: string;
	updatedAt: string;
};

type PublicScheduleResult = Omit<ScheduleResult, "id">;

export type ScheduleWithSections = {
	schedule: ScheduleResult;
	sections: LegacySection[];
};

export type ScheduleShareResult = {
	shareId: string;
	term: string;
	createdAt: string;
	updatedAt: string;
};

export type SharedScheduleWithSections = {
	share: ScheduleShareResult;
	schedule: PublicScheduleResult;
	sections: LegacySection[];
};
