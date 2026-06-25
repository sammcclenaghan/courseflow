export type Course = {
	id: number;
	pid: string;
	subjectCode: string;
	title: string;
	description: string;
	credits: string;
	hoursCatalogText: string;
	notes: string;
	preAndCorequisites: string;
	createdAt: string;
	updatedAt: string;
};

export type CourseSearchResult = {
	pid: string;
	subjectCode: string;
	title: string;
	credits: string;
};

export type SubjectResult = {
	subject: string;
	courseCount: number;
};

export type SearchCoursesInput = {
	query: string;
	term?: string;
};

export type GetCourseBySubjectCodeInput = {
	subjectCode: string;
};

export type ListSubjectsInput = {
	term?: string;
};
