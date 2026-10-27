import type { Meeting, Section } from "../catalog/terms.ts";

export type Slot = Pick<Meeting, "days" | "time">;

/** "202701" → "Spring 2027". */
export function termName(code: string): string {
  const season = { "01": "Spring", "05": "Summer", "09": "Fall" }[
    code.slice(4)
  ];
  return `${season} ${code.slice(0, 4)}`;
}

/**
 * A course's sections grouped by type, in the order the types first appear,
 * with the distinct slots each type meets at.
 */
export function byType(
  sections: Section[],
): { type: string; count: number; slots: Slot[] }[] {
  const groups = new Map<string, { count: number; slots: Map<string, Slot> }>();
  for (const section of sections) {
    const group = groups.get(section.type) ?? { count: 0, slots: new Map() };
    group.count++;
    for (const { days, time } of section.meetings)
      group.slots.set(JSON.stringify({ days, time }), { days, time });
    groups.set(section.type, group);
  }
  return [...groups].map(([type, { count, slots }]) => ({
    type,
    count,
    slots: [...slots.values()].sort(
      (a, b) =>
        (a.days[0] ?? 7) - (b.days[0] ?? 7) ||
        (a.time?.start ?? 0) - (b.time?.start ?? 0),
    ),
  }));
}

const DAY_LETTERS = ["U", "M", "T", "W", "R", "F", "S"];

/** [2, 3, 5] → "T W F", as UVic writes days. */
export function formatDays(days: number[]): string {
  return days.map((day) => DAY_LETTERS[day]).join(" ");
}

/** 570–620 → "9:30 – 10:20 AM"; 690–740 → "11:30 AM – 12:20 PM". */
export function formatTime(time: Meeting["time"]): string {
  if (!time) return "TBA";
  const start = clock(time.start);
  const end = clock(time.end);
  return start.half === end.half
    ? `${start.text} – ${end.text} ${end.half}`
    : `${start.text} ${start.half} – ${end.text} ${end.half}`;
}

function clock(minutes: number) {
  const hour = Math.floor(minutes / 60);
  const minute = String(minutes % 60).padStart(2, "0");
  return {
    text: `${hour % 12 || 12}:${minute}`,
    half: hour < 12 ? "AM" : "PM",
  };
}
