import {
	BookOpen,
	Calendar,
	ClipboardList,
	type LucideIcon,
} from "lucide-react";

export type NavTo = "/explore" | "/scheduler" | "/register";

export const NAV_ITEMS: { to: NavTo; label: string; icon: LucideIcon }[] = [
	{ to: "/explore", label: "Explore", icon: BookOpen },
	{ to: "/scheduler", label: "Timetable", icon: Calendar },
	{ to: "/register", label: "Register", icon: ClipboardList },
];
