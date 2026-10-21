import { describe, expect, it } from "vitest";
import { byCode, type Course } from "./course.ts";
import { searchCourses } from "./search.ts";

const course = (code: string, title: string): Course => ({
  code,
  title,
  sections: [],
});

// Courses in a term are in code order; search keeps that order within a rank.
const indexCourses = (courses: Course[]) => courses.toSorted(byCode);

const index = indexCourses([
  course("MATH101", "Calculus II"),
  course("CSC115", "Fundamentals of Programming II"),
  course("CSC110", "Fundamentals of Programming I"),
  course("CSC105", "Computers and Information Processing"),
  course("MATH100", "Calculus I"),
  course("MATH110", "Matrix Algebra for Engineers"),
  course("EDCI300", "Teaching Mathematics in the Elementary School"),
  course("ED-D101", "Introduction to Educational Psychology"),
  course("SENG110A", "Introduction to Programming"),
  course("ENGL119", "Writing Skills"),
]);

const codes = (query: string, limit?: number) =>
  searchCourses(index, query, limit).map((c) => c.code);

describe("searchCourses", () => {
  it("finds a course however its code is typed", () => {
    for (const query of ["CSC 110", "csc110", "Csc110", "  csc   110 "]) {
      expect(codes(query)[0]).toBe("CSC110");
    }
  });

  it("lists a code prefix in numeric order", () => {
    expect(codes("csc 1")).toEqual(["CSC105", "CSC110", "CSC115"]);
  });

  it("ranks a subject's own courses above title mentions", () => {
    expect(codes("math")).toEqual(["MATH100", "MATH101", "MATH110", "EDCI300"]);
  });

  it("matches a bare number across subjects, suffixes included", () => {
    expect(codes("110")).toEqual(["CSC110", "MATH110", "SENG110A"]);
    expect(codes("11")).toEqual([
      "CSC110",
      "CSC115",
      "ENGL119",
      "MATH110",
      "SENG110A",
    ]);
  });

  it("matches the start of title words, not the middle", () => {
    expect(codes("calculus")).toEqual(["MATH100", "MATH101"]);
    expect(codes("intro prog")).toEqual(["SENG110A"]);
    expect(codes("gram")).toEqual([]);
  });

  it("needs every query word to match", () => {
    expect(codes("fundamentals programming")).toEqual(["CSC110", "CSC115"]);
    expect(codes("fundamentals calculus")).toEqual([]);
  });

  it("handles hyphenated subjects", () => {
    for (const query of ["ED-D 101", "edd101", "ed-d1"]) {
      expect(codes(query)).toEqual(["ED-D101"]);
    }
  });

  it("returns nothing for an empty query", () => {
    expect(codes("")).toEqual([]);
    expect(codes("  - ")).toEqual([]);
  });

  it("stops at the limit", () => {
    expect(codes("1", 2)).toEqual(["CSC105", "CSC110"]);
  });
});

// Real 202609 courses: without this, "statistics" led with BIOL 563.
describe("searchCourses with graduate courses", () => {
  const mixed = indexCourses([
    course("BIOL563", "Statistics for Biologists"),
    course("STAT563", "Statistics Seminar"),
    course("ECON245", "Descriptive Statistics and Probability"),
    course("STAT255", "Statistics for Life Sciences I"),
    course("CSC579", "Overlay and Peer-to-Peer Networking"),
    course("CSC466", "Overlay and Peer-to-Peer Networking"),
    course("CSC501", "Algorithms and Data Models"),
    course("CSC110", "Fundamentals of Programming I"),
  ]);
  const find = (query: string) =>
    searchCourses(mixed, query).map((c) => c.code);

  it("lists undergraduate courses before graduate ones within a rank", () => {
    expect(find("statistics")).toEqual([
      "ECON245",
      "STAT255",
      "BIOL563",
      "STAT563",
    ]);
    expect(find("networking")).toEqual(["CSC466", "CSC579"]);
  });

  it("still ranks a better match above an undergraduate one", () => {
    expect(find("csc")).toEqual(["CSC110", "CSC466", "CSC501", "CSC579"]);
    // STAT 563 matches by code, so it beats ECON 245's title match.
    expect(find("stat")).toEqual(["STAT255", "STAT563", "ECON245", "BIOL563"]);
  });
});

// Real UVic codes and titles with unusual spelling or punctuation.
describe("searchCourses on awkward real titles", () => {
  const real = indexCourses([
    course("ENSH355", "Milton’s Major Works"),
    course("ENSH347P", "Petrarch's Poetry and Legacy (in English)"),
    course("ADMN312", "Leading and Managing in Public and Non-Profit Sectors"),
    course("ADMN409", "Non-profit Governance and Management"),
    course("ADMN589", "Co-op Seminar: Introduction to Professional Practice"),
    course("CSC466", "Overlay and Peer-to-Peer Networking"),
    course("FRAN170", "Level B1 Intensive French"),
    course("FRAN171", "Level B1.1 French"),
    course("BME410", "Bioprinting and 3D Printing Human Body Parts"),
    course("AHVS460", "Seminar in Modern Art I (1870-1945)"),
    course("LAW320", "Wills, Estates & Succession Planning"),
    course("SPAN699", "DISSERTATION"),
    course("AE103A", "Academic English for Engineering Students"),
  ]);
  const find = (query: string) => searchCourses(real, query).map((c) => c.code);

  it("ignores curly and straight apostrophes", () => {
    for (const query of ["milton", "miltons", "milton's", "milton’s"]) {
      expect(find(query)).toEqual(["ENSH355"]);
    }
    expect(find("petrarchs")).toEqual(["ENSH347P"]);
  });

  it("matches hyphenated words split or joined, in any case", () => {
    for (const query of ["nonprofit", "non-profit", "non profit", "NONPROF"]) {
      expect(find(query)).toEqual(["ADMN312", "ADMN409"]);
    }
    for (const query of ["coop", "co-op", "co op"]) {
      expect(find(query)).toEqual(["ADMN589"]);
    }
    expect(find("peer to peer")).toEqual(["CSC466"]);
    expect(find("peertopeer")).toEqual(["CSC466"]);
  });

  it("matches digits and dotted levels inside titles", () => {
    expect(find("b1.1")).toEqual(["FRAN171"]);
    expect(find("b1 french")).toEqual(["FRAN170", "FRAN171"]);
    expect(find("3d printing")).toEqual(["BME410"]);
    expect(find("(1870")).toEqual(["AHVS460"]);
  });

  it("skips punctuation like & and : in queries", () => {
    expect(find("wills & estates")).toEqual(["LAW320"]);
    expect(find("co-op seminar:")).toEqual(["ADMN589"]);
  });

  it("matches all-caps titles", () => {
    expect(find("dissertation")).toEqual(["SPAN699"]);
  });

  it("handles letter suffixes and two-letter subjects", () => {
    expect(find("ensh 347p")).toEqual(["ENSH347P"]);
    expect(find("347")).toEqual(["ENSH347P"]);
    expect(find("ae 103")).toEqual(["AE103A"]);
  });
});
