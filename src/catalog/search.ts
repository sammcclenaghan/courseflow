import { parseCode } from "./code.ts";
import type { TermCourse } from "./model.ts";

export type SearchEntry = {
  course: TermCourse;
  code: string;
  number: string;
  graduate: boolean;
  words: string[];
};

// Apostrophes are dropped, not spaced, so "Milton’s" matches "miltons".
const normalize = (text: string) =>
  text
    .toUpperCase()
    .replace(/['’]/g, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

// Hyphenated words also index joined, so "Non-profit" matches "nonprofit".
const titleWords = (title: string) => {
  const words = normalize(title).split(" ");
  for (const [joined] of title
    .toUpperCase()
    .matchAll(/[A-Z0-9]+(?:-[A-Z0-9]+)+/g))
    words.push(joined.replaceAll("-", ""));
  return words;
};

export function indexCourses(courses: TermCourse[]): SearchEntry[] {
  return courses
    .map((course) => {
      const { subject, number } = parseCode(course.code);
      return {
        course,
        code: subject.replaceAll("-", "") + number,
        number,
        graduate: Number(number.slice(0, 3)) >= 500,
        words: titleWords(course.title),
      };
    })
    .sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
}

export function searchCourses(
  index: SearchEntry[],
  query: string,
  limit = 50,
): TermCourse[] {
  const words = normalize(query).split(" ").filter(Boolean);
  if (words.length === 0) return [];
  const compact = words.join("");

  // Two buckets per rank: undergraduate, then graduate.
  const buckets: TermCourse[][] = Array.from({ length: 6 }, () => []);
  for (const entry of index) {
    const rank = entry.code.startsWith(compact)
      ? 0
      : entry.number.startsWith(compact)
        ? 1
        : words.every((word) =>
              entry.words.some((title) => title.startsWith(word)),
            )
          ? 2
          : -1;
    if (rank >= 0)
      buckets[rank * 2 + (entry.graduate ? 1 : 0)].push(entry.course);
  }
  return buckets.flat().slice(0, limit);
}
