import { useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
	return useSyncExternalStore(
		(onStoreChange) => {
			if (typeof window === "undefined") {
				return () => {};
			}

			const mql = window.matchMedia(query);
			const handler = () => onStoreChange();
			mql.addEventListener("change", handler);
			return () => mql.removeEventListener("change", handler);
		},
		() =>
			typeof window !== "undefined" ? window.matchMedia(query).matches : false,
		() => false,
	);
}

// The scheduler's 3-column desktop layout (search + calendar + selected) needs
// landscape width — below ~1024px the calendar columns get crushed (portrait
// iPads especially), so anything narrower falls back to the mobile shell.
export function useIsMobile(): boolean {
	return useMediaQuery("(max-width: 1023px)");
}
