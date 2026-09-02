import type {
  GearItem,
  GearProductLink,
  LocalizedGearEntry,
} from "../content/schemas.ts";
import type { Locale } from "../content/locales.ts";

const categoryPresentation = [
  {
    id: "big-4",
    labels: { en: "Big 4", fr: "Big 4" },
    color: "var(--pct-color-pine-glow)",
  },
  {
    id: "vetements",
    labels: { en: "Clothing", fr: "Vêtements" },
    color: "var(--pct-color-desert-dust)",
  },
  {
    id: "eau-et-cuisine",
    labels: { en: "Water and cooking", fr: "Eau et cuisine" },
    color: "var(--pct-color-oregon-lake)",
  },
  {
    id: "electronique",
    labels: { en: "Electronics", fr: "Électronique" },
    color: "var(--pct-color-washington-mist)",
  },
  {
    id: "hygiene",
    labels: { en: "Hygiene", fr: "Hygiène" },
    color: "var(--pct-color-muted)",
  },
  {
    id: "premiers-soins",
    labels: { en: "First aid", fr: "Premiers soins" },
    color: "var(--pct-color-norcal-forest)",
  },
  {
    id: "divers",
    labels: { en: "Miscellaneous", fr: "Divers" },
    color: "var(--pct-color-copy)",
  },
  {
    id: "sierra",
    labels: { en: "Sierra", fr: "Sierra" },
    color: "var(--pct-color-sierra-snow)",
  },
] as const;

interface GearListItem {
  id: string;
  name: string;
  detail?: string;
  productUrl?: string;
  weightGrams: number;
}

export interface GearCategory {
  id: string;
  label: string;
  color: string;
  items: GearListItem[];
  weightGrams: number;
  temporary: boolean;
}

interface GearViewModel {
  categories: GearCategory[];
  itemCount: number;
  documentedWeightGrams: number;
  sierraWeightGrams: number;
}

export function buildGearViewModel(
  items: readonly GearItem[],
  localizedEntries: readonly LocalizedGearEntry[],
  productLinks: readonly GearProductLink[] = [],
  locale: Locale = "fr",
): GearViewModel {
  const localizedByItemId = new Map(
    localizedEntries.map((entry) => [entry.gearItemId, entry]),
  );
  const publishedItems = items.filter(({ published }) => published);
  const productUrlByItemId = new Map(
    productLinks.map(({ gearItemId, url }) => [gearItemId, url]),
  );

  const categories = categoryPresentation.map(({ id, labels, color }) => {
    const categoryItems = publishedItems
      .filter(({ categoryId }) => categoryId === id)
      .toSorted((left, right) => left.order - right.order)
      .map((item) => {
        const localized = localizedByItemId.get(item.id);

        if (!localized) {
          throw new Error("Missing localized gear entry for " + item.id + ".");
        }

        return {
          id: item.id,
          name: localized.name,
          detail: localized.detail,
          productUrl: productUrlByItemId.get(item.id),
          weightGrams: item.weightGrams,
        };
      });

    return {
      id,
      label: labels[locale],
      color,
      items: categoryItems,
      weightGrams: categoryItems.reduce(
        (total, item) => total + item.weightGrams,
        0,
      ),
      temporary: id === "sierra",
    };
  });

  const representedIds = new Set(
    categories.flatMap(({ items }) => items.map(({ id }) => id)),
  );
  const unrepresentedItems = publishedItems.filter(
    ({ id }) => !representedIds.has(id),
  );

  if (unrepresentedItems.length > 0) {
    throw new Error(
      "Missing gear category presentation for " +
        unrepresentedItems.map(({ id }) => id).join(", ") +
        ".",
    );
  }

  return {
    categories,
    itemCount: publishedItems.length,
    documentedWeightGrams: publishedItems.reduce(
      (total, item) => total + item.weightGrams,
      0,
    ),
    sierraWeightGrams:
      categories.find(({ id }) => id === "sierra")?.weightGrams ?? 0,
  };
}
