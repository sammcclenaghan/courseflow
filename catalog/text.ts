import { parseHTML } from "linkedom";

/**
 * Kuali's HTML as plain-text paragraphs. Each top-level element is a
 * paragraph; a <br> between them has no text, so it drops out.
 */
export function paragraphs(html: string): string[] {
  // linkedom only parses a whole document correctly, not a fragment.
  const { document } = parseHTML(`<html><body>${html}</body></html>`);
  return [...document.body.children]
    .map((element) => (element.textContent ?? "").replace(/\s+/g, " ").trim())
    .filter((text) => text !== "");
}
