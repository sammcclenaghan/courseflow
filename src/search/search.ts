import { computed, signal } from "@preact/signals";
import { indexCourses, searchCourses } from "../../shared/search.ts";
import { catalog } from "../catalog.ts";

export const query = signal("");

const index = computed(() =>
  catalog.value.kind === "ok" ? indexCourses(catalog.value.data.courses) : [],
);

export const results = computed(() => searchCourses(index.value, query.value));
