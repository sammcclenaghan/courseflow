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

export type AlternativeMode = "best" | "offered" | "all";

export type CourseAlternative = {
	pid: string;
	subjectCode: string;
	title: string;
	credits: string;
	rank: number;
	score: number;
	semanticScore: number;
	offeredInTerm: boolean;
	hasAvailableSeats: boolean;
	isCrossSubject: boolean;
	reasons: string[];
};

export type CourseAlternativesResponse = {
	subjectCode: string;
	term: string;
	mode: AlternativeMode;
	results: CourseAlternative[];
};

export type GetCourseAlternativesInput = {
	subjectCode: string;
	term: string;
	mode?: AlternativeMode;
	limit?: number;
};
