import { z } from "astro/zod";

export const supportedLocales = ["fr", "en"] as const;
export const publishedLocales = ["fr"] as const;
export const defaultLocale = "fr" as const;

export const localeSchema = z.enum(supportedLocales);

export type Locale = z.infer<typeof localeSchema>;

export function isLocale(value: string): value is Locale {
  return localeSchema.safeParse(value).success;
}
