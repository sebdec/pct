import { dayIdSchema, stableIdSchema } from "./schemas.ts";

export function homeUrl(): string {
  return "/";
}

export function journalDayUrl(dayId: string): string {
  return `/journal/${dayIdSchema.parse(dayId)}`;
}

export function mapUrl(): string {
  return "/map";
}

export function mapDayUrl(dayId: string): string {
  return `/map/${dayIdSchema.parse(dayId)}`;
}

export function glossaryUrl(): string {
  return "/glossary";
}

export function glossaryEntryUrl(conceptId: string): string {
  return `${glossaryUrl()}#${stableIdSchema.parse(conceptId)}`;
}
