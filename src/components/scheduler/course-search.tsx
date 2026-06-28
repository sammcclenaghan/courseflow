import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import {
	filterCourseAutocompleteIndexByOfferings,
	searchCourseAutocomplete,
} from "@/catalog/course-autocomplete";
import {
	markCourseSearchInput,
	useCourseSearchPerformance,
} from "@/catalog/course-search-performance";
import { useCourseAutocomplete } from "@/catalog/use-course-autocomplete";
import { useCourseOfferings } from "@/catalog/use-course-offerings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { CourseSearchResult } from "@/utils/catalog-types";
import { getCourseToggle } from "./course-toggle";

export function CourseSearch({
	term,
	onCourseSelect,
	onCourseRemove,
	selectedPids,
	disabled = false,
}: {
	term: string;
	onCourseSelect: (result: CourseSearchResult) => void;
	onCourseRemove: (pid: string) => void;
	selectedPids: Set<string>;
	disabled?: boolean;
}) {
	const [query, setQuery] = useState("");
	const [autocompleteLoadRequested, setAutocompleteLoadRequested] =
		useState(false);
	const searchTerm = query.trim();
	const shouldLoadSearchData =
		!disabled && (autocompleteLoadRequested || searchTerm.length > 0);
	const autocomplete = useCourseAutocomplete(shouldLoadSearchData);
	const offerings = useCourseOfferings(term, shouldLoadSearchData);
	const offeredCourseIndex = useMemo(() => {
		if (!autocomplete.index) return null;
		if (offerings.isError) return autocomplete.index;
		if (!offerings.offeredPids) return null;
		return filterCourseAutocompleteIndexByOfferings(
			autocomplete.index,
			offerings.offeredPids,
		);
	}, [autocomplete.index, offerings.isError, offerings.offeredPids]);
	const results = useMemo(
		() =>
			offeredCourseIndex
				? searchCourseAutocomplete(offeredCourseIndex, searchTerm)
				: [],
		[offeredCourseIndex, searchTerm],
	);
	const isLoading =
		searchTerm.length > 0 && (autocomplete.isLoading || offerings.isLoading);

	useCourseSearchPerformance({
		surface: "scheduler",
		query: searchTerm,
		resultCount: results.length,
		isLoading,
	});

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="border-border/60 border-b p-4">
				<h2 className="font-semibold text-sm">Course Search</h2>
				<p className="mt-0.5 text-muted-foreground text-xs">
					Find and add courses to your timetable
				</p>
				<div className="relative mt-3">
					<Search className="-translate-y-1/2 absolute top-1/2 left-2.5 size-4 text-muted-foreground" />
					<Input
						aria-label="Search courses"
						placeholder="Search by course code…"
						value={query}
						onFocus={() => setAutocompleteLoadRequested(true)}
						onChange={(event) => {
							markCourseSearchInput("scheduler");
							setQuery(event.target.value);
						}}
						disabled={disabled}
						className="pl-8"
					/>
				</div>
			</div>

			<ScrollArea
				className={cn(
					"min-h-0 flex-1",
					disabled && "pointer-events-none opacity-60",
				)}
			>
				<div>
					{!searchTerm && (
						<p className="px-4 py-8 text-center text-muted-foreground text-sm">
							Search by course code to add courses to your planner
						</p>
					)}

					{searchTerm && isLoading && (
						<div className="divide-y divide-border/60">
							<CourseRowSkeleton />
							<CourseRowSkeleton />
							<CourseRowSkeleton />
							<CourseRowSkeleton />
							<CourseRowSkeleton />
						</div>
					)}

					{searchTerm && !isLoading && results.length === 0 && (
						<p className="px-4 py-8 text-center text-muted-foreground text-sm">
							No courses offered this term found
						</p>
					)}

					{searchTerm && results.length > 0 && (
						<div className="divide-y divide-border/60">
							{results.map((result) => (
								<CourseRow
									key={result.pid}
									course={result}
									alreadyAdded={selectedPids.has(result.pid)}
									onSelect={onCourseSelect}
									onRemove={onCourseRemove}
								/>
							))}
						</div>
					)}
				</div>
			</ScrollArea>
		</div>
	);
}

function CourseRow({
	course,
	alreadyAdded,
	onSelect,
	onRemove,
}: {
	course: CourseSearchResult;
	alreadyAdded: boolean;
	onSelect: (course: CourseSearchResult) => void;
	onRemove: (pid: string) => void;
}) {
	const { Icon, ariaLabel, isAdded } = getCourseToggle(course, alreadyAdded);
	return (
		<div className="group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-accent/50">
			<div className="min-w-0 flex-1">
				<p className="font-bold text-[15px] text-foreground leading-tight">
					{course.subjectCode}
				</p>
				<p className="mt-1.5 break-words text-sm leading-snug text-foreground/90">
					{course.title}
				</p>
			</div>
			<Button
				type="button"
				variant="ghost"
				size="icon-sm"
				onClick={() => (isAdded ? onRemove(course.pid) : onSelect(course))}
				className={cn(
					"shrink-0",
					isAdded
						? "bg-destructive/10 text-destructive hover:bg-destructive hover:text-white"
						: "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground",
				)}
				aria-label={ariaLabel}
			>
				<Icon className="size-4" />
			</Button>
		</div>
	);
}

function CourseRowSkeleton() {
	return (
		<div className="flex items-start gap-3 px-4 py-3.5">
			<div className="min-w-0 flex-1 space-y-2 pt-0.5">
				<Skeleton className="h-4 w-28" />
				<Skeleton className="h-3.5 w-44" />
			</div>
			<Skeleton className="size-8 shrink-0 rounded-lg" />
		</div>
	);
}
