import { parseHTML } from "linkedom";

/** The parsed body of some of Kuali's HTML. */
export function htmlBody(html: string): HTMLElement {
  // linkedom only parses a whole document correctly, not a fragment.
  return parseHTML(`<html><body>${html}</body></html>`).document.body;
}

/** Text from the HTML, without its line breaks and indentation. */
export function clean(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Kuali's HTML as plain-text paragraphs. Each top-level element is a
 * paragraph, except a list, whose items each are; a <br> between them has no
 * text, so it drops out.
 */
export function paragraphs(html: string): string[] {
  return [...htmlBody(html).children]
    .flatMap((element) =>
      // childNodes, not children: a few lists have a sentence outside any <li>.
      element.nodeName === "UL" || element.nodeName === "OL"
        ? [...element.childNodes]
        : [element],
    )
    .map((element) => clean(element.textContent))
    .filter((text) => text !== "");
}
