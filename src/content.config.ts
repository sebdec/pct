import { defineCollection } from "astro:content";
import { file, glob } from "astro/loaders";

import {
  daySchema,
  gearItemSchema,
  gearProductLinkSchema,
  gearSummarySchema,
  glossaryConceptSchema,
  journalEntrySchema,
  localizedGearEntrySchema,
  localizedGlossaryEntrySchema,
  localizedPhotoSchema,
  mapAreaSchema,
  mapPointSchema,
  mediaAssetSchema,
  photoSchema,
  sectionSchema,
  trailRouteSchema,
} from "./lib/content/schemas.ts";

const sections = defineCollection({
  loader: file("src/data/trail/sections.json"),
  schema: sectionSchema,
});

const days = defineCollection({
  loader: file("src/data/trail/days.json"),
  schema: daySchema,
});

const routes = defineCollection({
  loader: file("src/data/map/routes.json"),
  schema: trailRouteSchema,
});

const mapPoints = defineCollection({
  loader: file("src/data/map/points-of-interest.json"),
  schema: mapPointSchema,
});

const mapAreas = defineCollection({
  loader: file("src/data/map/geography.json"),
  schema: mapAreaSchema,
});

const glossaryConcepts = defineCollection({
  loader: file("src/data/glossary/concepts.json"),
  schema: glossaryConceptSchema,
});

const gearItems = defineCollection({
  loader: file("src/data/gear/items.json"),
  schema: gearItemSchema,
});

const gearProductLinks = defineCollection({
  loader: file("src/data/gear/product-links.json"),
  schema: gearProductLinkSchema,
});

const gearSummaries = defineCollection({
  loader: file("src/data/gear/summary.json"),
  schema: gearSummarySchema,
});

const photos = defineCollection({
  loader: file("src/data/media/photos.json"),
  schema: photoSchema,
});

const mediaAssets = defineCollection({
  loader: file("src/data/media/assets.json"),
  schema: mediaAssetSchema,
});

const journal = defineCollection({
  loader: glob({ pattern: "**/day-*.md", base: "./src/content/journal" }),
  schema: journalEntrySchema,
});

const glossary = defineCollection({
  loader: file("src/content/glossary/fr.json"),
  schema: localizedGlossaryEntrySchema,
});

const glossaryEnglish = defineCollection({
  loader: file("src/content/glossary/en.json"),
  schema: localizedGlossaryEntrySchema,
});

const gear = defineCollection({
  loader: file("src/content/gear/fr.json"),
  schema: localizedGearEntrySchema,
});

const gearEnglish = defineCollection({
  loader: file("src/content/gear/en.json"),
  schema: localizedGearEntrySchema,
});

const media = defineCollection({
  loader: file("src/content/media/fr.json"),
  schema: localizedPhotoSchema,
});

export const collections = {
  sections,
  days,
  routes,
  mapPoints,
  mapAreas,
  glossaryConcepts,
  gearItems,
  gearProductLinks,
  gearSummaries,
  photos,
  mediaAssets,
  journal,
  glossary,
  glossaryEnglish,
  gear,
  gearEnglish,
  media,
};
