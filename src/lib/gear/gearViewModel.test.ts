import { describe, expect, it } from "vitest";
import { z } from "astro/zod";

import localizedGear from "../../content/gear/fr.json";
import gearItems from "../../data/gear/items.json";
import productLinks from "../../data/gear/product-links.json";
import {
  gearItemSchema,
  gearProductLinkSchema,
  localizedGearEntrySchema,
} from "../content/schemas.ts";
import { buildGearViewModel, formatGearWeight } from "./gearViewModel.ts";

describe("buildGearViewModel", () => {
  const viewModel = buildGearViewModel(
    z.array(gearItemSchema).parse(gearItems),
    z.array(localizedGearEntrySchema).parse(Object.values(localizedGear)),
    z.array(gearProductLinkSchema).parse(productLinks),
  );

  it("keeps every published item in its source order", () => {
    expect(viewModel.itemCount).toBe(66);
    expect(viewModel.categories).toHaveLength(8);
    expect(viewModel.categories.flatMap(({ items }) => items)).toHaveLength(66);
    expect(viewModel.categories[0]?.items[0]?.name).toBe("Sac");
    expect(viewModel.categories[0]?.items[0]?.productUrl).toBe(
      "https://hyperlitemountaingear.com/products/junction",
    );
  });

  it("derives weights from the neutral source data", () => {
    expect(viewModel.documentedWeightGrams).toBe(8_724);
    expect(viewModel.sierraWeightGrams).toBe(1_732);
    expect(formatGearWeight(viewModel.sierraWeightGrams)).toBe("1,73 kg");
    expect(formatGearWeight(866)).toBe("866 g");
  });
});
