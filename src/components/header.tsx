import { Link } from "@tanstack/react-router";
import {
	BookOpen,
	Calendar,
	ClipboardList,
	type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Header() {
	return (
		<header className="header-bar sticky top-0 z-50 flex h-14 items-center px-4 md:px-5">
			<div className="pointer-events-none absolute inset-0 border-b border-border/60 bg-background/80 backdrop-blur-xl" />

			<Link
				to="/"
				className="relative z-10 rounded-md font-semibold text-[15px] tracking-tight text-foreground hover:opacity-70"
			>
				Course<span className="text-uvic-blue">Flow</span>
			</Link>

			<nav
				aria-label="Primary"
				className="relative z-10 ml-3 flex h-full items-stretch md:ml-6"
			>
				<NavLink to="/explore" label="Explore" icon={BookOpen} />
				<NavLink to="/scheduler" label="Timetable" icon={Calendar} />
				<NavLink to="/register" label="Register" icon={ClipboardList} />
			</nav>
		</header>
	);
}

function NavLink({
	to,
	label,
	icon: Icon,
}: {
	to: "/explore" | "/scheduler" | "/register";
	label: string;
	icon: LucideIcon;
}) {
	return (
		<Link
			to={to}
			aria-label={label}
			activeOptions={{ exact: to !== "/explore" }}
			activeProps={{ className: "text-foreground" }}
			inactiveProps={{
				className: "text-muted-foreground hover:text-foreground/80",
			}}
			className="group relative flex items-center gap-1.5 px-2.5 font-medium text-[13px] transition-colors duration-200 md:px-3.5"
		>
			{({ isActive }) => (
				<>
					<Icon
						aria-hidden="true"
						className={cn(
							"h-3.5 w-3.5 transition-colors",
							isActive && "text-uvic-blue",
						)}
					/>
					<span className="max-md:hidden">{label}</span>
					<span
						aria-hidden="true"
						className={cn(
							"pointer-events-none absolute inset-x-2 -bottom-px h-[2px] rounded-full transition-all duration-200 md:inset-x-3",
							isActive
								? "bg-uvic-blue opacity-100"
								: "bg-foreground/30 opacity-0 group-hover:opacity-100",
						)}
					/>
				</>
			)}
		</Link>
	);
}
