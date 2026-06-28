import { Link, useLocation } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { NAV_ITEMS, type NavTo } from "@/components/nav-items";

/**
 * Floating switcher for the three student surfaces (Explore · Timetable ·
 * Register).
 *
 * A self-contained frosted pill that hovers above the content rather than
 * sitting flush to the device edge, so it stays clearly visible without
 * scrolling. Single-tap switching; an accent "thumb" slides between segments
 * to show — and animate — the move between modes. Mobile only; tablets and
 * desktop keep the inline header nav.
 *
 * Layout: the floating pill overlays content, so scrollable pages reserve space
 * with `.app-bottom-pad` (and full-height grids use `.app-fill-height`) when
 * on mobile — see src/styles.css.
 */
export function MobileTabBar() {
	const pathname = useLocation({ select: (location) => location.pathname });
	const activeIndex = NAV_ITEMS.findIndex((item) =>
		pathname.startsWith(item.to),
	);

	return (
		<nav
			aria-label="Primary"
			className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+1rem))] md:hidden"
		>
			<div className="pointer-events-auto relative flex items-stretch rounded-full border border-border/60 bg-background/80 p-1 shadow-[0_10px_30px_-8px_rgba(26,26,26,0.25)] backdrop-blur-xl">
				{/* Sliding active highlight */}
				<span
					aria-hidden="true"
					style={{ transform: `translateX(${activeIndex * 100}%)` }}
					className="absolute top-1 left-1 h-11 w-14 rounded-full bg-uvic-blue/10 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none data-[hidden=true]:opacity-0"
					data-hidden={activeIndex < 0}
				/>
				{NAV_ITEMS.map((item) => (
					<TabLink key={item.to} {...item} />
				))}
			</div>
		</nav>
	);
}

function TabLink({
	to,
	label,
	icon: Icon,
}: {
	to: NavTo;
	label: string;
	icon: LucideIcon;
}) {
	return (
		<Link
			to={to}
			aria-label={label}
			preload="intent"
			activeOptions={{ exact: to !== "/explore", includeSearch: false }}
			activeProps={{ className: "text-uvic-blue" }}
			inactiveProps={{
				className: "text-foreground/55 active:text-foreground/80",
			}}
			className="relative z-10 flex h-11 w-14 select-none items-center justify-center transition-colors duration-200"
		>
			<Icon
				aria-hidden="true"
				strokeWidth={1.75}
				className="size-5 transition-transform active:scale-90"
			/>
		</Link>
	);
}
