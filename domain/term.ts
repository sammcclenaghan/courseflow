import type { Course } from "./course.ts";

/** Everything offered in one term: public/data/terms/<code>.json. */
export type Term = {
  /** "202609": the year, then 01 (Spring), 05 (Summer) or 09 (Fall). */
  code: string;
  /** The usual first and last day of classes. Some sections run outside them. */
  startDate: string;
  endDate: string;
  /** In byCode order. */
  courses: Course[];
};

const SEASONS: Record<string, string> = {
  "01": "Spring",
  "05": "Summer",
  "09": "Fall",
};

/** "202701" → "Spring 2027" */
export function termName(code: string) {
  const season = SEASONS[code.slice(4)];
  if (!/^\d{6}$/.test(code) || !season)
    throw new Error(`Unexpected term code: ${code}`);
  return `${season} ${code.slice(0, 4)}`;
}
