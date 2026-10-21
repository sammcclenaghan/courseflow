/** Every schedule type in Banner's data; anything new shows its own name. */
const PLURALS: Record<string, string> = {
  Lecture: "Lectures",
  "Lecture Topic": "Lecture topics",
  Lab: "Labs",
  "Gradable Lab": "Gradable labs",
  Tutorial: "Tutorials",
  Seminar: "Seminars",
  Practicum: "Practicums",
  "Work Term": "Work terms",
};

/** "Lab" → "Labs": a heading over a course's sections of one type. */
export const pluralType = (type: string) => PLURALS[type] ?? type;
