import { z } from "zod";

// One course from Kuali's catalog API. Only the title is used so far; Banner's
// titles are abbreviated and name the section's topic instead of the course's.
const kualiCourse = z
  .object({
    __catalogCourseId: z.string().regex(/^[A-Z]{2,4}(-[A-Z])?\d{3}[A-Z]?$/),
    title: z.string().trim().min(1),
  })
  .transform((raw) => ({ code: raw.__catalogCourseId, title: raw.title }));

export function parseCourse(raw: unknown): { code: string; title: string } {
  return kualiCourse.parse(raw);
}
