import { setResponseHeader } from "@tanstack/react-start/server";

export function setNoStore(options: { varyByCookie?: boolean } = {}): void {
	setResponseHeader("Cache-Control", "no-store");
	if (options.varyByCookie) {
		setResponseHeader("Vary", "Cookie");
	}
}
