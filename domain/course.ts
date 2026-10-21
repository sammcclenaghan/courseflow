import type { Section } from "./section.ts";

/** A course as offered in one term. */
export type Course = {
  /** "CSC110" */
  code: string;
  title: string;
  /** In number order: A01, A02, B01… */
  sections: Section[];
};

/** "ED-D101" → { subject: "ED-D", number: "101" } */
export function parseCode(code: string) {
  const match = /^([A-Z]+(?:-[A-Z]+)?)(\d{3}[A-Z]?)$/.exec(code);
  if (!match) throw new Error(`Unexpected course code: ${code}`);
  return { subject: match[1], number: match[2] };
}

/** "CSC110" → "CSC 110" */
export function displayCode(code: string) {
  const { subject, number } = parseCode(code);
  return `${subject} ${number}`;
}

/** The order courses are listed in: by code. */
export const byCode = (a: Course, b: Course) =>
  a.code.localeCompare(b.code, "en", { numeric: true });
