import { useTerm } from "@/lib/use-term";
import { cn } from "@/lib/utils";
import { TERMS } from "@/utils/constants";

export function TermSelector({ className }: { className?: string }) {
	const { selectedTerm, setSelectedTerm } = useTerm();

	return (
		<select
			aria-label="Select term"
			value={selectedTerm}
			onChange={(event) => setSelectedTerm(event.target.value)}
			className={cn(
				"h-9 rounded-lg border border-border bg-background/80 px-2.5 text-xs font-medium text-foreground outline-none backdrop-blur-sm transition-colors hover:border-foreground/20 focus-visible:border-uvic-blue md:w-[150px] md:text-sm md:font-normal",
				className,
			)}
		>
			{TERMS.map((term) => (
				<option key={term.value} value={term.value}>
					{term.label}
				</option>
			))}
		</select>
	);
}
