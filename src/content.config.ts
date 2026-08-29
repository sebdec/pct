import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";

import {
  correctionSchema,
  daySchema,
  gearItemSchema,
  glossaryConceptSchema,
  journalEntrySchema,
  localizedGearEntrySchema,
  localizedGlossaryEntrySchema,
  localizedPhotoSchema,
  photoSchema,
  regionSchema,
  sectionSchema,
  supportingPageSchema,
} from "./lib/content/schemas.ts";

const regions = defineCollection({
  loader: file("src/data/trail/regions.json"),
  schema: regionSchema,
});

const sections = defineCollection({
  loader: file("src/data/trail/sections.json"),
  schema: sectionSchema,
});

const days = defineCollection({
  loader: file("src/data/trail/days.json"),
  schema: daySchema,
});

const glossaryConcepts = defineCollection({
  loader: file("src/data/glossary/concepts.json"),
  schema: glossaryConceptSchema,
});

const gearItems = defineCollection({
  loader: file("src/data/gear/items.json"),
  schema: gearItemSchema,
});

const photos = defineCollection({
  loader: file("src/data/media/photos.json"),
  schema: photoSchema,
});

const corrections = defineCollection({
  loader: file("src/data/source/corrections.json"),
  schema: correctionSchema,
});

const journal = defineCollection({
  loader: glob({ pattern: "**/day-*.md", base: "./src/content/journal" }),
  schema: journalEntrySchema,
});

const pages = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/pages" }),
  schema: supportingPageSchema,
});

const glossary = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/glossary" }),
  schema: localizedGlossaryEntrySchema,
});

const gear = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/gear" }),
  schema: localizedGearEntrySchema,
});

const media = defineCollection({
  loader: glob({ pattern: "**/*.json", base: "./src/content/media" }),
  schema: localizedPhotoSchema,
});

export const collections = {
  regions,
  sections,
  days,
  glossaryConcepts,
  gearItems,
  photos,
  corrections,
  journal,
  pages,
  glossary,
  gear,
  media,
};
