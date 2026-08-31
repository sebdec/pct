import { dayIdSchema, stableIdSchema } from "./schemas.ts";
import { defaultLocale, type Locale } from "./locales.ts";

function localizeUrl(path: string, locale: Locale): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (locale === defaultLocale) return normalizedPath;
  if (normalizedPath === "/") return `/${locale}`;

  return `/${locale}${normalizedPath}`;
}

export function stripLocaleFromUrl(path: string): string {
  const withoutFrenchPrefix = path.replace(/^\/fr(?=\/|$)/, "");
  return withoutFrenchPrefix || "/";
}

export function switchLocaleUrl(path: string, locale: Locale): string {
  return localizeUrl(stripLocaleFromUrl(path), locale);
}

export function homeUrl(locale: Locale = defaultLocale): string {
  return localizeUrl("/", locale);
}

export function journalDayUrl(
  dayId: string,
  locale: Locale = defaultLocale,
): string {
  return localizeUrl(`/journal/${dayIdSchema.parse(dayId)}`, locale);
}

export function mapUrl(locale: Locale = defaultLocale): string {
  return localizeUrl("/map", locale);
}

export function mapDayUrl(
  dayId: string,
  locale: Locale = defaultLocale,
): string {
  return localizeUrl(`/map/${dayIdSchema.parse(dayId)}`, locale);
}

export function gearUrl(locale: Locale = defaultLocale): string {
  return localizeUrl("/gear", locale);
}

export function glossaryUrl(locale: Locale = defaultLocale): string {
  return localizeUrl("/glossary", locale);
}

export function glossaryEntryUrl(
  conceptId: string,
  locale: Locale = defaultLocale,
): string {
  return `${glossaryUrl(locale)}#${stableIdSchema.parse(conceptId)}`;
}
