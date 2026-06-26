import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ChevronLeft, Search, X } from "lucide-react";
import { type ReactNode, useMemo, useRef, useState } from "react";
import { searchCourseAutocomplete } from "@/catalog/course-autocomplete";
import {
	markCourseSearchInput,
	useCourseSearchPerformance,
} from "@/catalog/course-search-performance";
import { useCourseAutocomplete } from "@/catalog/use-course-autocomplete";
import { catalogQueries } from "@/queries/catalog";
import type { CourseSearchResult, SubjectResult } from "@/utils/catalog-types";

export const Route = createFileRoute("/explore")({
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(catalogQueries.subjects()),
	component: ExplorePage,
});

function ExplorePage() {
	const [searchQuery, setSearchQuery] = useState("");
	const [activeDepartment, setActiveDepartment] = useState<string | null>(null);
	const [autocompleteLoadRequested, setAutocompleteLoadRequested] =
		useState(false);
	const searchInputRef = useRef<HTMLInputElement>(null);

	const shouldLoadAutocomplete =
		autocompleteLoadRequested ||
		searchQuery.trim().length > 0 ||
		activeDepartment !== null;
	const autocomplete = useCourseAutocomplete(shouldLoadAutocomplete);

	const { data: subjects } = useQuery(catalogQueries.subjects());
	const searchTerm = searchQuery.trim() || activeDepartment || "";
	const searchResults = useMemo(
		() =>
			autocomplete.courses
				? searchCourseAutocomplete(autocomplete.courses, searchTerm)
				: [],
		[autocomplete.courses, searchTerm],
	);
	const searchLoading = searchTerm.length > 0 && autocomplete.isLoading;

	useCourseSearchPerformance({
		surface: "explore",
		query: searchTerm,
		resultCount: searchResults.length,
		isLoading: searchLoading,
	});

	const sortedSubjects = useMemo(() => {
		if (!subjects) return [];
		return [...subjects].sort((a, b) => a.subject.localeCompare(b.subject));
	}, [subjects]);

	const indexedSubjects = useMemo(() => {
		if (!sortedSubjects.length) return [];
		const groups = new Map<string, SubjectResult[]>();
		for (const subject of sortedSubjects) {
			const letter = subject.subject[0] ?? "#";
			if (!groups.has(letter)) groups.set(letter, []);
			groups.get(letter)?.push(subject);
		}
		return Array.from(groups.entries()).map(([letter, items]) => ({
			letter,
			items,
		}));
	}, [sortedSubjects]);

	const isSearching = searchTerm.length > 0;
	const displayCourses = searchResults;

	function handleDepartmentClick(dept: string) {
		setAutocompleteLoadRequested(true);
		if (activeDepartment === dept) {
			setActiveDepartment(null);
		} else {
			setActiveDepartment(dept);
			setSearchQuery("");
		}
	}

	function handleSearchChange(value: string) {
		markCourseSearchInput("explore");
		setSearchQuery(value);
		if (value.trim().length > 0) {
			setAutocompleteLoadRequested(true);
			setActiveDepartment(null);
		}
	}

	function clearSearch() {
		setSearchQuery("");
		setActiveDepartment(null);
		searchInputRef.current?.focus();
	}

	return (
		<div className="explore-page w-full flex-1 overflow-y-auto">
			<div className="pointer-events-none fixed inset-0 bg-[#FAFAF8]" />
			<div
				className="pointer-events-none fixed inset-0 opacity-[0.025]"
				style={{
					backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
					backgroundRepeat: "repeat",
					backgroundSize: "128px 128px",
				}}
			/>

			<div className="relative z-10 mx-auto w-full max-w-3xl px-6 pt-12 pb-20">
				<div className="explore-header mb-10">
					<p className="mb-2 font-medium text-[#1a1a1a]/35 text-[11px] tracking-[0.18em] uppercase">
						Full Catalog
					</p>
					<h1 className="font-light text-[#1a1a1a] text-[clamp(1.8rem,4vw,2.6rem)] tracking-[-0.03em]">
						Explore Courses
					</h1>
					<p className="mt-3 max-w-xl text-[#1a1a1a]/45 text-[14px] leading-relaxed">
						Browse every UVic course. Term offerings and schedule details appear
						when you open a course.
					</p>
				</div>

				<div className="explore-search sticky top-0 z-20 -mx-6 mb-8 bg-[#FAFAF8]/90 px-6 py-2 backdrop-blur-md max-md:border-[#1a1a1a]/[0.06] max-md:border-b md:relative md:mx-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-none">
					<div className="group relative">
						<Search className="pointer-events-none absolute top-1/2 left-4 h-[18px] w-[18px] -translate-y-1/2 text-[#1a1a1a]/25 transition-colors group-focus-within:text-[#1a1a1a]/50" />
						<input
							ref={searchInputRef}
							type="text"
							aria-label="Search courses by code"
							value={searchQuery}
							onFocus={() => setAutocompleteLoadRequested(true)}
							onChange={(e) => handleSearchChange(e.target.value)}
							placeholder="Search by course code"
							className="h-12 w-full rounded-xl border border-[#1a1a1a]/[0.08] bg-white/70 pr-10 pl-11 text-[#1a1a1a] text-[15px] outline-none backdrop-blur-sm transition-all placeholder:text-[#1a1a1a]/25 focus:border-uvic-blue/30 focus:bg-white focus:shadow-[0_2px_20px_rgba(0,84,147,0.06)]"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={clearSearch}
								aria-label="Clear search"
								className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-1 text-[#1a1a1a]/25 transition-colors hover:bg-[#1a1a1a]/[0.05] hover:text-[#1a1a1a]/50"
							>
								<X className="h-4 w-4" />
							</button>
						)}
					</div>
				</div>

				{activeDepartment && (
					<DepartmentHeader
						subject={activeDepartment}
						subjects={sortedSubjects}
						onBack={() => setActiveDepartment(null)}
					/>
				)}

				{isSearching ? (
					<div className="explore-results">
						{searchLoading ? (
							<CourseRowSkeleton count={6} />
						) : displayCourses.length === 0 ? (
							<div className="py-16 text-center">
								<p className="font-medium text-[#1a1a1a]/40 text-[14px]">
									No courses found
									{searchTerm ? ` for "${searchTerm}"` : "."}
								</p>
								<p className="mt-2 text-[#1a1a1a]/30 text-[13px]">
									Try a course code or browse by department.
								</p>
							</div>
						) : (
							<div className="explore-list divide-y divide-[#1a1a1a]/[0.05]">
								{displayCourses.map((course, i) => (
									<CourseRow
										key={course.pid}
										course={course}
										index={i}
										query={searchTerm}
									/>
								))}
							</div>
						)}
					</div>
				) : (
					<DepartmentIndex
						sections={indexedSubjects}
						onSelectDepartment={handleDepartmentClick}
					/>
				)}
			</div>
		</div>
	);
}

