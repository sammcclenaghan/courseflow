import { z } from "zod";
import type { Section } from "./term.ts";

// data/notes/<term>.json: section notes recovered from the old Banner 8
// scrape. They can't be refetched, so the file is the source of truth.
const notesFile = z.strictObject({
  source: z.string().min(1),
  scrapedAt: z.iso.datetime(),
  sections: z.record(
    z.string().regex(/^\d{5}$/),
    z.strictObject({
      course: z.string().min(1),
      number: z.string().regex(/^[A-Z]\d\d$/),
      note: z.string().min(1),
    }),
  ),
});

type Notes = z.infer<typeof notesFile>;

export function parseNotes(raw: unknown): Notes {
  return notesFile.parse(raw);
}

/**
 * A section's note, but only when its CRN still names the same course and
 * section as when the note was scraped: CRNs can be reused.
 */
export function noteFor(
  notes: Notes,
  course: string,
  section: Pick<Section, "crn" | "number">,
): string | null {
  const entry = notes.sections[section.crn];
  return entry?.course === course && entry.number === section.number
    ? entry.note
    : null;
}
