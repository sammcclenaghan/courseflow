import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef } from "react";
import { Calendar } from "@/components/calendar/calendar";
import { useIsMobile } from "@/lib/use-media-query";
import {
	scheduleQueries,
	scheduleQueryKey,
	sectionQueries,
} from "@/queries/scheduler";
import type { Course, CourseSearchResult } from "@/utils/catalog-types";
import { TERMS } from "@/utils/constants";
import { saveMySchedule } from "@/utils/scheduler.functions";
import { expandSavedSchedule } from "@/utils/scheduler-domain";
import type {
	SavedCourse,
	ScheduleWithSections,
} from "@/utils/scheduler-types";
import { coursesToEvents } from "@/utils/section-to-events";
import type { GroupedSections, Section } from "@/utils/sections-types";
import { CourseSearch } from "./course-search";
import { MobileSchedulerShell } from "./mobile-scheduler-shell";
import { ScheduleSharePanel } from "./schedule-share-panel";
import { SelectedCoursesSidebar } from "./selected-courses-sidebar";

export function SchedulerPage({
	term,
	onTermChange,
}: {
	term: string;
	onTermChange: (term: string) => void;
}) {
	const queryClient = useQueryClient();
	const isMobile = useIsMobile();
	const saveVersionRef = useRef(0);
	const scheduleQuery = useQuery(scheduleQueries.mine(term));
	const selectedCourses = useMemo(
		() => expandSavedSchedule(term, scheduleQuery.data),
		[term, scheduleQuery.data],
	);
	const events = useMemo(
		() => coursesToEvents(selectedCourses),
		[selectedCourses],
	);
	const selectedPids = useMemo(
		() => new Set(selectedCourses.map((savedCourse) => savedCourse.course.pid)),
		[selectedCourses],
	);

	async function commitCourses(courses: SavedCourse[]) {
		const version = ++saveVersionRef.current;
		const key = scheduleQueryKey(term);
		const previous = queryClient.getQueryData<ScheduleWithSections | null>(key);

		queryClient.setQueryData(key, scheduleFromCourses(term, courses, previous));

		try {
			const next = await saveMySchedule({
				data: {
					term,
					crns: courses.flatMap((savedCourse) =>
						savedCourse.sections.map((section) => section.crn),
					),
				},
			});
			if (saveVersionRef.current === version) {
				queryClient.setQueryData(key, next);
			}
		} catch (error) {
			console.error("Failed to save schedule", error);
			if (saveVersionRef.current === version) {
				queryClient.setQueryData(key, previous ?? null);
			}
		}
	}

	async function addCourse(result: CourseSearchResult) {
		if (selectedPids.has(result.pid)) return;

		const grouped = await queryClient.ensureQueryData(
			sectionQueries.byPidAndTerm(result.pid, term),
		);
		if (!hasAnySections(grouped)) return;

		void commitCourses([
			...selectedCourses,
			{
				course: courseFromSearchResult(result),
				sections: selectDefaultSections(grouped),
				term,
			},
		]);
	}

	function removeCourse(course: Course) {
		void commitCourses(
			selectedCourses.filter(
				(savedCourse) => savedCourse.course.pid !== course.pid,
			),
		);
	}

	function updateSections(course: Course, sections: Section[]) {
		void commitCourses(
			selectedCourses.map((savedCourse) =>
				savedCourse.course.pid === course.pid
					? { ...savedCourse, sections }
					: savedCourse,
			),
		);
	}

	function clearAll() {
		void commitCourses([]);
	}

	if (isMobile) {
		return (
			<MobileSchedulerShell
				term={term}
				onTermChange={onTermChange}
				selectedCourses={selectedCourses}
				events={events}
				onCourseSelect={addCourse}
				onCourseRemove={removeCourse}
				onSectionsUpdate={updateSections}
				onClearAll={clearAll}
			/>
		);
	}

	return (
		<div className="flex h-[calc(100dvh-var(--app-header-height))] w-full flex-col overflow-hidden lg:flex-row">
			<aside className="flex h-60 w-full shrink-0 flex-col overflow-hidden border-border/60 border-b bg-background lg:h-auto lg:w-80 lg:border-r lg:border-b-0">
				<CourseSearch
					term={term}
					onCourseSelect={addCourse}
					onCourseRemove={(pid) => {
						const savedCourse = selectedCourses.find(
							(course) => course.course.pid === pid,
						);
						if (savedCourse) removeCourse(savedCourse.course);
					}}
					selectedPids={selectedPids}
				/>
			</aside>

			<main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
				<div className="flex flex-wrap items-center justify-between gap-3 border-border/60 border-b px-4 py-3">
					<div className="flex items-center gap-2">
						<label
							className="font-medium text-muted-foreground text-xs"
							htmlFor="term"
						>
							Term
						</label>
						<select
							id="term"
							value={term}
							onChange={(event) => onTermChange(event.target.value)}
							className="h-8 rounded-lg border border-border bg-background px-2 text-sm outline-none focus-visible:border-uvic-blue"
						>
							{TERMS.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</div>

					<div className="flex items-center gap-2">
						<ScheduleSharePanel
							term={term}
							disabled={selectedCourses.length === 0}
						/>
					</div>
				</div>

				<div className="relative flex-1 overflow-hidden">
					<Calendar events={events} />
					{scheduleQuery.isLoading && (
						<div className="absolute inset-x-0 top-0 bg-background/80 px-4 py-2 text-center text-muted-foreground text-xs backdrop-blur">
							Loading saved schedule…
						</div>
					)}
				</div>
			</main>

			<aside className="flex h-72 w-full shrink-0 flex-col overflow-hidden border-border/60 border-t bg-background lg:h-auto lg:w-80 lg:border-t-0 lg:border-l">
				<SelectedCoursesSidebar
					term={term}
					selectedCourses={selectedCourses}
					onCourseRemove={removeCourse}
					onSectionsUpdate={updateSections}
					onClearAll={clearAll}
				/>
			</aside>
		</div>
	);
}

function scheduleFromCourses(
	term: string,
	courses: SavedCourse[],
	previous: ScheduleWithSections | null | undefined,
): ScheduleWithSections | null {
	if (courses.length === 0) return null;

	return {
		schedule: previous?.schedule ?? {
			id: 0,
			term,
			createdAt: "",
			updatedAt: "",
		},
		sections: courses.flatMap((savedCourse) => savedCourse.sections),
	};
}

function courseFromSearchResult(result: CourseSearchResult): Course {
	return {
		id: 0,
		pid: result.pid,
		subjectCode: result.subjectCode,
		title: result.title,
		description: "",
		credits: result.credits,
		hoursCatalogText: "",
		notes: "",
		preAndCorequisites: "",
		createdAt: "",
		updatedAt: "",
	};
}

function hasAnySections(grouped: GroupedSections): boolean {
	return (
		grouped.lectures.length > 0 ||
		grouped.labs.length > 0 ||
		grouped.tutorials.length > 0 ||
		grouped.other.length > 0
	);
}

function selectDefaultSections(grouped: GroupedSections): Section[] {
	const defaults: Section[] = [];
	const seenScheduleTypes = new Set<string>();

	for (const section of [
		...grouped.lectures,
		...grouped.labs,
		...grouped.tutorials,
		...grouped.other,
	]) {
		if (seenScheduleTypes.has(section.scheduleType)) continue;
		seenScheduleTypes.add(section.scheduleType);
		defaults.push(section);
	}

	return defaults;
}
