import { describe, expect, it } from "vitest";
import { z } from "astro/zod";

import localizedGlossary from "../../content/glossary/fr.json";
import glossaryConcepts from "../../data/glossary/concepts.json";
import {
  glossaryConceptSchema,
  localizedGlossaryEntrySchema,
} from "../content/schemas.ts";
import { buildGlossaryViewModel } from "./glossaryViewModel.ts";

describe("buildGlossaryViewModel", () => {
  const concepts = z.array(glossaryConceptSchema).parse(glossaryConcepts);
  const localizedEntries = z
    .array(localizedGlossaryEntrySchema)
    .parse(Object.values(localizedGlossary));
  const viewModel = buildGlossaryViewModel(concepts, localizedEntries);

  it("joins every published concept with its French definition", () => {
    const entries = viewModel.groups.flatMap(({ entries }) => entries);

    expect(viewModel.entryCount).toBe(39);
    expect(entries).toHaveLength(39);
    expect(entries.find(({ id }) => id === "trail-angel")).toMatchObject({
      term: "Trail angel",
      definition: expect.stringContaining("bénévolement"),
    });
  });

  it("sorts terms with French locale rules and groups them by initial", () => {
    expect(viewModel.groups[0]?.initial).toBe("A");
    expect(viewModel.groups[0]?.entries[0]?.term).toBe("AT");
    expect(viewModel.groups.at(-1)?.initial).toBe("Z");
    expect(viewModel.groups.at(-1)?.entries.at(-1)?.term).toBe(
      "Zero / Nero day",
    );
  });

  it("fails when a published concept has no localized entry", () => {
    expect(() => buildGlossaryViewModel(concepts, [])).toThrow(
      "Missing fr glossary entry for at.",
    );
  });
});
