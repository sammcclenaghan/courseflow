import { z } from "zod";

// One course from the academic calendar (Kuali). Only the title is used so far;
// section titles are abbreviated and name the section's topic instead.
const course = z
  .object({
    __catalogCourseId: z.string().regex(/^[A-Z]{2,4}(-[A-Z])?\d{3}[A-Z]?$/),
    title: z.string().trim().min(1),
  })
  .transform((raw) => ({ code: raw.__catalogCourseId, title: raw.title }));

export function parseCourse(raw: unknown): { code: string; title: string } {
  return course.parse(raw);
}
