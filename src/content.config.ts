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
  sourceDocumentSchema,
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

const sourceDocuments = defineCollection({
  loader: file("src/data/source/word-source.json"),
  schema: sourceDocumentSchema,
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
  sourceDocuments,
  journal,
  pages,
  glossary,
  gear,
  media,
};
