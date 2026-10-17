import { parseCode } from "./code.ts";
import type { TermCourse } from "./model.ts";

export type SearchEntry = {
  course: TermCourse;
  code: string;
  number: string;
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
        words: titleWords(course.title),
      };
    })
    .sort((a, b) => (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
}

/**
 * Ranks code prefix ("csc 1"), then number prefix ("110"), then titles where
 * every query word starts some title word ("intro prog"). Code order within a rank.
 */
export function searchCourses(
  index: SearchEntry[],
  query: string,
  limit = 50,
): TermCourse[] {
  const words = normalize(query).split(" ").filter(Boolean);
  if (words.length === 0) return [];
  const compact = words.join("");

  const ranks: TermCourse[][] = [[], [], []];
  for (const entry of index) {
    if (entry.code.startsWith(compact)) ranks[0].push(entry.course);
    else if (entry.number.startsWith(compact)) ranks[1].push(entry.course);
    else if (
      words.every((word) => entry.words.some((title) => title.startsWith(word)))
    )
      ranks[2].push(entry.course);
  }
  return ranks.flat().slice(0, limit);
}
