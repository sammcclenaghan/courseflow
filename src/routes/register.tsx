import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/register")({
	component: RegisterPlaceholder,
});

function RegisterPlaceholder() {
	return (
		<section className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
			<p className="font-medium text-[11px] text-muted-foreground tracking-[0.3em] uppercase">
				Register
			</p>
			<h1 className="mt-4 font-semibold text-3xl tracking-tight">
				CRN checklist
			</h1>
			<p className="mt-4 max-w-md text-sm text-muted-foreground leading-relaxed">
				The CRN copy view will land here next.
			</p>
		</section>
	);
}
