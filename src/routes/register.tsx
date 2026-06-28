import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
	AlertCircle,
	CheckCircle2,
	Coffee,
	Copy,
	ExternalLink,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { scheduleQueries } from "@/queries/scheduler";
import { getTermLabel } from "@/utils/constants";
import { expandSavedSchedule } from "@/utils/scheduler-domain";
import type { SavedCourse } from "@/utils/scheduler-types";
import { formatSectionSchedule } from "@/utils/section-to-events";
import type { Section } from "@/utils/sections-types";

const UVIC_REGISTRATION_URL =
	"https://banner.uvic.ca/StudentRegistrationSsb/ssb/registration";
const UVIC_REGISTRATION_GUIDE_URL =
	"https://www.uvic.ca/students/academics/register-for-courses/";

export const Route = createFileRoute("/register")({
	loaderDeps: ({ search: { term } }) => ({ term }),
	loader: ({ context: { queryClient }, deps: { term } }) =>
		queryClient.ensureQueryData(scheduleQueries.mine(term)),
	component: RegistrationPage,
});

function RegistrationPage() {
	const { term } = Route.useSearch();
	const scheduleQuery = useQuery(scheduleQueries.mine(term));
	const selectedCourses = useMemo(
		() => expandSavedSchedule(term, scheduleQuery.data),
		[term, scheduleQuery.data],
	);
	const termLabel = getTermLabel(term);

	const [registered, setRegistered] = useState<Set<string>>(new Set());
	const [recentlyCopied, setRecentlyCopied] = useState<string | null>(null);

	const toggleRegistered = (crn: string) =>
		setRegistered((prev) => {
			const next = new Set(prev);
			if (next.has(crn)) next.delete(crn);
			else next.add(crn);
			return next;
		});

	const copyCrn = async (crn: string) => {
		try {
			await writeClipboardText(crn);
			setRecentlyCopied(crn);
			window.setTimeout(() => {
				setRecentlyCopied((c) => (c === crn ? null : c));
			}, 1200);
		} catch (error) {
			console.error("Couldn't copy CRN", error);
		}
	};

	return (
		<div className="w-full flex-1 overflow-y-auto bg-[#FAFAF8]">
			<div className="app-bottom-pad mx-auto w-full max-w-3xl px-6 pt-10">
				{/* Title row */}
				<div className="flex items-start justify-between gap-4 border-border/60 border-b pb-5">
					<h1 className="font-bold text-2xl text-foreground tracking-tight md:text-3xl">
						Registration for {termLabel}
					</h1>
					<Button asChild size="sm" className="shrink-0">
						<a href={UVIC_REGISTRATION_URL} target="_blank" rel="noreferrer">
							UVic Registration Page
							<ExternalLink className="size-3.5" />
						</a>
					</Button>
				</div>

				{/* Intro + steps */}
				<p className="mt-6 text-[14px] text-foreground/75 leading-6">
					UVic offers a quick and easy way to register for a course using the
					Course Reference Number (CRN). Follow the given steps below to
					register in your chosen course sections:
				</p>

				<ol className="mt-4 list-decimal space-y-1.5 pl-6 text-[14px] text-foreground/75 leading-6 marker:text-foreground/45">
					<li>
						Click the{" "}
						<strong className="font-semibold text-foreground">
							UVic Registration Page
						</strong>{" "}
						button.
					</li>
					<li>
						Select the{" "}
						<strong className="font-semibold text-foreground">
							Manage Registration
						</strong>{" "}
						page.
					</li>
					<li>Sign in to UVic with your NetLink ID.</li>
					<li>
						Select the appropriate term and hit{" "}
						<strong className="font-semibold text-foreground">Continue</strong>.
					</li>
					<li>
						Select the{" "}
						<strong className="font-semibold text-foreground">
							Enter CRNs
						</strong>{" "}
						tab.
					</li>
					<li>
						<strong className="font-semibold text-foreground">Copy</strong>{" "}
						<Copy className="-translate-y-0.5 inline-block size-3.5 text-foreground/55" />{" "}
						each CRN below and paste it into an input field, pressing{" "}
						<strong className="font-semibold text-foreground">
							Add Another CRN
						</strong>{" "}
						to add the next one.
					</li>
					<li>
						Hit{" "}
						<strong className="font-semibold text-foreground">
							Add to Summary
						</strong>{" "}
						and then press the{" "}
						<strong className="font-semibold text-foreground">Submit</strong>{" "}
						button on the bottom right of the page, and you're registered!
					</li>
				</ol>

				<p className="mt-4 text-[14px] text-foreground/75 leading-6">
					For more information, visit UVic's guide on{" "}
					<a
						href={UVIC_REGISTRATION_GUIDE_URL}
						target="_blank"
						rel="noreferrer"
						className="text-uvic-blue underline-offset-4 hover:underline"
					>
						Course registration
					</a>
					.
				</p>

				{/* Amber prereq warning */}
				<aside className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-950">
					<div className="flex items-start gap-2">
						<AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" />
						<p className="text-[13px] leading-5">
							Make sure to review all course prerequisites in the UVic Calendar
							before registering.
						</p>
					</div>
				</aside>

				{/* Course list with per-section copy */}
				<div className="mt-6 border-border/60 border-t pt-6">
					{selectedCourses.length === 0 ? (
						<div className="rounded-lg border border-border border-dashed bg-white/40 px-4 py-10 text-center">
							<p className="font-medium text-sm">
								Unable to find saved courses from your timetable for {termLabel}
							</p>
							<Button asChild size="sm" className="mt-4">
								<Link to="/scheduler" search={{ term }} preload="intent">
									{termLabel} Timetable
								</Link>
							</Button>
						</div>
					) : (
						<ul className="space-y-3">
							{selectedCourses.map((sc) => (
								<CourseCard
									key={sc.course.pid}
									course={sc}
									registered={registered}
									recentlyCopied={recentlyCopied}
									onCopy={copyCrn}
									onToggle={toggleRegistered}
								/>
							))}
						</ul>
					)}
				</div>

				{/* Tip jar — only shown to users who actually have a schedule, i.e.
            who got value from the tool. */}
				{selectedCourses.length > 0 && (
					<footer className="mt-12 border-border/60 border-t pt-8 text-center">
						<p className="mx-auto max-w-md text-[13px] text-foreground/65 leading-6">
							CourseFlow is free and always will be. If it made registration
							less painful, consider buying me a coffee.
						</p>
						<a
							href="https://buymeacoffee.com/sammcclenaghan"
							target="_blank"
							rel="noreferrer noopener"
							className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#FFDD00] px-5 py-2.5 font-semibold text-[#0D0C22] text-sm shadow-sm transition-all hover:bg-[#FFD500] hover:shadow-md active:scale-[0.98]"
						>
							<Coffee className="size-4" />
							Buy me a coffee
						</a>
					</footer>
				)}
			</div>
		</div>
	);
}

