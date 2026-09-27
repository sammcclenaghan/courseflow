import { Link } from "@tanstack/react-router";
import { Fragment, type ReactNode } from "react";
import type { Requirement, Requisites } from "@/catalog/model";

const HEADING =
	"mb-2 font-semibold text-[#1a1a1a]/30 text-[11px] tracking-[0.12em] uppercase";
const TEXT = "text-[#1a1a1a]/55 text-[13px] leading-[1.7]";
const LINK =
	"font-medium text-uvic-blue/80 underline decoration-uvic-blue/20 underline-offset-3 transition-colors hover:text-uvic-blue hover:decoration-uvic-blue/40";

export function CourseRequisites({ requisites }: { requisites: Requisites }) {
	const trees = [
		["Prerequisites", requisites.prerequisites],
		["Pre- or corequisites", requisites.preOrCorequisites],
		["Corequisites", requisites.corequisites],
	] as const;
	return (
		<>
			{trees.map(
				([label, tree]) =>
					tree && (
						<section key={label}>
							<h2 className={HEADING}>{label}</h2>
							{/* A top-level "all of" reads better as separate cards. */}
							<div className="space-y-3">
								{(tree.type === "all" ? tree.items : [tree]).map((item) => (
									<div
										key={JSON.stringify(item)}
										className="rounded-2xl border border-[#1a1a1a]/[0.05] bg-white/65 px-4 py-3"
									>
										<RequirementView requirement={item} />
									</div>
								))}
							</div>
						</section>
					),
			)}
			{requisites.recommendations.length > 0 && (
				<section>
					<h2 className={HEADING}>Recommended</h2>
					{requisites.recommendations.map((text) => (
						<p key={text} className={TEXT}>
							<LinkedCourseText text={text} />
						</p>
					))}
				</section>
			)}
		</>
	);
}

function RequirementView({ requirement }: { requirement: Requirement }) {
	if (requirement.type === "text") {
		return (
			<p className={TEXT}>
				<LinkedCourseText text={requirement.text} />
			</p>
		);
	}
	if (requirement.type === "courses") {
		return (
			<p className={TEXT}>
				<CourseList requirement={requirement} />
			</p>
		);
	}
	return (
		<div className="space-y-1.5">
			<p className={TEXT}>
				{requirement.type === "all" ? "All of:" : `${requirement.count} of:`}
			</p>
			<ul className="space-y-1.5 border-[#1a1a1a]/[0.08] border-l pl-4">
				{requirement.items.map((item) => (
					<li key={JSON.stringify(item)}>
						<RequirementView requirement={item} />
					</li>
				))}
			</ul>
		</div>
	);
}

// e.g. "1 of MATH100, MATH102, with a minimum grade of B"
function CourseList({
	requirement,
}: {
	requirement: Extract<Requirement, { type: "courses" }>;
}) {
	const { need, courses, minGrade, minGpa, timing } = requirement;
	const lead =
		typeof need === "object"
			? `${need.units} units from `
			: need === "all"
				? courses.length > 1
					? "All of "
					: ""
				: `${need} of `;
	const conditions = [
		minGrade && `with a minimum grade of ${minGrade}`,
		minGpa !== null && `with a minimum GPA of ${minGpa}`,
		timing === "either" && "completed or taken at the same time",
		timing === "concurrent" && "taken at the same time",
	].filter(Boolean);
	return (
		<>
			{lead}
			{courses.map((code, index) => (
				<Fragment key={code}>
					{index > 0 && ", "}
					<CourseLink code={code} />
				</Fragment>
			))}
			{conditions.length > 0 && `, ${conditions.join(", ")}`}
		</>
	);
}

function CourseLink({ code }: { code: string }) {
	return (
		<Link
			to="/courses/$subjectCode"
			params={{ subjectCode: code }}
			preload="intent"
			className={LINK}
		>
			{code}
		</Link>
	);
}

const COURSE_CODE_PATTERN = /\b([A-Z]{2,4}\s?\d+[A-Z]?)\b/g;

// Free text mentions courses as "ECON 203"; link those too.
function LinkedCourseText({ text }: { text: string }) {
	const segments: ReactNode[] = [];
	let lastIndex = 0;
	for (const match of text.matchAll(COURSE_CODE_PATTERN)) {
		const start = match.index ?? 0;
		if (start > lastIndex) segments.push(text.slice(lastIndex, start));
		const code = match[0].replace(/\s+/g, "");
		segments.push(<CourseLink key={`${code}-${start}`} code={code} />);
		lastIndex = start + match[0].length;
	}
	if (lastIndex < text.length) segments.push(text.slice(lastIndex));
	return <>{segments}</>;
}
