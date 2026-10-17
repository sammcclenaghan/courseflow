import type { TermFile } from "../catalog/model.ts";
import { loadJson } from "./loadable.ts";

export const TERM = "202609";

export const catalog = loadJson<TermFile>(`/data/terms/${TERM}.json`);
