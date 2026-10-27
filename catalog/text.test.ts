import { describe, expect, it } from "vitest";
import { paragraphs } from "./text.ts";

describe("paragraphs", () => {
  it("splits paragraphs, including ones divided by a line break", () => {
    expect(
      paragraphs(
        "<p>Examination of a topic.</p> <br /> <p>* Hours may vary.</p>",
      ),
    ).toEqual(["Examination of a topic.", "* Hours may vary."]);
  });

  it("makes each list item a paragraph", () => {
    expect(
      paragraphs(
        "<ul><li>Credit for only one of CSC 110, CSC 111.</li><li>Not open to Engineering students.</li></ul>",
      ),
    ).toEqual([
      "Credit for only one of CSC 110, CSC 111.",
      "Not open to Engineering students.",
    ]);
  });

  it("keeps a sentence a list has outside its items", () => {
    expect(
      paragraphs(
        "<ul> <li>Credit for only one of CYC 211, CYC 210.</li> Complete 150 hours.</ul>",
      ),
    ).toEqual([
      "Credit for only one of CYC 211, CYC 210.",
      "Complete 150 hours.",
    ]);
  });

  it("treats a div as a paragraph", () => {
    expect(paragraphs("<div>Introduction to estimation.</div>")).toEqual([
      "Introduction to estimation.",
    ]);
  });

  it("keeps the text of inline tags and links", () => {
    expect(
      paragraphs(
        '<p>The 16<sup>th</sup> century, <em>The Canterbury Tales</em> and the <a href="http://example.com">website</a>.</p>',
      ),
    ).toEqual(["The 16th century, The Canterbury Tales and the website."]);
  });

  it("decodes entities", () => {
    expect(paragraphs("<p>&quot;Caf&#233;&quot; &amp; &amp;quot;</p>")).toEqual(
      ['"Café" & &quot;'],
    );
  });

  it("drops empty paragraphs", () => {
    expect(paragraphs("<p>Text. <strike></strike></p><p> </p>")).toEqual([
      "Text.",
    ]);
  });
});
