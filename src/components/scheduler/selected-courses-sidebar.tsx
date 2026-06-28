import { useQuery } from "@tanstack/react-query";
import {
	Calendar,
	ChevronRight,
	Clock,
	Hourglass,
	Users,
	Wand2,
	X,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { sectionQueries } from "@/queries/scheduler";
import type { Course } from "@/utils/catalog-types";
import type { SavedCourse } from "@/utils/scheduler-types";
import { sectionMeetings } from "@/utils/section-to-events";
import type { Section } from "@/utils/sections-types";

interface SelectedCoursesSidebarProps {
	term: string;
	selectedCourses: SavedCourse[];
	onCourseRemove: (course: Course) => void;
	onSectionsUpdate: (course: Course, sections: Section[]) => void;
	onClearAll: () => void;
	readOnly?: boolean;
}

export function SelectedCoursesSidebar({
	term,
	selectedCourses,
	onCourseRemove,
	onSectionsUpdate,
	onClearAll,
	readOnly = false,
}: SelectedCoursesSidebarProps) {
	const [collapsedPidsByTerm, setCollapsedPidsByTerm] = useState<
		Record<string, Set<string>>
	>({});
	const collapsedPids = collapsedPidsByTerm[term] ?? new Set<string>();

	const togglePid = (pid: string) => {
		setCollapsedPidsByTerm((prev) => {
			const next = new Set(prev[term]);
			if (next.has(pid)) {
				next.delete(pid);
			} else {
				next.add(pid);
			}
			return { ...prev, [term]: next };
		});
	};

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="flex items-center justify-between border-b border-border/60 p-4">
				<h2 className="text-sm font-semibold">Selected Courses</h2>
				{selectedCourses.length > 0 && (
					<Button
						variant="outline"
						size="sm"
						onClick={onClearAll}
						disabled={readOnly}
					>
						Clear
					</Button>
				)}
			</div>

			{readOnly && (
				<div className="flex items-center gap-2 border-b border-uvic-blue/15 bg-uvic-blue/5 px-4 py-2 text-[11px] font-medium text-uvic-blue">
					<Wand2 className="size-3 shrink-0" />
					<span>Auto-schedule preview</span>
					<span className="ml-auto text-uvic-blue/65">Close to edit</span>
				</div>
			)}

			<ScrollArea className="min-h-0 flex-1">
				<div className="space-y-4 p-2">
					{selectedCourses.length === 0 && (
						<div className="mx-2 mt-4 flex items-center justify-center rounded-lg border-2 border-dashed border-border p-8">
							<p className="text-sm text-muted-foreground">
								No courses selected yet
							</p>
						</div>
					)}

					{selectedCourses.map((sc) => (
						<CourseCard
							key={sc.course.pid}
							term={term}
							savedCourse={sc}
							expanded={!collapsedPids.has(sc.course.pid)}
							onToggle={() => togglePid(sc.course.pid)}
							onRemove={() => onCourseRemove(sc.course)}
							onSectionsUpdate={(sections) =>
								onSectionsUpdate(sc.course, sections)
							}
							readOnly={readOnly}
						/>
					))}
				</div>
			</ScrollArea>
		</div>
	);
}

interface CourseCardProps {
	term: string;
	savedCourse: SavedCourse;
	expanded: boolean;
	onToggle: () => void;
	onRemove: () => void;
	onSectionsUpdate: (sections: Section[]) => void;
	readOnly?: boolean;
}

function CourseCard({
	term,
	savedCourse,
	expanded,
	onToggle,
	onRemove,
	onSectionsUpdate,
	readOnly = false,
}: CourseCardProps) {
	const { course } = savedCourse;

	return (
		<div className="mb-1 overflow-hidden rounded-lg border border-border/60">
			<div className="flex items-start gap-2 p-3">
				<button
					type="button"
					onClick={onToggle}
					aria-expanded={expanded}
					aria-label={`${expanded ? "Collapse" : "Expand"} sections for ${course.subjectCode}`}
					className="flex min-w-0 flex-1 items-start gap-2 rounded-md text-left"
				>
					<ChevronRight
						className={cn(
							"mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform",
							expanded && "rotate-90",
						)}
					/>
					<div className="min-w-0 flex-1">
						<span className="text-sm font-semibold">{course.subjectCode}</span>
						<p className="break-words text-xs leading-snug text-muted-foreground">
							{course.title}
						</p>
					</div>
				</button>
				<Button
					variant="ghost"
					size="icon"
					className="size-7 shrink-0"
					onClick={onRemove}
					disabled={readOnly}
					aria-label={`Remove ${course.subjectCode} from timetable`}
				>
					<X className="size-3.5" />
				</Button>
			</div>

			{expanded && (
				<div className="border-t border-border/60 px-3 pb-3 pt-2">
					<SectionSelector
						term={term}
						savedCourse={savedCourse}
						onSectionsUpdate={onSectionsUpdate}
						readOnly={readOnly}
					/>
				</div>
			)}
		</div>
	);
}

