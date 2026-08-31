import type {
  GlossaryConcept,
  LocalizedGlossaryEntry,
} from "../content/schemas.ts";
import type { Locale } from "../content/locales.ts";

interface GlossaryListEntry {
  id: string;
  term: string;
  definition: string;
  aliases: string[];
}

interface GlossaryGroup {
  initial: string;
  entries: GlossaryListEntry[];
}

export interface GlossaryViewModel {
  groups: GlossaryGroup[];
  entryCount: number;
}

function entryInitial(term: string, locale: Locale): string {
  return term.trim().charAt(0).toLocaleUpperCase(locale);
}

export function buildGlossaryViewModel(
  concepts: readonly GlossaryConcept[],
  localizedEntries: readonly LocalizedGlossaryEntry[],
  locale: Locale = "fr",
): GlossaryViewModel {
  const collator = new Intl.Collator(locale, {
    numeric: true,
    sensitivity: "base",
  });
  const localizedByConceptId = new Map(
    localizedEntries
      .filter((entry) => entry.locale === locale)
      .map((entry) => [entry.conceptId, entry]),
  );

  const entries = concepts
    .filter(({ published }) => published)
    .map((concept): GlossaryListEntry => {
      const localized = localizedByConceptId.get(concept.id);

      if (!localized) {
        throw new Error(`Missing ${locale} glossary entry for ${concept.id}.`);
      }

      return {
        id: concept.id,
        term: localized.term,
        definition: localized.definition,
        aliases: localized.aliases,
      };
    })
    .toSorted((left, right) => collator.compare(left.term, right.term));

  const groupedEntries = new Map<string, GlossaryListEntry[]>();

  for (const entry of entries) {
    const initial = entryInitial(entry.term, locale);
    const group = groupedEntries.get(initial) ?? [];
    group.push(entry);
    groupedEntries.set(initial, group);
  }

  return {
    groups: [...groupedEntries].map(([initial, groupEntries]) => ({
      initial,
      entries: groupEntries,
    })),
    entryCount: entries.length,
  };
}