function DepartmentHeader({
	subject,
	subjects,
	onBack,
}: {
	subject: string;
	subjects: SubjectResult[];
	onBack: () => void;
}) {
	const info = subjects.find((s) => s.subject === subject);

	return (
		<div className="dept-header mb-8">
			<button
				type="button"
				onClick={onBack}
				className="-ml-1 mb-3 inline-flex items-center gap-1 rounded-md px-1 py-0.5 font-medium text-[#1a1a1a]/40 text-[12px] transition-colors hover:text-[#1a1a1a]/70 focus-visible:ring-2 focus-visible:ring-uvic-blue/30 focus-visible:outline-none"
			>
				<ChevronLeft className="h-3.5 w-3.5" />
				All departments
			</button>

			<div className="flex items-center gap-3">
				<div className="flex h-10 w-10 items-center justify-center rounded-xl bg-uvic-blue text-white">
					<span className="font-bold text-[11px] tracking-tight">
						{subject.slice(0, 3)}
					</span>
				</div>
				<div>
					<h2 className="font-semibold text-[#1a1a1a] text-lg tracking-tight">
						{subject}
					</h2>
					<p className="text-[#1a1a1a]/35 text-[13px]">
						{info ? `${info.courseCount} courses` : ""} in this department
					</p>
				</div>
			</div>

			<div className="mt-6 h-px bg-[#1a1a1a]/[0.06]" />
		</div>
	);
}

