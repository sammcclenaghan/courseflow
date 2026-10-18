import { z } from "zod";
import type { BannerSection, Section } from "../../shared/model.ts";

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

export type NotesFile = z.infer<typeof notesFile>;

export function parseNotes(raw: unknown): NotesFile {
  return notesFile.parse(raw);
}

/**
 * Gives each section its note, but only when the CRN still names the same
 * course and section as when the note was scraped: CRNs can be reused.
 */
export function attachNotes(
  sections: BannerSection[],
  notes: NotesFile | null,
): Section[] {
  return sections.map((section) => {
    const entry = notes?.sections[section.crn];
    const same =
      entry?.course === section.subject + section.courseNumber &&
      entry.number === section.number;
    return { ...section, note: same ? entry.note : null };
  });
}
