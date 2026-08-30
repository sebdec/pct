import type {
  GearItem,
  GearProductLink,
  LocalizedGearEntry,
} from "../content/schemas.ts";

const categoryPresentation = [
  { id: "big-4", label: "Big 4" },
  { id: "vetements", label: "Vêtements" },
  { id: "eau-et-cuisine", label: "Eau et cuisine" },
  { id: "electronique", label: "Électronique" },
  { id: "hygiene", label: "Hygiène" },
  { id: "premiers-soins", label: "Premiers soins" },
  { id: "divers", label: "Divers" },
  { id: "sierra", label: "Sierra" },
] as const;

function sourceOrder(item: GearItem): number {
  const rowReference = item.sourceRefs.find(({ detail }) =>
    detail?.includes("row="),
  );
  const row = rowReference?.detail?.match(/(?:^|; )row=(\d+)/)?.[1];

  return row ? Number(row) : Number.MAX_SAFE_INTEGER;
}

export interface GearListItem {
  id: string;
  name: string;
  detail?: string;
  productUrl?: string;
  weightGrams: number;
}

export interface GearCategory {
  id: string;
  label: string;
  items: GearListItem[];
  weightGrams: number;
  temporary: boolean;
}

export interface GearViewModel {
  categories: GearCategory[];
  itemCount: number;
  documentedWeightGrams: number;
  sierraWeightGrams: number;
}

export function buildGearViewModel(
  items: readonly GearItem[],
  localizedEntries: readonly LocalizedGearEntry[],
  productLinks: readonly GearProductLink[] = [],
): GearViewModel {
  const localizedByItemId = new Map(
    localizedEntries.map((entry) => [entry.gearItemId, entry]),
  );
  const publishedItems = items.filter(({ published }) => published);
  const productUrlByItemId = new Map(
    productLinks.map(({ gearItemId, url }) => [gearItemId, url]),
  );

  const categories = categoryPresentation.map(({ id, label }) => {
    const categoryItems = publishedItems
      .filter(({ categoryId }) => categoryId === id)
      .toSorted((left, right) => sourceOrder(left) - sourceOrder(right))
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
      label,
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

export function formatGearWeight(weightGrams: number): string {
  if (weightGrams < 1_000) {
    return weightGrams.toLocaleString("fr-FR") + " g";
  }

  return (
    (weightGrams / 1_000).toLocaleString("fr-FR", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }) + " kg"
  );
}