function CourseRow({
	course,
	index,
	query,
}: {
	course: CourseSearchResult;
	index: number;
	query: string;
}) {
	return (
		<div
			className="explore-row group flex items-center gap-4 px-2.5 py-3 transition-all"
			style={{ animationDelay: `${Math.min(index * 25, 350)}ms` }}
		>
			<div className="min-w-0 flex-1">
				<div className="flex items-baseline gap-2">
					<span className="font-semibold text-[#1a1a1a] text-[14px] tracking-tight">
						{highlightMatch(course.subjectCode, query, 1)}
					</span>
					{course.credits && (
						<span className="text-[#1a1a1a]/25 text-[12px]">
							{course.credits} cr
						</span>
					)}
				</div>
				<p className="mt-0.5 truncate text-[#1a1a1a]/60 text-[14px] leading-snug">
					{highlightMatch(course.title, query, 3)}
				</p>
			</div>

			<Link
				to="/courses/$subjectCode"
				params={{ subjectCode: course.subjectCode }}
				className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 font-medium text-[#1a1a1a]/40 text-[12px] transition-all hover:bg-[#1a1a1a]/[0.04] hover:text-[#1a1a1a]"
			>
				Details
				<ArrowRight className="h-3 w-3" />
			</Link>
		</div>
	);
}

function DepartmentIndex({
	sections,
	onSelectDepartment,
}: {
	sections: { letter: string; items: SubjectResult[] }[];
	onSelectDepartment: (dept: string) => void;
}) {
	return (
		<div className="space-y-8">
			{sections.map((section) => (
				<div key={section.letter} className="department-section">
					<div className="sticky top-0 z-10 mb-3 bg-[#FAFAF8] py-1 max-md:top-[64px]">
						<span className="font-semibold text-[#1a1a1a]/25 text-[11px] tracking-[0.2em]">
							{section.letter}
						</span>
					</div>
					<div className="divide-y divide-[#1a1a1a]/[0.05]">
						{section.items.map((subject, i) => (
							<button
								type="button"
								key={subject.subject}
								onClick={() => onSelectDepartment(subject.subject)}
								className="explore-row group flex w-full items-center gap-4 px-2.5 py-3 text-left"
								style={{ animationDelay: `${Math.min(i * 20, 300)}ms` }}
							>
								<div className="min-w-0 flex-1">
									<div className="flex items-baseline gap-2">
										<span className="font-semibold text-[#1a1a1a]/75 text-[14px] tracking-tight">
											{subject.subject}
										</span>
										<span className="text-[#1a1a1a]/25 text-[12px]">
											{subject.courseCount}
										</span>
									</div>
								</div>
								<span className="font-medium text-[#1a1a1a]/30 text-[12px] transition-colors group-hover:text-[#1a1a1a]/60">
									Explore
								</span>
								<ArrowRight className="h-3 w-3 text-[#1a1a1a]/0 transition-all group-hover:translate-x-0.5 group-hover:text-[#1a1a1a]/35" />
							</button>
						))}
					</div>
				</div>
			))}
		</div>
	);
}

function CourseRowSkeleton({ count }: { count: number }) {
	const keys = COURSE_ROW_SKELETON_KEYS.slice(0, count);
	return (
		<div className="divide-y divide-[#1a1a1a]/[0.05]">
			{keys.map((key) => (
				<div key={key} className="flex items-center gap-4 px-2.5 py-3">
					<div className="flex-1 space-y-2">
						<div className="h-3.5 w-24 animate-pulse rounded bg-[#1a1a1a]/[0.06]" />
						<div className="h-3 w-48 animate-pulse rounded bg-[#1a1a1a]/[0.04]" />
					</div>
					<div className="h-8 w-20 animate-pulse rounded-lg bg-[#1a1a1a]/[0.03]" />
				</div>
			))}
		</div>
	);
}

const COURSE_ROW_SKELETON_KEYS = [
	"course-row-skeleton-1",
	"course-row-skeleton-2",
	"course-row-skeleton-3",
	"course-row-skeleton-4",
	"course-row-skeleton-5",
	"course-row-skeleton-6",
];

function highlightMatch(text: string, query: string, minLength = 1): ReactNode {
	if (query.trim().length < minLength) return text;
	const normalizedQuery = query.trim();
	const index = text.toLowerCase().indexOf(normalizedQuery.toLowerCase());
	if (index === -1) return text;
	return (
		<>
			{text.slice(0, index)}
			<mark className="rounded bg-uvic-blue/10 px-0.5 text-uvic-blue">
				{text.slice(index, index + normalizedQuery.length)}
			</mark>
			{text.slice(index + normalizedQuery.length)}
		</>
	);
}
