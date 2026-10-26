import { parseHTML } from "linkedom";
import type { RichText } from "./types.ts";

/** The parsed body of a piece of HTML from UVic. */
export function htmlBody(html: string) {
  // linkedom only parses a whole document correctly, not a fragment.
  return parseHTML(`<html><body>${html}</body></html>`).document.body;
}

/**
 * The text in some HTML nodes, or null when there is none. `courses` are the
 * codes of every course in the calendar.
 */
export function richText(
  nodes: Iterable<Node>,
  courses: Set<string>,
): RichText | null {
  const pieces: RichText = [];
  const walk = (node: Node) => {
    const href = (node as Element).getAttribute?.("href")?.trim() ?? "";
    // Line breaks and indentation in the HTML aren't part of the text; only
    // <br> and paragraphs are.
    if (node.nodeType === node.TEXT_NODE)
      pieces.push(
        ...linkCourses(node.textContent?.replace(/\s+/g, " ") ?? "", courses),
      );
    else if (node.nodeName === "BR") pieces.push("\n");
    // Links into Kuali's own pages (#/policy/…) would be dead in the app, so
    // only web and email links are kept; the rest become their text.
    else if (node.nodeName === "A" && /^(https?|mailto):/.test(href))
      pieces.push({ url: href, text: node.textContent?.trim() ?? "" });
    else if (node.nodeName === "UL" || node.nodeName === "OL") {
      // A few lists have a sentence outside any <li>; it's an item too.
      const items = [...node.childNodes]
        .map((child) =>
          richText(
            child.nodeName === "LI" ? child.childNodes : [child],
            courses,
          ),
        )
        .filter((item) => item !== null);
      // A few of Kuali's lists are empty; one would still make the text
      // before it look like a label.
      if (items.length > 0) pieces.push({ items });
    } else if (node.nodeType === node.ELEMENT_NODE) {
      for (const child of node.childNodes) walk(child);
      if (node.nodeName === "P") pieces.push("\n\n");
    }
  };
  for (const node of nodes) walk(node);
  return tidy(pieces);
}

const COURSE_CODE = /\b([A-Z]{2,4}(?:-[A-Z])?) ?(\d{3}[A-Z]?)\b/g;

// Codes that aren't in the calendar, like retired courses, stay text, so the
// frontend never links to a course it doesn't have.
function linkCourses(text: string, courses: Set<string>): RichText {
  const pieces: RichText = [];
  let rest = 0;
  for (const match of text.matchAll(COURSE_CODE)) {
    const course = match[1] + match[2];
    if (!courses.has(course)) continue;
    pieces.push(text.slice(rest, match.index), { course, text: match[0] });
    rest = match.index + match[0].length;
  }
  pieces.push(text.slice(rest));
  return pieces;
}

// Walking the HTML leaves text in many small strings, with spaces around line
// breaks and at both ends; the frontend should get one string per run of text.
// A list is a block of its own, so line breaks next to it aren't text either.
function tidy(pieces: RichText): RichText | null {
  const joined: RichText = [];
  for (const piece of pieces) {
    const last = joined.at(-1);
    if (typeof piece === "string" && typeof last === "string")
      joined[joined.length - 1] = last + piece;
    else joined.push(piece);
  }
  const isEdge = (piece: RichText[number] | undefined) =>
    piece === undefined || (typeof piece === "object" && "items" in piece);
  const text = joined
    .map((piece, i) => {
      if (typeof piece !== "string") return piece;
      let tidied = piece.replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n");
      if (isEdge(joined[i - 1])) tidied = tidied.trimStart();
      if (isEdge(joined[i + 1])) tidied = tidied.trimEnd();
      return tidied;
    })
    .filter((piece) => piece !== "");
  return text.length > 0 ? text : null;
}
