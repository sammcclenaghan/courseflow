import { queryOptions, useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
	getCourseBySubjectCode,
	listSubjects,
	searchCourses,
} from "@/utils/courses";

const DEFAULT_TERM = "202609";

function subjectsQueryOptions(term: string) {
	return queryOptions({
		queryKey: ["courses", "subjects", term],
		queryFn: () => listSubjects({ data: { term: term || undefined } }),
	});
}

export const Route = createFileRoute("/explore")({
	// Prefetch the subjects list so it renders on first paint (and proves the
	// server function works end-to-end through SSR + dehydration).
	loader: ({ context }) =>
		context.queryClient.ensureQueryData(subjectsQueryOptions(DEFAULT_TERM)),
	component: Explore,
});

function Explore() {
	const [rawQuery, setRawQuery] = useState("");
	const [term, setTerm] = useState(DEFAULT_TERM);
	const [selected, setSelected] = useState<string | null>(null);

	// Debounce the search input so we don't hit the server on every keystroke.
	const [query, setQuery] = useState("");
	useEffect(() => {
		const id = setTimeout(() => setQuery(rawQuery.trim()), 250);
		return () => clearTimeout(id);
	}, [rawQuery]);

	const trimmedTerm = term.trim();

	const search = useQuery({
		queryKey: ["courses", "search", query, trimmedTerm],
		queryFn: () =>
			searchCourses({ data: { query, term: trimmedTerm || undefined } }),
		enabled: query.length > 0,
	});

	const subjects = useQuery(subjectsQueryOptions(trimmedTerm));

	const detail = useQuery({
		queryKey: ["courses", "detail", selected],
		queryFn: () =>
			getCourseBySubjectCode({ data: { subjectCode: selected as string } }),
		enabled: selected !== null,
	});

	return (
		<section className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-12">
			<header>
				<p className="font-medium text-[11px] text-muted-foreground tracking-[0.3em] uppercase">
					Explore — API demo
				</p>
				<h1 className="mt-3 font-semibold text-3xl tracking-tight">
					Course catalog
				</h1>
				<p className="mt-2 max-w-xl text-muted-foreground text-sm leading-relaxed">
					Live demo wired to the D1-backed server functions:{" "}
					<code className="rounded bg-muted px-1 py-0.5 text-xs">
						searchCourses
					</code>
					,{" "}
					<code className="rounded bg-muted px-1 py-0.5 text-xs">
						getCourseBySubjectCode
					</code>
					, and{" "}
					<code className="rounded bg-muted px-1 py-0.5 text-xs">
						listSubjects
					</code>
					.
				</p>
			</header>

			{/* Controls */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-end">
				<label className="flex flex-1 flex-col gap-1.5">
					<span className="font-medium text-[11px] text-muted-foreground tracking-wider uppercase">
						Search courses
					</span>
					<div className="relative">
						<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
						<input
							value={rawQuery}
							onChange={(e) => setRawQuery(e.target.value)}
							placeholder="e.g. CSC, MATH 100, calculus"
							className="h-11 w-full rounded-lg border border-border bg-background pr-3 pl-9 text-sm outline-none focus-visible:border-uvic-blue focus-visible:ring-2 focus-visible:ring-uvic-blue/20"
						/>
					</div>
				</label>
				<label className="flex flex-col gap-1.5">
					<span className="font-medium text-[11px] text-muted-foreground tracking-wider uppercase">
						Term
					</span>
					<input
						value={term}
						onChange={(e) => setTerm(e.target.value)}
						placeholder="optional"
						className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus-visible:border-uvic-blue focus-visible:ring-2 focus-visible:ring-uvic-blue/20 sm:w-36"
					/>
				</label>
			</div>

			<div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
				{/* Search results */}
				<div className="flex flex-col gap-3">
					<SectionLabel>
						Results
						{search.isFetching && (
							<Loader2 className="ml-2 inline h-3 w-3 animate-spin" />
						)}
					</SectionLabel>

					{query.length === 0 && (
						<EmptyState>Start typing to search the catalog.</EmptyState>
					)}

					{search.isError && (
						<ErrorState>
							{(search.error as Error)?.message ?? "Search failed."}
						</ErrorState>
					)}

					{query.length > 0 && search.isSuccess && search.data.length === 0 && (
						<EmptyState>No courses match “{query}”.</EmptyState>
					)}

					{search.data && search.data.length > 0 && (
						<ul className="flex flex-col divide-y divide-border overflow-hidden rounded-lg border border-border">
							{search.data.map((course) => (
								<li key={course.pid}>
									<button
										type="button"
										onClick={() => setSelected(course.subjectCode)}
										className={cn(
											"flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
											selected === course.subjectCode && "bg-muted",
										)}
									>
										<span className="min-w-0">
											<span className="font-medium text-sm">
												{course.subjectCode}
											</span>
											<span className="block truncate text-muted-foreground text-sm">
												{course.title}
											</span>
										</span>
										<span className="shrink-0 text-muted-foreground text-xs">
											{course.credits} cr
										</span>
									</button>
								</li>
							))}
						</ul>
					)}

					{/* Course detail */}
					{selected && (
						<div className="mt-2 rounded-lg border border-border bg-card p-4">
							<SectionLabel>Course detail — {selected}</SectionLabel>
							{detail.isFetching && (
								<p className="mt-2 flex items-center gap-2 text-muted-foreground text-sm">
									<Loader2 className="h-3 w-3 animate-spin" /> Loading…
								</p>
							)}
							{detail.isError && (
								<ErrorState>Course “{selected}” not found.</ErrorState>
							)}
							{detail.data && (
								<div className="mt-2 flex flex-col gap-2">
									<h3 className="font-semibold text-base">
										{detail.data.subjectCode} — {detail.data.title}
									</h3>
									<p className="text-muted-foreground text-xs">
										{detail.data.credits} credits
										{detail.data.hoursCatalogText
											? ` · ${detail.data.hoursCatalogText}`
											: ""}
									</p>
									{detail.data.description && (
										<p className="text-sm leading-relaxed">
											{detail.data.description}
										</p>
									)}
									{detail.data.preAndCorequisites && (
										<p className="text-muted-foreground text-sm">
											<span className="font-medium text-foreground">
												Pre/co-requisites:{" "}
											</span>
											{detail.data.preAndCorequisites}
										</p>
									)}
								</div>
							)}
						</div>
					)}
				</div>

				{/* Subjects */}
				<div className="flex flex-col gap-3">
					<SectionLabel>
						Subjects
						{subjects.isFetching && (
							<Loader2 className="ml-2 inline h-3 w-3 animate-spin" />
						)}
					</SectionLabel>
					{subjects.isError && (
						<ErrorState>Failed to load subjects.</ErrorState>
					)}
					{subjects.data && subjects.data.length === 0 && (
						<EmptyState>No subjects for this term.</EmptyState>
					)}
					{subjects.data && subjects.data.length > 0 && (
						<ul className="flex flex-wrap gap-2">
							{subjects.data.map((s) => (
								<li key={s.subject}>
									<button
										type="button"
										onClick={() => setRawQuery(s.subject)}
										className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs transition-colors hover:border-uvic-blue hover:text-uvic-blue"
									>
										<span className="font-medium">{s.subject}</span>
										<span className="text-muted-foreground">
											{s.courseCount}
										</span>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</section>
	);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<p className="font-medium text-[11px] text-muted-foreground tracking-wider uppercase">
			{children}
		</p>
	);
}

function EmptyState({ children }: { children: React.ReactNode }) {
	return (
		<div className="rounded-lg border border-border border-dashed px-4 py-8 text-center text-muted-foreground text-sm">
			{children}
		</div>
	);
}

function ErrorState({ children }: { children: React.ReactNode }) {
	return (
		<div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive text-sm">
			{children}
		</div>
	);
}
