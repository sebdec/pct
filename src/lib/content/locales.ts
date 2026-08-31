import { z } from "astro/zod";

const supportedLocales = ["fr", "en"] as const;
export const publishedLocales = ["en", "fr"] as const;
export const defaultLocale = "en" as const;
export const sourceLocale = "fr" as const;

export const localeSchema = z.enum(supportedLocales);

export type Locale = z.infer<typeof localeSchema>;

export const localeLanguageTags: Record<Locale, string> = {
  en: "en",
  fr: "fr",
};

export const localeFormattingTags: Record<Locale, string> = {
  en: "en-US",
  fr: "fr-FR",
};
