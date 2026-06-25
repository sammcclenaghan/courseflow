import type { Course } from "./course-types";
import type { Section } from "./section-types";

export type CalendarEvent = {
	id: string;
	title: string;
	start: Date;
	end: Date;
	color: string;
	section: Section;
};

export type SavedCourse = {
	course: Course;
	sections: Section[];
	term: string;
};

export type ScheduleResult = {
	id: number;
	term: string;
	createdAt: string;
	updatedAt: string;
};

export type PublicScheduleResult = Omit<ScheduleResult, "id">;

export type ScheduleWithSections = {
	schedule: ScheduleResult;
	sections: Section[];
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
	sections: Section[];
};
