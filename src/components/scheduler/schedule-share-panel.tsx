import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, RefreshCw, Share2, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
	scheduleShareQueries,
	scheduleShareQueryKey,
} from "@/queries/scheduler";
import {
	createMyScheduleShare,
	regenerateMyScheduleShare,
	revokeMyScheduleShare,
} from "@/utils/sharing.functions";

export function ScheduleSharePanel({
	term,
	disabled,
}: {
	term: string;
	disabled: boolean;
}) {
	const queryClient = useQueryClient();
	const rootRef = useRef<HTMLDivElement>(null);
	const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [isOpen, setIsOpen] = useState(false);
	const [activeAction, setActiveAction] = useState<
		"create" | "copy" | "regenerate" | "revoke" | null
	>(null);
	const [didCopy, setDidCopy] = useState(false);
	const shareQuery = useQuery({
		...scheduleShareQueries.mine(term),
		enabled: isOpen,
	});
	const share = shareQuery.data ?? null;

	useEffect(() => {
		if (!isOpen) return;

		const dismissOnOutsidePointerDown = (event: PointerEvent) => {
			const target = event.target;
			if (!(target instanceof Node)) return;
			if (rootRef.current?.contains(target)) return;

			setIsOpen(false);
		};

		document.addEventListener("pointerdown", dismissOnOutsidePointerDown);
		return () => {
			document.removeEventListener("pointerdown", dismissOnOutsidePointerDown);
		};
	}, [isOpen]);

	useEffect(() => {
		return () => {
			if (copiedTimeoutRef.current) {
				clearTimeout(copiedTimeoutRef.current);
			}
		};
	}, []);

	const shareUrl = useMemo(() => {
		if (!share || typeof window === "undefined") return "";
		return `${window.location.origin}/share/${share.shareId}`;
	}, [share]);

	const isLoading = activeAction !== null;

	async function run(
		actionName: "create" | "copy" | "regenerate" | "revoke",
		action: () => Promise<void>,
	) {
		setActiveAction(actionName);
		try {
			await action();
		} catch (error) {
			console.error("Schedule sharing action failed", error);
		} finally {
			setActiveAction(null);
		}
	}

	const createShare = () =>
		run("create", async () => {
			const next = await createMyScheduleShare({ data: { term } });
			queryClient.setQueryData(scheduleShareQueryKey(term), next);
		});

	const regenerateShare = () =>
		run("regenerate", async () => {
			const [next] = await Promise.all([
				regenerateMyScheduleShare({ data: { term } }),
				new Promise((resolve) => setTimeout(resolve, 700)),
			]);
			queryClient.setQueryData(scheduleShareQueryKey(term), next);
		});

	const revokeShare = () =>
		run("revoke", async () => {
			await revokeMyScheduleShare({ data: { term } });
			queryClient.setQueryData(scheduleShareQueryKey(term), null);
		});

	const copyLink = () =>
		run("copy", async () => {
			if (!shareUrl) return;
			await navigator.clipboard.writeText(shareUrl);
			setDidCopy(true);
			if (copiedTimeoutRef.current) clearTimeout(copiedTimeoutRef.current);
			copiedTimeoutRef.current = setTimeout(() => setDidCopy(false), 1600);
		});

	return (
		<div className="relative" ref={rootRef}>
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
				<div className="absolute top-full right-0 z-20 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-border bg-background p-4 shadow-xl">
					<div className="flex items-center justify-between">
						<h3 className="font-semibold text-sm">Share schedule</h3>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label="Close"
							onClick={() => setIsOpen(false)}
						>
							<X className="size-3.5" />
						</Button>
					</div>

					{share ? (
						<div className="mt-3 space-y-3">
							<Input
								readOnly
								value={shareUrl}
								onFocus={(e) => e.target.select()}
							/>
							<div className="flex items-center gap-2">
								<Button
									size="sm"
									onClick={copyLink}
									disabled={isLoading}
									className="ml-auto"
								>
									<Copy className="size-3.5" />
									{didCopy ? "Copied!" : "Copy link"}
								</Button>
								<Button
									size="icon-sm"
									variant="outline"
									onClick={regenerateShare}
									disabled={isLoading}
									aria-label="Regenerate link"
									title="Regenerate link"
								>
									<RefreshCw
										className={cn(
											"size-3.5",
											activeAction === "regenerate" && "animate-spin",
										)}
									/>
								</Button>
								<Button
									size="icon-sm"
									variant="ghost"
									onClick={revokeShare}
									disabled={isLoading}
									aria-label="Turn off sharing"
									title="Turn off sharing"
									className="text-destructive hover:bg-destructive/10 hover:text-destructive"
								>
									<Trash2 className="size-3.5" />
								</Button>
							</div>
						</div>
					) : shareQuery.isLoading ? (
						<div className="mt-3 space-y-3">
							<Skeleton className="h-9 w-full" />
							<Skeleton className="h-8 w-28" />
						</div>
					) : (
						<div className="mt-3 space-y-3">
							<p className="text-muted-foreground text-xs leading-relaxed">
								Anyone with the link can view a live copy of this schedule.
							</p>
							<Button
								className="w-full"
								onClick={createShare}
								disabled={isLoading || shareQuery.isLoading}
							>
								<Share2 className="size-4" />
								Create link
							</Button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
