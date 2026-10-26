import { z } from "zod";
import { htmlBody, richText } from "./richtext.ts";
import type { Course, CourseDetails, RichText } from "./types.ts";

// One course from the academic calendar (Kuali). Titles come from here because
// Banner's are abbreviated and name a section's topic instead of the course.
const course = z.object({
  __catalogCourseId: z.string().regex(/^[A-Z]{2,4}(-[A-Z])?\d{3}[A-Z]?$/),
  title: z.string().trim().min(1),
  // HTML, and empty or missing for about 500 courses.
  description: z.string().optional(),
  supplementalNotes: z.string().optional(),
  preAndCorequisites: z.string().optional(),
});

export function parseCourse(raw: unknown): Course {
  const { __catalogCourseId: code, title } = course.parse(raw);
  return { code, title };
}

/** `courses` are the codes of every course in the calendar, for links. */
export function parseDetails(
  raw: unknown,
  courses: Set<string>,
): CourseDetails {
  const parsed = course.parse(raw);
  const text = (html = "") => richText(htmlBody(html).childNodes, courses);
  return {
    code: parsed.__catalogCourseId,
    title: parsed.title,
    description: text(parsed.description),
    notes: text(parsed.supplementalNotes),
    requisites: shorten(
      text(parsed.preAndCorequisites?.replace(GROUP_HEADING, "$1: <")),
    ),
  };
}

// Kuali puts a group's heading, like "For learners of Chinese", right against
// the requirement it introduces; a colon keeps them apart. Most headings are
// empty and stay that way.
const GROUP_HEADING = /(<span class="rules_groupHeader[^"]*">[^<]+?):?</g;

// Kuali writes requisites out in full ("Complete 1 of the following",
// "CSC115 - Fundamentals of Programming II (1.5)"); the course page shows them
// as a compact tree ("One of", "CSC115"), and the index has the titles.
function shorten(text: RichText | null): RichText | null {
  return (
    text?.flatMap((piece, i): RichText => {
      if (typeof piece !== "string")
        return "items" in piece
          ? [{ items: piece.items.map((item) => shorten(item) ?? []) }]
          : [piece];
      const previous = text[i - 1];
      const shortened =
        typeof previous === "object" && "course" in previous
          ? piece.replace(COURSE_TITLE, "")
          : shortLabel(piece);
      return shortened ? [shortened] : [];
    }) ?? null
  );
}

// What follows a linked course: " - Fundamentals of Programming II (1.5)".
const COURSE_TITLE = /^ - .*?\(\d+(\.\d+)?( - \d+(\.\d+)?)?\)/;

// Every label Kuali uses, by how often: about 3,300 "Complete … of", then
// grades, units, "concurrently" and GPA. A label no rule matches, like the two
// with a blank count ("in  of:") or "Complete 1.5 of:", is kept as written.
const LABELS = [
  /Complete (?<count>all|\d+) of(?: the following)?:?$/,
  /Earn(?:ed)? a minimum grade of (?<grade>[A-F][+-]?) in (?<count>each|\d+) of(?: the following)?:?$/,
  /Complete (?<units>[\d.]+) units from:?$/,
  /Completed or concurrently enrolled in (?<count>all|\d+) of:?$/,
  /Completed with a minimum GPA of (?<gpa>[\d.]+) (?<count>all) of the following:?$/,
];

function shortLabel(label: string): string {
  for (const pattern of LABELS) {
    const match = label.match(pattern);
    if (!match?.groups) continue;
    const { count, grade, units, gpa } = match.groups;
    const parts = [
      units
        ? `${units} units from`
        : count === "1"
          ? "One of"
          : /^\d+$/.test(count)
            ? `${count} of`
            : "All of",
    ];
    if (grade) parts.push(`minimum grade ${grade}`);
    if (gpa) parts.push(`minimum GPA ${gpa}`);
    if (match[0].includes("concurrently"))
      parts.push("before or at the same time");
    // Keeps a group's heading: "For learners of Chinese: One of".
    return label.slice(0, match.index) + parts.join(", ");
  }
  return label;
}
