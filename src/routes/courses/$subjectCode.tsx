import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
	createFileRoute,
	Link,
	stripSearchParams,
} from "@tanstack/react-router";
import {
	ArrowLeft,
	ArrowRight,
	Check,
	ChevronDown,
	Heart,
	Plus,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { z } from "zod";
import { catalogQueries, catalogSectionQueries } from "@/queries/catalog";
import { scheduleQueries, scheduleQueryKey } from "@/queries/scheduler";
import type {
	AlternativeMode,
	Course,
	CourseAlternative,
} from "@/utils/catalog-types";
import { DEFAULT_TERM, getTermLabel } from "@/utils/constants";
import { saveMySchedule } from "@/utils/scheduler.functions";
import type { ScheduleWithSections } from "@/utils/scheduler-types";
import { formatSectionSchedule } from "@/utils/section-to-events";
import type { GroupedSections, Section } from "@/utils/sections-types";

const alternativesDefault = "best" satisfies AlternativeMode;
const courseSearchSchema = z.object({
	term: z.string().default(DEFAULT_TERM).catch(DEFAULT_TERM),
	alternatives: z
		.enum(["best", "offered", "all"])
		.default(alternativesDefault)
		.catch(alternativesDefault),
});

export const Route = createFileRoute("/courses/$subjectCode")({
	validateSearch: courseSearchSchema,
	search: {
		middlewares: [
			stripSearchParams({
				term: DEFAULT_TERM,
				alternatives: alternativesDefault,
			}),
		],
	},
	loaderDeps: ({ search: { term, alternatives } }) => ({ term, alternatives }),
	loader: async ({ context: { queryClient }, params, deps }) => {
		const course = await queryClient.ensureQueryData(
			catalogQueries.bySubjectCode(params.subjectCode),
		);
		await Promise.all([
			queryClient.ensureQueryData(
				catalogSectionQueries.byPidAndTerm(course.pid, deps.term),
			),
			queryClient.ensureQueryData(
				catalogQueries.alternatives({
					subjectCode: params.subjectCode,
					term: deps.term,
					mode: deps.alternatives,
					limit: 8,
				}),
			),
			queryClient.ensureQueryData(scheduleQueries.mine(deps.term)),
		]);
	},
	component: CourseDetailPage,
});

function CourseDetailPage() {
	const { subjectCode } = Route.useParams();
	const { term, alternatives } = Route.useSearch();
	const navigate = Route.useNavigate();
	const queryClient = useQueryClient();
	const courseQuery = useQuery(catalogQueries.bySubjectCode(subjectCode));
	const course = courseQuery.data;
	const sectionsQuery = useQuery(
		catalogSectionQueries.byPidAndTerm(course?.pid ?? "", term),
	);
	const alternativesQuery = useQuery(
		catalogQueries.alternatives({
			subjectCode,
			term,
			mode: alternatives,
			limit: 8,
		}),
	);
	const scheduleQuery = useQuery(scheduleQueries.mine(term));
	const [isAdding, setIsAdding] = useState(false);
	const { isFavourite, toggleFavourite } = useFavouriteCourses();

	if (courseQuery.isLoading) {
		return <CourseDetailSkeleton />;
	}

	if (courseQuery.isError || !course) {
		return <CourseNotFound />;
	}

	const groupedSections = sectionsQuery.data;
	const hasSections =
		!sectionsQuery.isLoading &&
		groupedSections &&
		hasAnySections(groupedSections);
	const selectedTermLabel = getTermLabel(term);
	const isSaved = Boolean(
		scheduleQuery.data?.sections.some(
			(section) => section.coursePid === course.pid,
		),
	);
	const courseFavourited = isFavourite(course.pid);

	async function addCourseToSchedule() {
		if (!course || !groupedSections || isSaved || isAdding) return;
		const defaults = selectDefaultSections(groupedSections);
		if (defaults.length === 0) return;

		setIsAdding(true);
		const previous = queryClient.getQueryData<ScheduleWithSections | null>(
			scheduleQueryKey(term),
		);
		const existingCrns = previous?.sections.map((section) => section.crn) ?? [];
		const crns = [
			...new Set([...existingCrns, ...defaults.map((section) => section.crn)]),
		];

		try {
			const next = await saveMySchedule({ data: { term, crns } });
			queryClient.setQueryData(scheduleQueryKey(term), next);
		} catch (error) {
			console.error("Failed to add course to timetable", error);
		} finally {
			setIsAdding(false);
		}
	}

	return (
		<div className="w-full flex-1 overflow-y-auto bg-[#FAFAF8]">
			<div
				className="pointer-events-none fixed inset-0 opacity-[0.025]"
				style={{
					backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
					backgroundRepeat: "repeat",
					backgroundSize: "128px 128px",
				}}
			/>

			<div className="relative z-10 mx-auto w-full max-w-5xl px-6 py-12">
				<Link
					to="/explore"
					className="group mb-8 inline-flex items-center gap-1.5 rounded-md text-[#1a1a1a]/35 text-[13px] hover:text-[#1a1a1a]/60"
				>
					<ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
					Back to explore
				</Link>

				<div className="flex flex-col gap-12 lg:flex-row lg:gap-16">
					<div className="w-full shrink-0 lg:w-[340px] xl:w-[380px]">
						<div className="lg:sticky lg:top-12">
							<div>
								<h1 className="font-semibold text-[#1a1a1a] text-[clamp(1.5rem,3vw,2rem)] tracking-tight">
									{course.subjectCode}
								</h1>
								<p className="mt-1 text-[#1a1a1a]/55 text-[16px] leading-relaxed">
									{course.title}
								</p>
								<div className="mt-3 flex items-center gap-3">
									{course.credits && (
										<span className="rounded-full bg-[#1a1a1a]/[0.05] px-3 py-1 font-medium text-[#1a1a1a]/50 text-[12px]">
											{course.credits} credits
										</span>
									)}
									{course.hoursCatalogText && (
										<span className="text-[#1a1a1a]/25 text-[12px]">
											{course.hoursCatalogText}
										</span>
									)}
								</div>
							</div>

							<div className="mt-6 flex flex-wrap items-center gap-3">
								{hasSections && (
									<button
										type="button"
										onClick={addCourseToSchedule}
										disabled={isSaved || isAdding}
										className="flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 font-medium text-[13px] transition-all disabled:cursor-default"
										style={{
											backgroundColor: isSaved
												? "rgba(16,185,129,0.08)"
												: "var(--uvic-blue)",
											color: isSaved ? "#059669" : "#fff",
										}}
									>
										{isSaved ? (
											<>
												<Check className="h-3.5 w-3.5" />
												In Timetable
											</>
										) : (
											<>
												<Plus className="h-3.5 w-3.5" />
												Add to Timetable
											</>
										)}
									</button>
								)}
								<button
									type="button"
									aria-label={
										courseFavourited
											? `Remove ${course.subjectCode} from saved courses`
											: `Save ${course.subjectCode}`
									}
									aria-pressed={courseFavourited}
									onClick={() => toggleFavourite(course)}
									className={[
										"flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 font-medium text-[13px] transition-all",
										courseFavourited
											? "bg-uvic-blue/10 text-uvic-blue"
											: "bg-[#1a1a1a]/[0.06] text-[#1a1a1a]/50 hover:bg-[#1a1a1a]/[0.1] hover:text-[#1a1a1a]/70",
									].join(" ")}
								>
									<Heart
										className="h-3.5 w-3.5"
										fill={courseFavourited ? "currentColor" : "none"}
									/>
									{courseFavourited ? "Saved" : "Save Course"}
								</button>
							</div>

							<div className="my-6 h-px bg-[#1a1a1a]/[0.06]" />

							<div className="space-y-5">
								{course.description && (
									<section>
										<h2 className="mb-2 font-semibold text-[#1a1a1a]/30 text-[11px] tracking-[0.12em] uppercase">
											Description
										</h2>
										<p className="text-[#1a1a1a]/50 text-[13px] leading-[1.75]">
											{course.description}
										</p>
									</section>
								)}

								{course.preAndCorequisites && (
									<section>
										<h2 className="mb-2 font-semibold text-[#1a1a1a]/30 text-[11px] tracking-[0.12em] uppercase">
											Prerequisites & Corequisites
										</h2>
										<PrerequisiteList text={course.preAndCorequisites} />
									</section>
								)}

								{course.notes && (
									<section>
										<h2 className="mb-2 font-semibold text-[#1a1a1a]/30 text-[11px] tracking-[0.12em] uppercase">
											Notes
										</h2>
										<p className="text-[#1a1a1a]/50 text-[13px] leading-[1.75]">
											{course.notes}
										</p>
									</section>
								)}
							</div>
						</div>
					</div>

					<div className="min-w-0 flex-1">
						<SimilarAlternativesSection
							results={alternativesQuery.data?.results ?? []}
							isLoading={alternativesQuery.isLoading}
							mode={alternatives}
							term={term}
							onModeChange={(mode) =>
								navigate({
									search: (prev) => ({ ...prev, alternatives: mode }),
								})
							}
						/>

						<section>
							<div className="mb-5 border-[#1a1a1a]/[0.08] border-t pt-6">
								<div className="flex items-baseline justify-between gap-4">
									<div>
										<h2 className="font-semibold text-[#1a1a1a] text-[15px] tracking-tight">
											Offerings
										</h2>
										<p className="mt-0.5 text-[#1a1a1a]/40 text-[12px]">
											Sections available in {selectedTermLabel}
										</p>
									</div>
									<Link
										to="/scheduler"
										search={{ term }}
										className="font-medium text-[#1a1a1a]/40 text-[12px] transition-colors hover:text-uvic-blue"
									>
										Open Timetable →
									</Link>
								</div>
							</div>

							{sectionsQuery.isLoading ? (
								<div className="space-y-2">
									<div className="h-3 w-48 animate-pulse rounded bg-[#1a1a1a]/[0.05]" />
									<div className="h-3 w-32 animate-pulse rounded bg-[#1a1a1a]/[0.04]" />
								</div>
							) : groupedSections && hasAnySections(groupedSections) ? (
								<div className="space-y-5">
									<SectionGroup
										label="Lectures"
										sections={groupedSections.lectures}
									/>
									<SectionGroup label="Labs" sections={groupedSections.labs} />
									<SectionGroup
										label="Tutorials"
										sections={groupedSections.tutorials}
									/>
									<SectionGroup
										label="Other"
										sections={groupedSections.other}
									/>
								</div>
							) : (
								<div className="rounded-xl border border-[#1a1a1a]/[0.1] border-dashed bg-white/40 px-4 py-6 text-center">
									<p className="font-medium text-[#1a1a1a]/55 text-[13px]">
										Not offered in {selectedTermLabel}
									</p>
									<p className="mt-1 text-[#1a1a1a]/35 text-[12px]">
										Try a different term to check other semesters.
									</p>
								</div>
							)}
						</section>
					</div>
				</div>
			</div>
		</div>
	);
}

const COURSE_CODE_PATTERN = /\b([A-Z]{2,4}\s?\d+[A-Z]?)\b/g;

function PrerequisiteList({ text }: { text: string }) {
	const items = splitPrerequisiteItems(text);
	if (items.length === 0) {
		return (
			<p className="text-[#1a1a1a]/50 text-[13px] leading-[1.75]">{text}</p>
		);
	}
	return (
		<div className="space-y-3">
			{items.map((item) => (
				<div
					key={item}
					className="rounded-2xl border border-[#1a1a1a]/[0.05] bg-white/65 px-4 py-3"
				>
					<div className="flex items-start gap-3">
						<span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1a1a1a]/20" />
						<div className="min-w-0 space-y-2">
							{buildIndentedClauses(item).map((clause) => (
								<p
									key={`${clause.level}-${clause.text}`}
									className="text-[#1a1a1a]/55 text-[13px] leading-[1.7]"
									style={{ paddingLeft: `${clause.level * 1.25}rem` }}
								>
									<LinkedCourseText text={clause.text} />
								</p>
							))}
						</div>
					</div>
				</div>
			))}
		</div>
	);
}

