import { useNavigate, useSearch } from "@tanstack/react-router";
import * as React from "react";
import { DEFAULT_TERM, normalizeTerm, type TermValue } from "@/utils/constants";

const TERM_STORAGE_KEY = "courseflow:selected-term";

export function readStoredTerm(): TermValue | null {
	if (typeof window === "undefined") return null;
	try {
		return normalizeStoredTerm(window.localStorage.getItem(TERM_STORAGE_KEY));
	} catch {
		return null;
	}
}

export function writeStoredTerm(term: string) {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(TERM_STORAGE_KEY, normalizeTerm(term));
	} catch {
		// localStorage can be unavailable in private browsing, embedded contexts,
		// or tests. The URL search param remains the source of truth.
	}
}

export function useTerm() {
	const selectedTerm = useSearch({
		strict: false,
		select: (search) => normalizeTerm(search.term),
	});
	const navigate = useNavigate({ from: "/" });

	const setSelectedTerm = React.useCallback(
		(term: string, options?: { replace?: boolean }) => {
			const nextTerm = normalizeTerm(term);
			writeStoredTerm(nextTerm);
			void navigate({
				replace: options?.replace,
				search: (previous) => ({ ...previous, term: nextTerm }),
			});
		},
		[navigate],
	);

	return { selectedTerm, setSelectedTerm };
}

export function usePersistedTermBootstrap() {
	const { selectedTerm, setSelectedTerm } = useTerm();

	React.useEffect(() => {
		const urlHasTerm = new URLSearchParams(window.location.search).has("term");
		if (urlHasTerm) {
			writeStoredTerm(selectedTerm);
			return;
		}

		const storedTerm = readStoredTerm();
		if (storedTerm && storedTerm !== selectedTerm) {
			setSelectedTerm(storedTerm, { replace: true });
		}
	}, [selectedTerm, setSelectedTerm]);
}

function normalizeStoredTerm(value: string | null): TermValue | null {
	if (!value) return null;
	const normalized = normalizeTerm(value);
	return normalized === DEFAULT_TERM && value !== DEFAULT_TERM
		? null
		: normalized;
}
