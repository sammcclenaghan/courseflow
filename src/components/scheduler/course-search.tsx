import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { CourseSearchResult } from "@/utils/course-types";
import { courseQueries } from "@/utils/schedule-queries";
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
	const [debouncedQuery, setDebouncedQuery] = useState("");

	useEffect(() => {
		const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
		return () => clearTimeout(timer);
	}, [query]);

	const { data: results, isLoading } = useQuery(
		courseQueries.search(debouncedQuery, term),
	);

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
						onChange={(event) => setQuery(event.target.value)}
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
					{!debouncedQuery && (
						<p className="px-4 py-8 text-center text-muted-foreground text-sm">
							Search by course code to add courses to your planner
						</p>
					)}

					{debouncedQuery && isLoading && (
						<p className="px-4 py-8 text-center text-muted-foreground text-sm">
							Searching…
						</p>
					)}

					{debouncedQuery && !isLoading && results?.length === 0 && (
						<p className="px-4 py-8 text-center text-muted-foreground text-sm">
							No courses found
						</p>
					)}

					{debouncedQuery && results && results.length > 0 && (
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
