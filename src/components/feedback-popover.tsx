import { useMutation } from "@tanstack/react-query";
import { Frown, Laugh, type LucideIcon, Meh, Smile } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { submitFeedback } from "@/utils/feedback.functions";
import {
	readCurrentSearch,
	readFeedbackClientMeta,
	useSchedulerSnapshot,
} from "@/utils/feedback-client";
import type { FeedbackMood, FeedbackSubmission } from "@/utils/feedback-types";

const MOODS: { value: FeedbackMood; icon: LucideIcon; label: string }[] = [
	{ value: "sad", icon: Frown, label: "Sad" },
	{ value: "frown", icon: Meh, label: "Frown" },
	{ value: "smile", icon: Smile, label: "Smile" },
	{ value: "love", icon: Laugh, label: "Loved it" },
];

type Props = {
	className?: string;
};

export function FeedbackPopover({ className }: Props) {
	const [open, setOpen] = React.useState(false);
	const [message, setMessage] = React.useState("");
	const [mood, setMood] = React.useState<FeedbackMood | undefined>();

	const trimmed = message.trim();
	const { serialized: schedulerSnapshot } = useSchedulerSnapshot();

	const submitFeedbackMutation = useMutation({
		mutationFn: (data: FeedbackSubmission) => submitFeedback({ data }),
		onSuccess: () => {
			toast.success("Thanks for the feedback");
			setOpen(false);
			setMessage("");
			setMood(undefined);
		},
		onError: (err) => {
			const message =
				err instanceof Error
					? err.message
					: typeof err === "string"
						? err
						: "Network error — please try again.";
			toast.error(message);
		},
	});

	const canSend = trimmed.length > 0 && !submitFeedbackMutation.isPending;

	function handleSubmit() {
		if (!canSend) return;
		const page =
			typeof window !== "undefined" ? window.location.pathname : "(unknown)";
		submitFeedbackMutation.mutate({
			message: trimmed,
			mood,
			page,
			search: readCurrentSearch(),
			scheduler: schedulerSnapshot ?? undefined,
			client: readFeedbackClientMeta(),
		});
	}

	function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
		if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
			e.preventDefault();
			void handleSubmit();
		}
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className={cn(
						"h-9 border-foreground/10 bg-background/80 px-4 font-normal text-foreground text-sm shadow-none hover:border-foreground/20 hover:bg-background/80",
						className,
					)}
				>
					Feedback
				</Button>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				sideOffset={8}
				className="w-[340px] overflow-hidden p-0"
			>
				<div className="p-3">
					<Textarea
						autoFocus
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Your feedback…"
						className="min-h-[120px] resize-none border-0 px-0 py-0 text-sm shadow-none focus-visible:ring-0"
					/>
					<div className="mt-1 flex justify-end">
						<span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
							<span className="inline-block rounded border border-border/60 px-1 font-mono text-[10px] leading-none">
								M↓
							</span>
							supported.
						</span>
					</div>
				</div>
				<div className="flex items-center justify-between gap-2 border-t border-border/60 bg-muted/30 px-3 py-2">
					<div className="flex items-center gap-1">
						{MOODS.map((opt) => {
							const Icon = opt.icon;
							const active = mood === opt.value;
							return (
								<button
									key={opt.value}
									type="button"
									aria-label={opt.label}
									aria-pressed={active}
									onClick={() =>
										setMood((cur) =>
											cur === opt.value ? undefined : opt.value,
										)
									}
									className={cn(
										"flex h-8 w-8 items-center justify-center rounded-full transition-all",
										active
											? "bg-foreground/10 text-foreground ring-1 ring-foreground/20"
											: "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
									)}
								>
									<Icon className="size-4" />
								</button>
							);
						})}
					</div>
					<Button size="sm" onClick={handleSubmit} disabled={!canSend}>
						{submitFeedbackMutation.isPending ? "Sending…" : "Send"}
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
