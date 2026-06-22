import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
	return (
		<section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
			<p className="font-medium text-[11px] text-muted-foreground tracking-[0.3em] uppercase">
				University of Victoria
			</p>
			<h1 className="mt-6 max-w-3xl font-semibold text-4xl text-foreground leading-[1.05] tracking-[-0.03em] sm:text-6xl">
				Plan your <span className="text-uvic-blue">CourseFlow</span>.
			</h1>
			<p className="mt-6 max-w-xl text-balance text-[15px] text-muted-foreground leading-relaxed">
				Search UVic courses, build a conflict-free timetable, and copy your CRNs
				into UVic's registration system.
			</p>
			<div className="mt-10 flex items-center gap-5">
				<Link
					to="/explore"
					className="inline-flex min-h-11 items-center rounded-full bg-uvic-blue px-7 py-3 font-medium text-[13px] text-primary-foreground tracking-wide uppercase shadow-[0_14px_40px_rgba(0,84,147,0.16)] transition-transform hover:-translate-y-0.5 hover:bg-uvic-dark-blue"
				>
					Explore courses
				</Link>
				<Link
					to="/scheduler"
					className="inline-flex min-h-11 items-center font-medium text-[13px] text-muted-foreground tracking-wide uppercase hover:text-uvic-blue"
				>
					Build timetable
				</Link>
			</div>
		</section>
	);
}
