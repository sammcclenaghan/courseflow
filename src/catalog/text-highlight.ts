export type HighlightSegment = {
	text: string;
	highlighted: boolean;
};

export function highlightTextSegments(
	text: string,
	query: string,
	minLength = 1,
): HighlightSegment[] {
	const trimmedQuery = query.trim();
	if (trimmedQuery.length < minLength) return plainSegment(text);

	const directIndex = text.toLowerCase().indexOf(trimmedQuery.toLowerCase());
	if (directIndex !== -1) {
		return segmentsForRange(
			text,
			directIndex,
			directIndex + trimmedQuery.length,
		);
	}

	const compactRange = findCompactMatchRange(text, trimmedQuery);
	if (!compactRange) return plainSegment(text);

	return segmentsForRange(text, compactRange.start, compactRange.end);
}

function findCompactMatchRange(
	text: string,
	query: string,
): { start: number; end: number } | null {
	const compactQuery = compactAlphanumeric(query);
	if (compactQuery === "") return null;

	let compactText = "";
	const originalIndexes: number[] = [];

	for (let index = 0; index < text.length; index++) {
		const char = text[index] ?? "";
		if (!/[a-z0-9]/i.test(char)) continue;

		compactText += char.toLowerCase();
		originalIndexes.push(index);
	}

	const compactIndex = compactText.indexOf(compactQuery);
	if (compactIndex === -1) return null;

	const start = originalIndexes[compactIndex];
	const last = originalIndexes[compactIndex + compactQuery.length - 1];
	if (start === undefined || last === undefined) return null;

	return { start, end: last + 1 };
}

function compactAlphanumeric(value: string): string {
	return value.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
}

function segmentsForRange(
	text: string,
	start: number,
	end: number,
): HighlightSegment[] {
	return [
		{ text: text.slice(0, start), highlighted: false },
		{ text: text.slice(start, end), highlighted: true },
		{ text: text.slice(end), highlighted: false },
	].filter((segment) => segment.text.length > 0);
}

function plainSegment(text: string): HighlightSegment[] {
	return [{ text, highlighted: false }];
}
