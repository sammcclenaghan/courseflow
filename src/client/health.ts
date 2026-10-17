import { loadJson } from "./loadable.ts";

export const health = loadJson<{ message: string }>("/api/healthcheck");