function LinkedCourseText({ text }: { text: string }) {
	const segments: ReactNode[] = [];
	let lastIndex = 0;
	for (const match of text.matchAll(COURSE_CODE_PATTERN)) {
		const matched = match[0];
		const start = match.index ?? 0;
		if (start > lastIndex) segments.push(text.slice(lastIndex, start));
		const normalized = matched.replace(/\s+/g, "");
		segments.push(
			<Link
				key={`${normalized}-${start}`}
				to="/courses/$subjectCode"
				params={{ subjectCode: normalized }}
				className="font-medium text-uvic-blue/80 underline decoration-uvic-blue/20 underline-offset-3 transition-colors hover:text-uvic-blue hover:decoration-uvic-blue/40"
			>
				{normalized}
			</Link>,
		);
		lastIndex = start + matched.length;
	}
	if (lastIndex < text.length) segments.push(text.slice(lastIndex));
	return <>{segments.length > 0 ? segments : text}</>;
}

function splitPrerequisiteItems(text: string) {
	return text
		.replace(/\u2022/g, "\n• ")
		.replace(/^\s*•\s*/m, "")
		.replace(/\s{2,}/g, " ")
		.trim()
		.split(/\n+\s*•\s*/)
		.map((item) => item.replace(/\s+/g, " ").trim())
		.filter(Boolean);
}

