type Seats = {
  enrolled: number;
  capacity: number;
  available: number;
};

export type Meeting = {
  days: number[];
  start: number | null;
  end: number | null;
  startDate: string;
  endDate: string;
};

export type Requirement =
  | { type: "all"; items: Requirement[] }
  | { type: "some"; count: number; items: Requirement[] }
  | {
      type: "courses";
      need: "all" | number | { units: number };
      timing: "completed" | "concurrent" | "either";
      minGrade: string | null;
      minGpa: number | null;
      courses: string[];
    }
  | { type: "text"; text: string };

export type Course = {
  pid: string;
  code: string;
  title: string;
  description: string | null;
  notes: string[];
  credits: string | null;
  hours: string | null;
  prerequisites: Requirement | null;
  preOrCorequisites: Requirement | null;
  corequisites: Requirement | null;
  recommendations: string[];
};

export type BannerSection = {
  term: string;
  crn: string;
  subject: string;
  courseNumber: string;
  /** "A01", "B05", "T02": the letter is the type. */
  number: string;
  title: string;
  /** "Lecture", "Lab", "Tutorial"…: Banner's schedule type. */
  type: string;
  instructionalMethod: string;
  partOfTerm: string;
  credits: number | null;
  linkId: string | null;
  crossList: string | null;
  crossListAvailable: number | null;
  seats: Seats;
  waitlist: Seats;
  meetings: Meeting[];
};

export type Section = BannerSection & {
  note: string | null;
};

/** One course in a term file, with every section offered that term. */
export type TermCourse = {
  code: string;
  title: string;
  sections: Section[];
};

/** public/data/terms/<term>.json */
export type TermFile = {
  term: string;
  importedAt: string;
  notesAsOf: string | null;
  /** The usual first and last day of classes, "2026-09-09". */
  startDate: string;
  endDate: string;
  courses: TermCourse[];
};
