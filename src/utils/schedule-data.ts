import type { Course } from "./course-types";
import type { SavedCourse, ScheduleWithSections } from "./schedule-types";
import type { Section } from "./section-types";

export function buildCourseFromSection(section: Section): Course {
	const subjectCode = `${section.subject}${section.courseNumber}`.replace(
		/\s+/g,
		"",
	);

	return {
		id: 0,
		pid: section.coursePid ?? subjectCode,
		subjectCode,
		title: section.courseName,
		description: "",
		credits: section.units,
		hoursCatalogText: "",
		notes: "",
		preAndCorequisites: "",
		createdAt: "",
		updatedAt: "",
	};
}

export function buildSavedCourses(
	term: string,
	sections: Section[],
): SavedCourse[] {
	const coursesByPid = new Map<string, SavedCourse>();

	for (const section of sections) {
		if (!section.coursePid) continue;

		const existing = coursesByPid.get(section.coursePid);
		if (existing) {
			existing.sections.push(section);
			continue;
		}

		coursesByPid.set(section.coursePid, {
			course: buildCourseFromSection(section),
			sections: [section],
			term,
		});
	}

	return Array.from(coursesByPid.values());
}

export function expandSavedSchedule(
	term: string,
	savedSchedule: ScheduleWithSections | null | undefined,
): SavedCourse[] {
	return savedSchedule ? buildSavedCourses(term, savedSchedule.sections) : [];
}