function buildIndentedClauses(text: string) {
	const clauses = text
		.replace(/\s+•\s+/g, " • ")
		.split(/\s+•\s+/)
		.map((clause) => clause.trim())
		.filter(Boolean);
	const result: Array<{ text: string; level: number }> = [];
	let currentLevel = 0;
	for (const clause of clauses) {
		const normalized = clause.toLowerCase();
		const isGroupHeader =
			normalized.startsWith("complete all of") ||
			normalized.startsWith("complete 1 of") ||
			normalized.startsWith("complete one of");
		result.push({ text: clause, level: currentLevel });
		if (isGroupHeader) currentLevel++;
	}
	return result;
}

function hasAnySections(grouped: GroupedSections) {
	return (
		grouped.lectures.length > 0 ||
		grouped.labs.length > 0 ||
		grouped.tutorials.length > 0 ||
		grouped.other.length > 0
	);
}

function SectionGroup({
	label,
	sections,
}: {
	label: string;
	sections: Section[];
}) {
	if (sections.length === 0) return null;
	return (
		<div>
			<h3 className="mb-2 font-semibold text-[#1a1a1a]/30 text-[10px] tracking-[0.16em] uppercase">
				{label}
			</h3>
			<div className="space-y-2">
				{sections.map((section) => (
					<div
						key={section.crn}
						className="rounded-lg border border-[#1a1a1a]/[0.05] bg-white/70 px-4 py-3"
					>
						<div className="flex items-center justify-between">
							<div className="font-medium text-[#1a1a1a]/70 text-[12px]">
								{section.section} · {section.scheduleType}
							</div>
							<div className="text-[#1a1a1a]/35 text-[11px]">
								CRN {section.crn}
							</div>
						</div>
						<div className="mt-1.5 flex flex-wrap items-center gap-3 text-[#1a1a1a]/35 text-[11px]">
							<span>{formatSectionSchedule(section) || "TBA"}</span>
							<span>
								{section.enrollmentActual}/{section.enrollmentMaximum} enrolled
							</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

const INITIAL_VISIBLE = 4;
const ALTERNATIVE_SKELETON_KEYS = [
	"alternative-skeleton-1",
	"alternative-skeleton-2",
	"alternative-skeleton-3",
	"alternative-skeleton-4",
];

function SimilarAlternativesSection({
	results,
	isLoading,
	mode,
	term,
	onModeChange,
}: {
	results: CourseAlternative[];
	isLoading: boolean;
	mode: AlternativeMode;
	term: string;
	onModeChange: (mode: AlternativeMode) => void;
}) {
	const [expanded, setExpanded] = useState(false);
	const label = getTermLabel(term);

	if (isLoading) {
		return (
			<section className="mb-10 min-h-40">
				<AlternativesHeader mode={mode} onModeChange={onModeChange} />
				<div className="divide-y divide-[#1a1a1a]/[0.05] overflow-hidden rounded-xl border border-[#1a1a1a]/[0.06] bg-white/40">
					{ALTERNATIVE_SKELETON_KEYS.map((key) => (
						<div key={key} className="flex items-center gap-2 px-4 py-2.5">
							<div className="h-3 w-20 animate-pulse rounded bg-[#1a1a1a]/[0.06]" />
							<div className="h-3 w-44 animate-pulse rounded bg-[#1a1a1a]/[0.04]" />
						</div>
					))}
				</div>
			</section>
		);
	}

	if (results.length === 0) return null;
	const hasMore = results.length > INITIAL_VISIBLE;
	const visible = expanded ? results : results.slice(0, INITIAL_VISIBLE);

	return (
		<section className="mb-10">
			<AlternativesHeader mode={mode} onModeChange={onModeChange} />
			<div className="divide-y divide-[#1a1a1a]/[0.05] overflow-hidden rounded-xl border border-[#1a1a1a]/[0.06] bg-white/40">
				{visible.map((result, i) => (
					<AlternativeCourseRow
						key={result.pid}
						result={result}
						index={i}
						termLabel={label}
					/>
				))}
			</div>
			{hasMore && (
				<button
					type="button"
					onClick={() => setExpanded(!expanded)}
					className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 font-medium text-[#1a1a1a]/35 text-[12px] transition-colors hover:bg-[#1a1a1a]/[0.02] hover:text-[#1a1a1a]/55"
				>
					{expanded
						? "Show less"
						: `Show ${results.length - INITIAL_VISIBLE} more`}
					<ChevronDown
						className="h-3.5 w-3.5 transition-transform"
						style={{ transform: expanded ? "rotate(180deg)" : undefined }}
					/>
				</button>
			)}
		</section>
	);
}

function AlternativesHeader({
	mode,
	onModeChange,
}: {
	mode: AlternativeMode;
	onModeChange: (mode: AlternativeMode) => void;
}) {
	return (
		<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
			<div>
				<h2 className="font-semibold text-[#1a1a1a]/30 text-[11px] tracking-[0.12em] uppercase">
					Similar alternatives
				</h2>
				<p className="mt-1 text-[#1a1a1a]/35 text-[12px]">
					Courses that overlap in topic, prerequisites, or learning path.
				</p>
			</div>
			<div className="flex rounded-full bg-[#1a1a1a]/[0.05] p-1">
				{(["best", "offered", "all"] as const).map((option) => (
					<button
						key={option}
						type="button"
						onClick={() => onModeChange(option)}
						className={[
							"rounded-full px-3 py-1 font-medium text-[11px] capitalize transition-colors",
							mode === option
								? "bg-white text-[#1a1a1a]/70 shadow-sm"
								: "text-[#1a1a1a]/35 hover:text-[#1a1a1a]/60",
						].join(" ")}
					>
						{option === "best"
							? "Best matches"
							: option === "offered"
								? "Offered this term"
								: "All catalog"}
					</button>
				))}
			</div>
		</div>
	);
}

function AlternativeCourseRow({
	result,
	index,
	termLabel,
}: {
	result: CourseAlternative;
	index: number;
	termLabel: string;
}) {
	return (
		<div
			className="explore-row group relative flex items-start gap-4 px-4 py-2.5 transition-colors hover:bg-white/70"
			style={{ animationDelay: `${index * 40}ms` }}
		>
			<span className="absolute top-1/2 left-0 h-0 w-[2px] -translate-y-1/2 rounded-full bg-uvic-blue/40 transition-all duration-200 group-hover:h-5" />
			<div className="min-w-0 flex-1">
				<div className="flex items-baseline gap-2">
					<Link
						to="/courses/$subjectCode"
						params={{ subjectCode: result.subjectCode }}
						className="font-semibold text-[#1a1a1a]/80 text-[14px] transition-colors hover:text-[#1a1a1a]"
					>
						{result.subjectCode}
					</Link>
					<span className="truncate text-[#1a1a1a]/40 text-[13px]">
						{result.title}
					</span>
				</div>
				<div className="mt-1.5 flex flex-wrap gap-1.5">
					<span className="rounded-full bg-[#1a1a1a]/[0.05] px-2 py-0.5 font-medium text-[#1a1a1a]/45 text-[10px]">
						{result.offeredInTerm
							? `Offered ${termLabel}`
							: `Not offered ${termLabel}`}
					</span>
					{result.reasons.slice(0, 2).map((reason) => (
						<span
							key={reason}
							className="rounded-full bg-uvic-blue/10 px-2 py-0.5 font-medium text-[10px] text-uvic-blue/75"
						>
							{reason}
						</span>
					))}
				</div>
			</div>
			<Link
				to="/courses/$subjectCode"
				params={{ subjectCode: result.subjectCode }}
				className="flex h-7 shrink-0 items-center gap-1 rounded-full px-2 text-[#1a1a1a]/25 text-[11px] transition-colors group-hover:text-[#1a1a1a]/55"
			>
				Details
				<ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-0.5" />
			</Link>
		</div>
	);
}

function selectDefaultSections(grouped: GroupedSections) {
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

function CourseDetailSkeleton() {
	return (
		<div className="w-full flex-1 overflow-y-auto bg-[#FAFAF8]">
			<div className="mx-auto w-full max-w-5xl px-6 py-16">
				<div className="space-y-3">
					<div className="h-4 w-32 animate-pulse rounded bg-[#1a1a1a]/[0.06]" />
					<div className="h-6 w-64 animate-pulse rounded bg-[#1a1a1a]/[0.08]" />
					<div className="h-3 w-48 animate-pulse rounded bg-[#1a1a1a]/[0.04]" />
				</div>
			</div>
		</div>
	);
}

function CourseNotFound() {
	return (
		<div className="w-full flex-1 overflow-y-auto bg-[#FAFAF8]">
			<div className="mx-auto w-full max-w-5xl px-6 py-16">
				<Link
					to="/explore"
					className="group mb-6 inline-flex items-center gap-1.5 rounded-md text-[#1a1a1a]/35 text-[13px] hover:text-[#1a1a1a]/60"
				>
					<ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
					Back to Explore
				</Link>
				<p className="mt-4 text-[#1a1a1a]/40 text-[14px]">Course not found.</p>
			</div>
		</div>
	);
}

function useFavouriteCourses() {
	const [favourites, setFavourites] = useState<Set<string>>(() => new Set());

	useEffect(() => {
		try {
			const raw = window.localStorage.getItem("courseflow:favourite-courses");
			if (raw) setFavourites(new Set(JSON.parse(raw)));
		} catch {
			setFavourites(new Set());
		}
	}, []);

	function persist(next: Set<string>) {
		setFavourites(next);
		try {
			window.localStorage.setItem(
				"courseflow:favourite-courses",
				JSON.stringify([...next]),
			);
		} catch {
			// Ignore localStorage failures.
		}
	}

	return {
		isFavourite: (pid: string) => favourites.has(pid),
		toggleFavourite: (course: Course) => {
			const next = new Set(favourites);
			if (next.has(course.pid)) next.delete(course.pid);
			else next.add(course.pid);
			persist(next);
		},
	};
}
