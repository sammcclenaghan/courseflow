import { type Course, parseCode } from "./course.ts";

/**
 * The courses matching a query, best first:
 *   1. by code: "csc 1", "CSC110", "ed-d1"
 *   2. by number, in any subject: "110"
 *   3. by title, each query word starting a title word: "intro prog"
 * Within each, undergraduate courses come before graduate ones, then the
 * courses' own order.
 */
export function searchCourses(
  courses: Course[],
  query: string,
  limit = 50,
): Course[] {
  const words = normalize(query).split(" ").filter(Boolean);
  if (words.length === 0) return [];
  const compact = words.join("");

  // Two buckets per kind of match: undergraduate, then graduate.
  const buckets: Course[][] = Array.from({ length: 6 }, () => []);
  for (const course of courses) {
    const { subject, number } = parseCode(course.code);
    const match = (subject.replace("-", "") + number).startsWith(compact)
      ? 0
      : number.startsWith(compact)
        ? 1
        : words.every((word) =>
              titleWords(course.title).some((title) => title.startsWith(word)),
            )
          ? 2
          : -1;
    const graduate = Number(number.slice(0, 3)) >= 500;
    if (match >= 0) buckets[match * 2 + (graduate ? 1 : 0)].push(course);
  }
  return buckets.flat().slice(0, limit);
}

// Apostrophes are dropped, not spaced, so "Milton’s" matches "miltons".
const normalize = (text: string) =>
  text
    .toUpperCase()
    .replace(/['’]/g, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

// Hyphenated words also count joined, so "Non-profit" matches "nonprofit".
function titleWords(title: string) {
  const words = normalize(title).split(" ");
  for (const [joined] of title
    .toUpperCase()
    .matchAll(/[A-Z0-9]+(?:-[A-Z0-9]+)+/g))
    words.push(joined.replaceAll("-", ""));
  return words;
}
