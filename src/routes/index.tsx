import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
	component: Landing,
});

function Landing() {
	return (
		<div className="landing-page relative flex w-full flex-1 flex-col overflow-hidden bg-background min-h-[calc(100dvh-var(--app-header-height))]">
			<div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
				{/* Decorative line */}
				<div className="mb-8 h-px w-12 bg-foreground/15" />

				{/* Tagline */}
				<p className="mb-6 font-medium text-foreground/40 text-[11px] tracking-[0.3em] uppercase">
					University of Victoria
				</p>

				{/* Hero headline */}
				<h1 className="text-center leading-[1]">
					<span className="block font-light text-foreground text-[clamp(2.5rem,7vw,5.5rem)] tracking-[-0.035em]">
						Plan Your
					</span>
					<span className="relative block font-semibold text-foreground text-[clamp(2.7rem,7.5vw,6rem)] tracking-[-0.03em]">
						Course Flow
						<svg
							aria-hidden="true"
							className="landing-underline absolute -bottom-1 left-[10%] w-[80%]"
							viewBox="0 0 200 8"
							fill="none"
							preserveAspectRatio="none"
						>
							<path
								d="M1 5.5C40 2, 80 2, 100 4.5S160 7, 199 3"
								stroke="var(--uvic-blue)"
								strokeWidth="1.5"
								strokeLinecap="round"
							/>
						</svg>
					</span>
				</h1>

				{/* Subtitle */}
				<p className="mt-8 max-w-lg text-balance text-center text-foreground/45 text-[15px] leading-relaxed">
					Search courses, build your timetable, and design the perfect semester
					— all in one place.
				</p>

				{/* CTAs */}
				<div className="mt-10 flex items-center gap-5">
					<Link
						to="/explore"
						className="group flex min-h-11 items-center gap-2.5 rounded-full bg-primary px-7 py-3 font-medium text-[13px] text-primary-foreground tracking-wide uppercase shadow-[0_14px_40px_rgba(0,84,147,0.16)] hover:-translate-y-0.5 hover:bg-uvic-dark-blue"
					>
						Explore Courses
						<ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
					</Link>
					<Link
						to="/scheduler"
						className="inline-flex min-h-11 items-center font-medium text-foreground/50 text-[13px] tracking-wide uppercase hover:text-uvic-blue"
					>
						Build Timetable
					</Link>
				</div>
			</div>

			{/* Footer accent */}
			<footer className="relative z-10 flex items-center justify-center px-8 pb-8">
				<p className="text-foreground/25 text-[11px] tracking-wide uppercase">
					Built for UVic students
				</p>
			</footer>
		</div>
	);
}
