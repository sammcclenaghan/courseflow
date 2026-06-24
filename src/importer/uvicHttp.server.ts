import type { FetchOptions } from "./catalogImport.types.ts";

const DEFAULT_TIMEOUT_MS = 15_000;

type RequestFetchOptions = RequestInit & FetchOptions;

export async function fetchJson(
	url: string,
	options: RequestFetchOptions = {},
): Promise<unknown> {
	const response = await fetchWithTimeout(url, options);
	return response.json();
}

export async function fetchText(
	url: string | URL,
	options: RequestFetchOptions = {},
): Promise<string> {
	const response = await fetchWithTimeout(url, options);
	return response.text();
}

async function fetchWithTimeout(
	url: string | URL,
	options: RequestFetchOptions,
): Promise<Response> {
	const controller = new AbortController();
	const timeout = setTimeout(
		() => controller.abort(),
		options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
	);

	try {
		const { fetchFn, timeoutMs, ...requestInit } = options;
		void timeoutMs;
		const response = await (fetchFn ?? fetch)(url, {
			...requestInit,
			signal: controller.signal,
		});
		if (!response.ok && response.status !== 302) {
			const body = await response.text();
			throw new Error(
				`fetch ${url.toString()} failed with ${response.status}: ${body.slice(0, 500)}`,
			);
		}
		return response;
	} finally {
		clearTimeout(timeout);
	}
}
