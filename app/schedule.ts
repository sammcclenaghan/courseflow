import { signal } from "@preact/signals";

export const schedules = signal<Record<string, string[]>>({});

export function add(term: string, code: string) {
  const codes = schedules.value[term] ?? [];
  if (codes.includes(code)) return;
  schedules.value = { ...schedules.value, [term]: [...codes, code] };
}
