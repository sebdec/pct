import { getCollection, type CollectionEntry } from "astro:content";

import type { Locale } from "./locales.ts";
import {
  buildJournalNavigatorItems,
  buildJournalViewModels,
  type JournalNavigatorItem,
  type JournalPageViewModel,
} from "./journalViewModel.ts";
import type { TrailSection } from "./schemas.ts";

export interface JournalPageProps {
  locale: Locale;
  page: JournalPageViewModel;
  journalEntry: CollectionEntry<"journal">;
  navigatorEntries: readonly JournalNavigatorItem[];
  sections: readonly TrailSection[];
}

export async function getJournalStaticPaths(locale: Locale) {
  const [
    dayEntries,
    journalEntries,
    photoEntries,
    mediaAssetEntries,
    localizedPhotoEntries,
    sectionEntries,
  ] = await Promise.all([
    getCollection("days"),
    getCollection("journal"),
    getCollection("photos"),
    getCollection("mediaAssets"),
    getCollection("media"),
    getCollection("sections"),
  ]);
  const localizedEntries = journalEntries.filter(
    ({ data }) => data.locale === locale,
  );
  const pages = buildJournalViewModels({
    days: dayEntries.map(({ data }) => data),
    journalEntries: localizedEntries.map(({ data }) => data),
    photos: photoEntries.map(({ data }) => data),
    mediaAssets: mediaAssetEntries.map(({ data }) => data),
    localizedPhotos: localizedPhotoEntries.map(({ data }) => data),
    locale,
  });
  const entryByDayId = new Map(
    localizedEntries.map((entry) => [entry.data.dayId, entry]),
  );
  const navigatorEntries = buildJournalNavigatorItems(pages);
  const sectionById = new Map(
    sectionEntries.map(({ data }) => [data.id, data]),
  );

  return pages.map((page) => {
    const journalEntry = entryByDayId.get(page.day.id);
    if (!journalEntry) {
      throw new Error(`Missing ${locale} entry for ${page.day.id}.`);
    }

    return {
      params: { dayId: page.day.id },
      props: {
        locale,
        page,
        journalEntry,
        navigatorEntries,
        sections:
          page.day.kind === "trail"
            ? page.day.sectionIds.map((sectionId) => {
                const section = sectionById.get(sectionId);

                if (!section) {
                  throw new Error(
                    `Missing section ${sectionId} for ${page.day.id}.`,
                  );
                }

                return section;
              })
            : [],
      } satisfies JournalPageProps,
    };
  });
}
