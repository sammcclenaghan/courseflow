import { signal } from "@preact/signals";

/** Courses folded shut in the selected courses panel. */
export const collapsed = signal(new Set<string>());

export function toggleCourse(code: string) {
  const next = new Set(collapsed.value);
  if (!next.delete(code)) next.add(code);
  collapsed.value = next;
}

/** The section to scroll to and focus in the panel; `at` lets the same one be revealed twice. */
export const revealed = signal<{ crn: string; at: number } | null>(null);

/** Shows a section in the panel, for clicking it on the calendar. */
export function revealSection(code: string, crn: string) {
  if (collapsed.value.has(code)) toggleCourse(code);
  revealed.value = { crn, at: Date.now() };
}
