import { createFileRoute, Link } from "@tanstack/react-router";
import { useCourseAutocomplete } from "@/catalog/use-course-autocomplete";
import { useCourseOfferings } from "@/catalog/use-course-offerings";
import { CatalogWall } from "@/components/landing/catalog-wall";
import { getTermLabel } from "@/utils/constants";

export const Route = createFileRoute("/")({
	/*
		Both payloads are fetched from a client effect, so without this they queue
		up behind hydration — the wall printed on grey and only lit up a beat
		later. Preloading puts them on the wire alongside the bundle instead. The
		offerings file is the one that lights the wall and is small (~30kB), so it
		goes at the default high priority; the much larger autocomplete payload
		only swaps skeleton codes for real ones, and is asked for politely so it
		does not crowd out the JS.

		crossorigin is load-bearing even though these are same-origin: an
		as="fetch" preload without it has a credentials mode that no plain
		fetch() can match, so the browser downloads both files twice and the
		preload buys nothing. Chrome says so in the console when you get it
		wrong.
	*/
	head: () => ({
		links: [
			{
				rel: "preload",
				as: "fetch",
				crossOrigin: "anonymous",
				href: "/generated/course-offerings.json",
			},
			{
				rel: "preload",
				as: "fetch",
				crossOrigin: "anonymous",
				fetchPriority: "low",
				href: "/generated/course-autocomplete.json",
			},
		],
	}),
	component: Landing,
});

function Landing() {
	const { term } = Route.useSearch();

	// Both payloads are static assets, fetched after first paint, and are the
	// same ones Explore and the scheduler need — so the landing page warms
	// them up rather than paying for them twice.
	const { courses } = useCourseAutocomplete(true);
	const { offeredPids } = useCourseOfferings(term, true);

	return (
		<div className="app-fill-height relative isolate w-full overflow-hidden bg-background">
			<div className="absolute inset-0">
				<CatalogWall
					courses={courses}
					offeredPids={offeredPids}
					label={`Every course in the UVic catalog, one mark each, with the ones running in ${getTermLabel(term)} lit up.`}
				/>
				<div
					aria-hidden="true"
					className="wall-scrim pointer-events-none absolute inset-0"
				/>
			</div>

			<div className="pointer-events-none relative z-10 flex h-full items-start px-6 pt-7 sm:px-10 sm:pt-10 lg:w-[54%] lg:items-center lg:pt-0">
				<div className="max-w-lg [animation:landing-fade-up_0.7s_var(--ease-polish)_both]">
					<h1 className="font-semibold text-[clamp(2.15rem,5.6vw,4.5rem)] text-foreground leading-[1.03] tracking-[-0.03em]">
						Plan your
						<br />
						UVic timetable
					</h1>
					<p className="mt-4 max-w-[20rem] text-[15px] text-foreground/60 leading-relaxed sm:mt-6 sm:max-w-md sm:text-[17px]">
						Every course UVic offers is on this screen. Pick your sections,
						watch the seat counts, then copy your CRNs straight into Banner.
					</p>
					<div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-1 sm:mt-9">
						<Link
							to="/scheduler"
							preload="intent"
							className="pointer-events-auto inline-flex min-h-12 items-center rounded-lg bg-primary px-6 font-medium text-[15px] text-primary-foreground shadow-sm hover:bg-uvic-dark-blue active:scale-[0.98] sm:min-h-13 sm:px-7 sm:text-[16px]"
						>
							Build your timetable
						</Link>
						<Link
							to="/explore"
							preload="intent"
							className="pointer-events-auto inline-flex min-h-12 items-center px-1 text-[15px] text-foreground/55 underline decoration-foreground/25 underline-offset-4 hover:text-uvic-blue hover:decoration-uvic-blue/50 sm:min-h-13 sm:text-[16px]"
						>
							Browse courses
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
