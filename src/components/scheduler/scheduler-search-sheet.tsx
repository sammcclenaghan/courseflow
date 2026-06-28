import { ArrowLeft, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
	filterCoursesByOfferings,
	searchCourseAutocomplete,
} from "@/catalog/course-autocomplete";
import {
	markCourseSearchInput,
	useCourseSearchPerformance,
} from "@/catalog/course-search-performance";
import { useCourseAutocomplete } from "@/catalog/use-course-autocomplete";
import { useCourseOfferings } from "@/catalog/use-course-offerings";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { CourseSearchResult } from "@/utils/catalog-types";
import { getCourseToggle } from "./course-toggle";

interface SchedulerSearchSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	term: string;
	onCourseSelect: (result: CourseSearchResult) => void;
	selectedPids: Set<string>;
	onCourseRemove: (pid: string) => void;
}

export function SchedulerSearchSheet({
	open,
	onOpenChange,
	term,
	onCourseSelect,
	selectedPids,
	onCourseRemove,
}: SchedulerSearchSheetProps) {
	const [query, setQuery] = useState("");
	const inputRef = useRef<HTMLInputElement>(null);

	const searchTerm = query.trim();
	const shouldLoad = searchTerm.length > 0;
	const autocomplete = useCourseAutocomplete(shouldLoad);
	const offerings = useCourseOfferings(term, shouldLoad);

	const offeredCourses = useMemo(() => {
		if (!autocomplete.courses) return [];
		if (offerings.isError) return autocomplete.courses;
		if (!offerings.offeredPids) return [];
		return filterCoursesByOfferings(
			autocomplete.courses,
			offerings.offeredPids,
		);
	}, [autocomplete.courses, offerings.isError, offerings.offeredPids]);

	const results = useMemo(
		() => searchCourseAutocomplete(offeredCourses, searchTerm),
		[offeredCourses, searchTerm],
	);

	const isLoading =
		searchTerm.length > 0 && (autocomplete.isLoading || offerings.isLoading);

	useCourseSearchPerformance({
		surface: "scheduler",
		query: searchTerm,
		resultCount: results.length,
		isLoading,
	});

	useEffect(() => {
		if (open) {
			const timer = setTimeout(() => inputRef.current?.focus(), 100);
			return () => clearTimeout(timer);
		}
		setQuery("");
	}, [open]);

	const handleClose = (nextOpen: boolean) => {
		if (!nextOpen) setQuery("");
		onOpenChange(nextOpen);
	};

	const handleSelect = (result: CourseSearchResult) => {
		onCourseSelect(result);
		setTimeout(() => handleClose(false), 150);
	};

	return (
		<Drawer open={open} onOpenChange={handleClose}>
			<DrawerContent className="h-[92dvh] max-h-[92dvh]">
				<DrawerTitle className="sr-only">Search Courses</DrawerTitle>

				{/* Search header */}
				<div className="flex items-center gap-2 px-4 pb-3">
					<button
						type="button"
						onClick={() => handleClose(false)}
						className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground active:bg-muted"
						aria-label="Close search"
					>
						<ArrowLeft className="size-5" />
					</button>
					<div className="relative flex-1">
						<Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							ref={inputRef}
							value={query}
							onChange={(e) => {
								markCourseSearchInput("scheduler");
								setQuery(e.target.value);
							}}
							aria-label="Search courses"
							placeholder="Search by course code…"
							className="h-10 rounded-xl bg-muted/60 border-0 pl-10 pr-4"
						/>
					</div>
				</div>

				<ScrollArea className="flex-1">
					<div className="px-4 pb-safe-area-bottom">
						{!searchTerm && (
							<div className="flex flex-col items-center py-16 text-center">
								<Search className="size-10 text-muted-foreground/30" />
								<p className="text-muted-foreground text-sm mt-3">
									Search by course code
								</p>
								<p className="text-muted-foreground/60 text-xs mt-1">
									e.g. &ldquo;CSC 110&rdquo; or &ldquo;MATH 200&rdquo;
								</p>
							</div>
						)}

						{searchTerm && isLoading && (
							<div className="flex items-center justify-center py-16">
								<div className="size-5 rounded-full border-2 border-muted-foreground/20 border-t-primary animate-spin" />
							</div>
						)}

						{searchTerm && !isLoading && results.length === 0 && (
							<p className="text-muted-foreground text-sm py-16 text-center">
								No courses offered this term found
							</p>
						)}

						{searchTerm && results.length > 0 && (
							<div className="divide-y divide-border/60">
								{results.map((result) => {
									const { Icon, ariaLabel, isAdded } = getCourseToggle(
										result,
										selectedPids.has(result.pid),
									);
									return (
										<button
											type="button"
											key={result.pid}
											aria-label={ariaLabel}
											onClick={() =>
												isAdded
													? onCourseRemove(result.pid)
													: handleSelect(result)
											}
											className={cn(
												"flex w-full items-center gap-3 px-1 py-3.5 text-left transition-colors active:bg-accent",
												isAdded && "bg-destructive/5",
											)}
										>
											<div className="min-w-0 flex-1">
												<p className="text-[15px] font-bold text-foreground">
													{result.subjectCode}
												</p>
												<p className="text-foreground/90 text-sm break-words mt-1.5">
													{result.title}
												</p>
											</div>
											<Button
												type="button"
												variant="ghost"
												size="icon-sm"
												className={cn(
													"shrink-0",
													isAdded
														? "bg-destructive/10 text-destructive hover:bg-destructive hover:text-white"
														: "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground",
												)}
												aria-label={ariaLabel}
												tabIndex={-1}
											>
												<Icon className="size-4" />
											</Button>
										</button>
									);
								})}
							</div>
						)}
					</div>
				</ScrollArea>
			</DrawerContent>
		</Drawer>
	);
}
