export function htmlToStructuredText(html: string): string {
	return htmlToText(
		html
			.replace(/<br\s*\/?\s*>/gi, "\n")
			.replace(/<li\b[^>]*>/gi, "\n• ")
			.replace(/<\/(p|div|li|ul|ol)>/gi, "\n"),
	);
}

export function htmlToText(html: string): string {
	const withBreaks = html
		.replace(/<br\s*\/?\s*>/gi, "\n")
		.replace(/<\/(p|div|tr|li|ul|ol)>/gi, "\n");
	const withoutTags = withBreaks.replace(/<[^>]*>/g, " ");
	return decodeHtmlEntities(withoutTags)
		.split("\n")
		.map((line) => line.replace(/\s+/g, " ").trim())
		.filter(Boolean)
		.join("\n");
}

function decodeHtmlEntities(value: string): string {
	return value
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&quot;/gi, '"')
		.replace(/&#39;/gi, "'")
		.replace(/&#(\d+);/g, (_match, code: string) =>
			String.fromCodePoint(Number.parseInt(code, 10)),
		);
}
