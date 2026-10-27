import { signal } from "@preact/signals";
import type { Section } from "../catalog/terms.ts";

export type Entry = { code: string; crns: string[] };

export const schedules = signal<Record<string, Entry[]>>({});

export function add(term: string, code: string, sections: Section[]) {
  const entries = schedules.value[term] ?? [];
  if (entries.some((entry) => entry.code === code)) return;
  const crns = lowestSections(sections).map((section) => section.crn);
  schedules.value = {
    ...schedules.value,
    [term]: [...entries, { code, crns }],
  };
}

/**
 * The lowest-numbered section of each type that can be taken with the
 * lowest section overall. A link ID's number pairs sections: lecture A1
 * goes with tutorials T1, and lecture A2 with tutorials T2.
 */
export function lowestSections(sections: Section[]): Section[] {
  const group = sections[0].linkId?.slice(1);
  const picks = new Map<string, Section>();
  for (const section of sections) {
    const fits = !section.linkId || section.linkId.slice(1) === group;
    if (fits && !picks.has(section.type)) picks.set(section.type, section);
  }
  return [...picks.values()];
}
