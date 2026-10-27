import { clean, htmlBody } from "./text.ts";

export type Requisite =
  | { label: string; items: Requisite[] }
  | { course: string }
  | { text: string };

export function requisites(html: string, courses: Set<string>): Requisite[] {
  const root = htmlBody(html).querySelector("ul");
  return root ? list(root, courses) : [];
}

function list(parent: Element, courses: Set<string>): Requisite[] {
  return (
    [...parent.children]
      .flatMap((child): Requisite[] => {
        if (child.nodeName === "LI") return [item(child, courses)];
        if (child.nodeName !== "DIV") return [];
        const items = list(child, courses);
        const heading = clean(
          child.querySelector("[class^=rules_groupHeader]")?.textContent,
        );
        return heading ? [{ label: heading, items }] : items;
      })
      // A few of Kuali's rules are empty, which would leave a label with
      // nothing under it.
      .filter((requisite) =>
        "items" in requisite
          ? requisite.items.length > 0
          : "text" in requisite
            ? requisite.text !== ""
            : true,
      )
  );
}

function item(li: Element, courses: Set<string>): Requisite {
  const group = li.querySelector(":scope > ul");
  if (group) {
    const label = li.querySelector(":scope > span");
    return { label: clean(label?.textContent), items: list(group, courses) };
  }
  const rule = li.querySelector(":scope > div[data-test$=-result]");
  if (rule) return ruleItem(rule, courses);
  const link = li.querySelector("a");
  if (link) {
    const code = clean(link.textContent);
    return courses.has(code) ? { course: code } : { text: code };
  }
  return { text: clean(li.textContent) };
}

function ruleItem(rule: Element, courses: Set<string>): Requisite {
  const nodes = [...rule.childNodes];
  const split = nodes.findIndex((node) => node.nodeName === "DIV");
  const body = split === -1 ? null : (nodes[split] as Element);
  const label = clean(
    nodes
      .slice(0, split === -1 ? undefined : split)
      .map((node) => node.textContent)
      .join(""),
  );
  const ul = body?.querySelector("ul");
  if (ul) return { label, items: list(ul, courses) };
  return { text: label || clean(body?.textContent) };
}
