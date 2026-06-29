import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	retainSearchParams,
	Scripts,
	stripSearchParams,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { z } from "zod";
import { Header } from "@/components/header";
import { LegacyScheduleMigration } from "@/components/legacy-schedule-migration";
import { MobileTabBar } from "@/components/mobile-tab-bar";
import { Toaster } from "@/components/ui/sonner";
import { usePersistedTermBootstrap } from "@/lib/use-term";
import type { RouterContext } from "@/router-context";
import appCss from "@/styles.css?url";
import { DEFAULT_TERM, normalizeTerm } from "@/utils/constants";
import "sonner/dist/styles.css";

const rootSearchSchema = z.object({
	term: z
		.string()
		.default(DEFAULT_TERM)
		.catch(DEFAULT_TERM)
		.transform((term) => normalizeTerm(term)),
});

export const Route = createRootRouteWithContext<RouterContext>()({
	validateSearch: rootSearchSchema,
	search: {
		middlewares: [
			retainSearchParams(["term"]),
			stripSearchParams({ term: DEFAULT_TERM }),
		],
	},
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{ name: "viewport", content: "width=device-width, initial-scale=1" },
			{ title: "CourseFlow — UVic class scheduler" },
			{
				name: "description",
				content:
					"Search the University of Victoria course catalog, build a conflict-free timetable, and copy your CRNs into UVic's registration system.",
			},
		],
		links: [
			{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
			{ rel: "stylesheet", href: appCss },
		],
	}),
	component: RootComponent,
	notFoundComponent: NotFound,
});

function RootComponent() {
	return (
		<RootDocument>
			<Outlet />
		</RootDocument>
	);
}

function GlobalTermBootstrap() {
	usePersistedTermBootstrap();
	return null;
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="flex min-h-dvh flex-col bg-background font-sans text-foreground antialiased">
				<GlobalTermBootstrap />
				<LegacyScheduleMigration />
				<Header />
				<main className="flex flex-1 flex-col">{children}</main>
				<MobileTabBar />
				<Toaster />
				<Scripts />
			</body>
		</html>
	);
}

function NotFound() {
	return (
		<section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
			<p className="font-medium text-[11px] text-muted-foreground tracking-[0.3em] uppercase">
				404
			</p>
			<h1 className="mt-4 font-semibold text-3xl tracking-tight">
				Page not found
			</h1>
			<p className="mt-4 max-w-md text-sm text-muted-foreground leading-relaxed">
				The page you were looking for doesn't exist.
			</p>
		</section>
	);
}
