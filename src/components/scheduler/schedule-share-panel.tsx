import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Link2, RefreshCw, Share2, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	scheduleShareQueries,
	scheduleShareQueryKey,
} from "@/utils/schedule-queries";
import {
	createMyScheduleShare,
	regenerateMyScheduleShare,
	revokeMyScheduleShare,
} from "@/utils/schedules";

export function ScheduleSharePanel({
	term,
	disabled,
}: {
	term: string;
	disabled: boolean;
}) {
	const queryClient = useQueryClient();
	const [isOpen, setIsOpen] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const shareQuery = useQuery({
		...scheduleShareQueries.mine(term),
		enabled: isOpen,
	});
	const share = shareQuery.data ?? null;

	const shareUrl = useMemo(() => {
		if (!share || typeof window === "undefined") return "";
		return `${window.location.origin}/share/${share.shareId}`;
	}, [share]);

	async function run(action: () => Promise<void>) {
		setIsLoading(true);
		setMessage(null);
		try {
			await action();
		} catch (error) {
			console.error("Schedule sharing action failed", error);
			setMessage("Sharing update failed. Please try again.");
		} finally {
			setIsLoading(false);
		}
	}

	const createShare = () =>
		run(async () => {
			const next = await createMyScheduleShare({ data: { term } });
			queryClient.setQueryData(scheduleShareQueryKey(term), next);
			setMessage("Share link created.");
		});

	const regenerateShare = () =>
		run(async () => {
			const next = await regenerateMyScheduleShare({ data: { term } });
			queryClient.setQueryData(scheduleShareQueryKey(term), next);
			setMessage("Share link regenerated. The old link no longer works.");
		});

	const revokeShare = () =>
		run(async () => {
			await revokeMyScheduleShare({ data: { term } });
			queryClient.setQueryData(scheduleShareQueryKey(term), null);
			setMessage("Sharing turned off.");
		});

	const copyLink = () =>
		run(async () => {
			if (!shareUrl) return;
			await navigator.clipboard.writeText(shareUrl);
			setMessage("Share link copied.");
		});

	return (
		<div className="relative">
			<Button
				type="button"
				variant="outline"
				size="sm"
				disabled={disabled}
				onClick={() => setIsOpen((value) => !value)}
			>
				<Share2 className="size-4" />
				Share
			</Button>

			{isOpen && (
				<div className="absolute top-full right-0 z-20 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-border bg-background p-4 shadow-xl">
					<div className="flex items-start gap-3">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-uvic-blue/10 text-uvic-blue">
							<Link2 className="size-4" />
						</div>
						<div>
							<h3 className="font-semibold text-sm">Live share link</h3>
							<p className="mt-1 text-muted-foreground text-xs leading-relaxed">
								Anyone with this link can view your current timetable. They can
								copy it into their own anonymous schedule, but edits stay
								separate.
							</p>
						</div>
					</div>

					{share ? (
						<div className="mt-4 space-y-3">
							<Input
								readOnly
								value={shareUrl}
								onFocus={(e) => e.target.select()}
							/>
							<div className="flex flex-wrap gap-2">
								<Button size="sm" onClick={copyLink} disabled={isLoading}>
									<Copy className="size-3.5" />
									Copy link
								</Button>
								<Button
									size="sm"
									variant="outline"
									onClick={regenerateShare}
									disabled={isLoading}
								>
									<RefreshCw className="size-3.5" />
									Regenerate
								</Button>
								<Button
									size="sm"
									variant="ghost"
									onClick={revokeShare}
									disabled={isLoading}
									className="text-destructive hover:bg-destructive/10 hover:text-destructive"
								>
									<Trash2 className="size-3.5" />
									Turn off
								</Button>
							</div>
						</div>
					) : (
						<Button
							className="mt-4 w-full"
							onClick={createShare}
							disabled={isLoading || shareQuery.isLoading}
						>
							<Share2 className="size-4" />
							Create share link
						</Button>
					)}

					{message && (
						<p className="mt-3 text-muted-foreground text-xs">{message}</p>
					)}
				</div>
			)}
		</div>
	);
}
