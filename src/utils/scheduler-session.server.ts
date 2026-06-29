import { getCookie, setCookie } from "@tanstack/react-start/server";

const SCHEDULE_TOKEN_COOKIE = "cf_schedule_token";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function getAnonymousScheduleToken(): string | null {
	return getCookie(SCHEDULE_TOKEN_COOKIE) ?? null;
}

export function getOrCreateAnonymousScheduleToken(): string {
	const existing = getAnonymousScheduleToken();
	if (existing) return existing;

	const token = crypto.randomUUID();
	setAnonymousScheduleToken(token);
	return token;
}

export function setAnonymousScheduleToken(token: string): void {
	setCookie(SCHEDULE_TOKEN_COOKIE, token, {
		httpOnly: true,
		sameSite: "lax",
		secure: import.meta.env.PROD,
		path: "/",
		maxAge: ONE_YEAR_SECONDS,
	});
}
