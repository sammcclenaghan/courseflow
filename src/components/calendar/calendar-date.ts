export function startOfWeekSunday(date: Date): Date {
	const start = new Date(date);
	start.setHours(0, 0, 0, 0);
	start.setDate(start.getDate() - start.getDay());
	return start;
}

export function addDays(date: Date, days: number): Date {
	const next = new Date(date);
	next.setDate(next.getDate() + days);
	return next;
}

export function setLocalTime(date: Date, hour: number, minute: number): Date {
	const next = new Date(date);
	next.setHours(hour, minute, 0, 0);
	return next;
}