interface SectionSelectorProps {
	term: string;
	savedCourse: SavedCourse;
	onSectionsUpdate: (sections: Section[]) => void;
	readOnly?: boolean;
}

function SectionSelector({
	term,
	savedCourse,
	onSectionsUpdate,
	readOnly = false,
}: SectionSelectorProps) {
	const { data: grouped, isLoading } = useQuery(
		sectionQueries.byPidAndTerm(savedCourse.course.pid, term),
	);

	if (isLoading) {
		return (
			<div className="space-y-3">
				<SectionGroupSkeleton />
				<SectionGroupSkeleton />
			</div>
		);
	}

	if (!grouped) return null;

	const selectedCrns = new Set(savedCourse.sections.map((s) => s.crn));

	const handleSelect = (section: Section) => {
		const otherTypes = savedCourse.sections.filter(
			(s) => s.scheduleType !== section.scheduleType,
		);
		onSectionsUpdate([...otherTypes, section]);
	};

	const typeGroups: { label: string; sections: Section[] }[] = [
		{ label: "Lectures", sections: grouped.lectures },
		{ label: "Labs", sections: grouped.labs },
		{ label: "Tutorials", sections: grouped.tutorials },
		{ label: "Other", sections: grouped.other },
	].filter((g) => g.sections.length > 0);

	return (
		<div className="space-y-3">
			{typeGroups.map((group) => (
				<div key={group.label}>
					<p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
						{group.label}
					</p>
					<div className="space-y-1">
						{group.sections.map((section) => {
							const isSelected = selectedCrns.has(section.crn);
							const isFull = section.enrollmentSeatsAvailable <= 0;

							return (
								<button
									type="button"
									aria-pressed={isSelected}
									aria-label={`Select ${section.section} ${group.label.toLowerCase()} for ${savedCourse.course.subjectCode}`}
									key={section.crn}
									onClick={() => handleSelect(section)}
									disabled={readOnly}
									className={cn(
										"flex w-full flex-col gap-1 rounded-md border px-2.5 py-2 text-left transition-colors",
										isSelected
											? "border-primary/35 bg-primary/10"
											: "border-border/60 hover:bg-accent",
										readOnly &&
											"cursor-not-allowed opacity-60 hover:bg-transparent",
									)}
								>
									<div className="flex items-center justify-between">
										<span className="text-xs font-semibold">
											{section.section}
										</span>
									</div>

									{sectionMeetings(section).map((meeting) => (
										<div
											key={`${meeting.days}-${meeting.time}-${meeting.location}`}
											className="flex items-center gap-3 text-[11px] text-muted-foreground"
										>
											<span className="inline-flex items-center gap-1">
												<Calendar className="size-3" />
												{meeting.days}
											</span>
											<span className="inline-flex items-center gap-1">
												<Clock className="size-3" />
												{meeting.time}
											</span>
										</div>
									))}

									<div className="flex items-center gap-3 text-[11px] text-muted-foreground">
										<Tooltip>
											<TooltipTrigger asChild>
												<span
													className={cn(
														"inline-flex items-center gap-1",
														isFull && "text-red-600",
													)}
												>
													<Users className="size-3" />
													{section.enrollmentActual}/{section.enrollmentMaximum}
												</span>
											</TooltipTrigger>
											<TooltipContent>
												Enrolled: {section.enrollmentActual} of{" "}
												{section.enrollmentMaximum} seats
												{isFull ? " (full)" : ""}
											</TooltipContent>
										</Tooltip>
										{section.waitlistCapacity > 0 && (
											<Tooltip>
												<TooltipTrigger asChild>
													<span className="inline-flex items-center gap-1">
														<Hourglass className="size-3" />
														{section.waitlistActual}/{section.waitlistCapacity}
													</span>
												</TooltipTrigger>
												<TooltipContent>
													Waitlist: {section.waitlistActual} of{" "}
													{section.waitlistCapacity}
												</TooltipContent>
											</Tooltip>
										)}
									</div>
								</button>
							);
						})}
					</div>
				</div>
			))}
		</div>
	);
}

function SectionGroupSkeleton() {
	return (
		<div>
			<Skeleton className="mb-1.5 h-3 w-16" />
			<div className="space-y-1">
				<Skeleton className="h-12 w-full rounded-md" />
				<Skeleton className="h-12 w-full rounded-md" />
			</div>
		</div>
	);
}
