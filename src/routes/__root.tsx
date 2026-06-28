import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	Scripts,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Header } from "@/components/header";
import { Toaster } from "@/components/ui/sonner";
import type { RouterContext } from "@/router-context";
import appCss from "@/styles.css?url";
import "sonner/dist/styles.css";

export const Route = createRootRouteWithContext<RouterContext>()({
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
		links: [{ rel: "stylesheet", href: appCss }],
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

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="en">
			<head>
				<HeadContent />
			</head>
			<body className="flex min-h-dvh flex-col bg-background font-sans text-foreground antialiased">
				<Header />
				<main className="flex flex-1 flex-col">{children}</main>
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
