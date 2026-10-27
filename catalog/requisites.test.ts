import { describe, expect, it } from "vitest";
import { requisites } from "./requisites.ts";

const courses = new Set(["CSC226", "MATH110", "MATH211"]);

// A course in a rule's list, as Kuali writes it.
const course = (code: string) =>
  `<li><span><a href="#/courses/view/x">${code}</a> <!-- -->-<!-- --> Title <span>(1.5)</span></span></li>`;

const wrap = (items: string) =>
  `<div><div><div><ul>${items}</ul></div></div></div>`;

describe("requisites", () => {
  it("reads groups, rules with courses, and free text", () => {
    const html = wrap(
      `<li><span>Complete <!-- -->all<!-- --> of the following</span><ul>
        <li data-test="ruleView-A"><div data-test="ruleView-A-result">
          Earn a minimum grade of <span>B+</span> in each of the following:
          <div><ul>${course("CSC226")}</ul></div>
        </div></li>
        <li data-test="ruleView-C"><div data-test="ruleView-C-result">
          Complete <span>1</span> of: <div><ul>${course("MATH110")}${course("MATH211")}</ul></div>
        </div></li>
        <li data-test="ruleView-B"><div data-test="ruleView-B-result">
          <div>minimum third-year standing.</div>
        </div></li>
      </ul></li>`,
    );
    expect(requisites(html, courses)).toEqual([
      {
        label: "Complete all of the following",
        items: [
          {
            label: "Earn a minimum grade of B+ in each of the following:",
            items: [{ course: "CSC226" }],
          },
          {
            label: "Complete 1 of:",
            items: [{ course: "MATH110" }, { course: "MATH211" }],
          },
          { text: "minimum third-year standing." },
        ],
      },
    ]);
  });

  it("puts a heading over the item it wraps, and skips empty ones", () => {
    const rule = `<li data-test="ruleView-A"><div data-test="ruleView-A-result"><div>Chinese 12</div></div></li>`;
    const html = wrap(
      `<div><span class="rules_groupHeader_37">For learners of Chinese</span>${rule}</div>
       <div><span class="rules_groupHeader_37"></span>${rule}</div>`,
    );
    expect(requisites(html, courses)).toEqual([
      { label: "For learners of Chinese", items: [{ text: "Chinese 12" }] },
      { text: "Chinese 12" },
    ]);
  });

  it("keeps a course that isn't in the calendar as text", () => {
    const html = wrap(
      `<li data-test="ruleView-A"><div data-test="ruleView-A-result">
        Complete <span>1</span> of: <div><ul>${course("ART100")}</ul></div>
      </div></li>`,
    );
    expect(requisites(html, courses)).toEqual([
      { label: "Complete 1 of:", items: [{ text: "ART100" }] },
    ]);
  });

  it("reads a rule with only a label as text", () => {
    const html = wrap(
      `<li data-test="ruleView-A"><div data-test="ruleView-A-result">
        Earned a minimum cumulative GPA of <span>3.0</span>
      </div></li>`,
    );
    expect(requisites(html, courses)).toEqual([
      { text: "Earned a minimum cumulative GPA of 3.0" },
    ]);
  });

  it("drops Kuali's empty rules", () => {
    const html = wrap(
      `<li data-test="ruleView-A"><div data-test="ruleView-A-result">
        Complete all of: <div><ul></ul></div>
      </div></li>
      <li data-test="ruleView-B"><div data-test="ruleView-B-result"><div></div></div></li>`,
    );
    expect(requisites(html, courses)).toEqual([]);
  });

  it("is empty without requisites", () => {
    expect(requisites("", courses)).toEqual([]);
  });
});
