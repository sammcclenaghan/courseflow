export const COURSE_COLORS = [
	"#3b82f6",
	"#10b981",
	"#f97316",
	"#8b5cf6",
	"#ec4899",
	"#06b6d4",
	"#eab308",
	"#ef4444",
];

export const TERMS = [
	{ label: "Fall 2026", value: "202609" },
	{ label: "Spring 2027", value: "202701" },
] as const;

export const DEFAULT_TERM = TERMS[0].value;

export function getTermLabel(termValue: string) {
	return TERMS.find((term) => term.value === termValue)?.label ?? termValue;
}

export const DAY_MAP: Record<string, number> = {
	M: 1,
	T: 2,
	W: 3,
	R: 4,
	F: 5,
};