function CourseCard({
	course,
	registered,
	recentlyCopied,
	onCopy,
	onToggle,
}: {
	course: SavedCourse;
	registered: Set<string>;
	recentlyCopied: string | null;
	onCopy: (crn: string) => void;
	onToggle: (crn: string) => void;
}) {
	const hasSections = course.sections.length > 0;

	return (
		<li className="overflow-hidden rounded-lg border border-border/60 bg-white/55">
			<div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 border-border/40 border-b bg-foreground/[0.015] px-4 py-2.5">
				<span className="font-bold text-[15px] text-foreground tracking-tight">
					{course.course.subjectCode}
				</span>
				<span className="min-w-0 truncate text-[13px] text-foreground/50">
					{course.course.title}
				</span>
			</div>

			{hasSections ? (
				<ul>
					{course.sections.map((section) => (
						<SectionRow
							key={section.crn}
							section={section}
							isRegistered={registered.has(section.crn)}
							wasCopied={recentlyCopied === section.crn}
							onCopy={onCopy}
							onToggle={onToggle}
						/>
					))}
				</ul>
			) : (
				<p className="px-4 py-3 text-[13px] text-foreground/55">
					No sections selected for this course.
				</p>
			)}
		</li>
	);
}

function SectionRow({
	section,
	isRegistered,
	wasCopied,
	onCopy,
	onToggle,
}: {
	section: Section;
	isRegistered: boolean;
	wasCopied: boolean;
	onCopy: (crn: string) => void;
	onToggle: (crn: string) => void;
}) {
	const scheduleLine = formatSectionSchedule(section);

	return (
		<li
			className={cn(
				"flex items-center gap-3 border-border/40 border-b px-4 py-2.5 text-[13px] transition-colors last:border-b-0",
				isRegistered && "text-foreground/40",
			)}
		>
			<input
				type="checkbox"
				checked={isRegistered}
				onChange={() => onToggle(section.crn)}
				aria-label={`Mark CRN ${section.crn} as registered`}
				className="size-4 shrink-0 cursor-pointer accent-uvic-blue"
			/>

			<div className="flex min-w-0 flex-1 items-baseline gap-2">
				<span
					className={cn(
						"font-semibold text-foreground",
						isRegistered && "text-foreground/40 line-through",
					)}
				>
					{section.section}
				</span>
				<span className="truncate text-[12px] text-foreground/45">
					{section.scheduleType}
					{scheduleLine && ` · ${scheduleLine}`}
				</span>
			</div>

			<button
				type="button"
				disabled={isRegistered}
				onClick={() => onCopy(section.crn)}
				title={isRegistered ? undefined : `Copy CRN ${section.crn}`}
				className={cn(
					"inline-flex items-center gap-1.5 font-mono font-semibold text-foreground tabular-nums transition-colors",
					isRegistered
						? "cursor-default text-foreground/40"
						: "hover:text-uvic-blue",
					wasCopied && "text-uvic-blue",
				)}
			>
				{section.crn}
				{isRegistered ? (
					<CheckCircle2 className="size-3.5 text-emerald-600/70" />
				) : wasCopied ? (
					<CheckCircle2 className="size-3.5 text-uvic-blue" />
				) : (
					<Copy className="size-3.5 text-foreground/40" />
				)}
			</button>
		</li>
	);
}

async function writeClipboardText(text: string) {
	if (navigator.clipboard?.writeText) {
		await navigator.clipboard.writeText(text);
		return;
	}

	const textarea = document.createElement("textarea");
	textarea.value = text;
	textarea.style.position = "fixed";
	textarea.style.opacity = "0";
	document.body.appendChild(textarea);
	textarea.select();

	try {
		const ok = document.execCommand("copy");
		if (!ok) throw new Error("Copy command failed");
	} finally {
		document.body.removeChild(textarea);
	}
}
