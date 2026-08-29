import type {
  GearItem,
  GlossaryConcept,
  LocalizedGearEntry,
  LocalizedGlossaryEntry,
  Region,
  SourceReference,
  SupportingPage,
} from "../../../src/lib/content/schemas.ts";
import { regionIdFromLabel, slugify } from "./parseDays.ts";
import {
  findTableByHeader,
  parseGearTable,
  parseGlossaryTable,
  renderMarkdownTable,
} from "./parseTables.ts";
import type {
  OoxmlBlock,
  OoxmlDocument,
  OoxmlParagraph,
  OoxmlTable,
} from "./readOoxml.ts";

export interface ParsedEditorial {
  regions: Region[];
  gearItems: GearItem[];
  localizedGearEntries: LocalizedGearEntry[];
  glossaryConcepts: GlossaryConcept[];
  localizedGlossaryEntries: LocalizedGlossaryEntry[];
  supportingPages: SupportingPage[];
  supportingBodies: ReadonlyMap<string, string>;
}

interface PageDefinition {
  pageId: string;
  kind: SupportingPage["kind"];
  title: string;
  startHeading: string;
  endHeading?: string;
  excludedTableBlocks?: ReadonlySet<number>;
}

const regionDefinitions = [
  {
    heading: "Section Southern California - Desert",
    id: "desert",
    order: 1,
    trailMarkKey: "cactus",
  },
  {
    heading: "Sierra Nevada",
    id: "sierra",
    order: 2,
    trailMarkKey: "mountain",
  },
  {
    heading: "Northern California",
    id: "norcal",
    order: 3,
    trailMarkKey: "bear",
  },
  {
    heading: "Oregon",
    id: "oregon",
    order: 4,
    trailMarkKey: "lake-mosquito",
  },
  {
    heading: "Washington",
    id: "washington",
    order: 5,
    trailMarkKey: "mountain-goat",
  },
] as const;

function sourceReference(
  filename: string,
  block: OoxmlBlock,
  detail?: string,
): SourceReference {
  return {
    document: filename,
    blockType:
      block.kind === "table"
        ? "table"
        : block.style.match(/^Heading/u)
          ? "heading"
          : "paragraph",
    blockIndex: block.blockIndex,
    ...(detail ? { detail } : {}),
  };
}

function findHeading(
  blocks: readonly OoxmlBlock[],
  text: string,
): OoxmlParagraph {
  const heading = blocks.find(
    (block): block is OoxmlParagraph =>
      block.kind === "paragraph" && block.text === text,
  );
  if (!heading) throw new Error(`Unable to find source heading "${text}".`);
  return heading;
}

function blockRange(
  blocks: readonly OoxmlBlock[],
  start: number,
  end: number,
): OoxmlBlock[] {
  return blocks.filter(
    ({ blockIndex }) => blockIndex >= start && blockIndex < end,
  );
}

function renderPageBody(
  blocks: readonly OoxmlBlock[],
  firstHeadingBlock: number,
  excludedTableBlocks: ReadonlySet<number>,
): string {
  const values: string[] = [];

  for (const block of blocks) {
    if (block.kind === "paragraph") {
      if (!block.markdown || block.blockIndex === firstHeadingBlock) continue;
      if (/^Heading\s*2$/u.test(block.style)) {
        values.push(`## ${block.text}`);
      } else if (!/^Heading/u.test(block.style)) {
        values.push(block.markdown);
      }
      continue;
    }

    if (
      !excludedTableBlocks.has(block.blockIndex) &&
      block.rows.some((row) => row.some(({ text }) => Boolean(text)))
    ) {
      values.push(renderMarkdownTable(block));
    }
  }

  return values.join("\n\n");
}

function buildSupportingPage(
  document: OoxmlDocument,
  definition: PageDefinition,
): { page: SupportingPage; body: string } {
  const start = findHeading(document.blocks, definition.startHeading);
  const end = definition.endHeading
    ? findHeading(document.blocks, definition.endHeading).blockIndex
    : document.blocks.length;
  const blocks = blockRange(document.blocks, start.blockIndex, end);
  const excluded = definition.excludedTableBlocks ?? new Set<number>();
  const referencedBlocks = blocks.filter((block) => {
    if (block.kind === "paragraph") return Boolean(block.text);
    return (
      !excluded.has(block.blockIndex) &&
      block.rows.some((row) => row.some(({ text }) => Boolean(text)))
    );
  });

  return {
    page: {
      pageId: definition.pageId,
      locale: "fr",
      kind: definition.kind,
      title: definition.title,
      published: true,
      sourceRefs: referencedBlocks.map((block) =>
        sourceReference(document.filename, block),
      ),
    },
    body: renderPageBody(blocks, start.blockIndex, excluded),
  };
}

function uniqueId(base: string, occurrences: Map<string, number>): string {
  const count = (occurrences.get(base) ?? 0) + 1;
  occurrences.set(base, count);
  return count === 1 ? base : `${base}-${count}`;
}

export function parseEditorial(document: OoxmlDocument): ParsedEditorial {
  const gearTable = findTableByHeader(document.blocks, [
    "Catégorie",
    "Équipement",
    "Détail",
    "Poids",
  ]);
  const glossaryTable = findTableByHeader(document.blocks, [
    "Terme",
    "Définition",
  ]);
  const peopleHeading = findHeading(
    document.blocks,
    "🤝 Hikers rencontrés sur le chemin (liste non exhaustive)",
  );
  const journalHeading = findHeading(document.blocks, "Journal");
  const peopleTable = document.blocks.find(
    (block): block is OoxmlTable =>
      block.kind === "table" &&
      block.blockIndex > peopleHeading.blockIndex &&
      block.blockIndex < journalHeading.blockIndex &&
      block.rows.length === 14 &&
      block.rows.every((row) => row.length === 3),
  );
  if (!peopleTable)
    throw new Error("Unable to identify the 14 by 3 people table.");

  const regions: Region[] = regionDefinitions.map((definition) => {
    const heading = findHeading(document.blocks, definition.heading);
    if (regionIdFromLabel(definition.heading) !== definition.id) {
      throw new Error(`Region mapping drift for ${definition.heading}.`);
    }
    return {
      id: definition.id,
      order: definition.order,
      trailMarkKey: definition.trailMarkKey,
      published: true,
      sourceRefs: [sourceReference(document.filename, heading)],
    };
  });

  const gearIdOccurrences = new Map<string, number>();
  const gearItems: GearItem[] = [];
  const localizedGearEntries: LocalizedGearEntry[] = [];
  for (const row of parseGearTable(gearTable)) {
    const id = uniqueId(
      `gear-${slugify(row.category)}-${slugify(row.name)}`,
      gearIdOccurrences,
    );
    const sourceRefs = [
      sourceReference(
        document.filename,
        gearTable,
        `row=${row.rowIndex}; category=${row.category}; item=${row.name}`,
      ),
    ];
    gearItems.push({
      id,
      categoryId: slugify(row.category),
      weightGrams: row.weightGrams,
      ...(row.category === "Sierra" ? { tripPhase: "sierra" as const } : {}),
      published: true,
      sourceRefs,
    });
    localizedGearEntries.push({
      gearItemId: id,
      locale: "fr",
      name: row.name,
      ...(row.detail ? { detail: row.detail } : {}),
    });
  }

  const glossaryConcepts: GlossaryConcept[] = [];
  const localizedGlossaryEntries: LocalizedGlossaryEntry[] = [];
  const glossaryIds = new Set<string>();
  for (const row of parseGlossaryTable(glossaryTable)) {
    const id = slugify(row.term);
    if (glossaryIds.has(id)) throw new Error(`Duplicate glossary ID ${id}.`);
    glossaryIds.add(id);
    glossaryConcepts.push({
      id,
      published: true,
      sourceRefs: [
        sourceReference(
          document.filename,
          glossaryTable,
          `row=${row.rowIndex}; term=${row.term}`,
        ),
      ],
    });
    localizedGlossaryEntries.push({
      conceptId: id,
      locale: "fr",
      term: row.term,
      definition: row.definition,
      aliases: [],
    });
  }

  const pageDefinitions: PageDefinition[] = [
    {
      pageId: "introduction",
      kind: "introduction",
      title: "Introduction",
      startHeading: "Introduction",
      endHeading: "🔢 Le PCT en quelques chiffres",
    },
    {
      pageId: "analysis",
      kind: "analysis",
      title: "Le PCT en quelques chiffres",
      startHeading: "🔢 Le PCT en quelques chiffres",
      endHeading: "🎒 Équipement",
    },
    {
      pageId: "gear",
      kind: "gear",
      title: "Équipement",
      startHeading: "🎒 Équipement",
      endHeading: "📖 Glossaire",
      excludedTableBlocks: new Set([gearTable.blockIndex]),
    },
    {
      pageId: "people",
      kind: "people",
      title: "Hikers rencontrés sur le chemin (liste non exhaustive)",
      startHeading: "🤝 Hikers rencontrés sur le chemin (liste non exhaustive)",
      endHeading: "Journal",
    },
    {
      pageId: "closing",
      kind: "closing",
      title: "Le mot de la fin",
      startHeading: "Le mot de la fin",
    },
  ];
  const pages = pageDefinitions.map((definition) =>
    buildSupportingPage(document, definition),
  );

  return {
    regions,
    gearItems,
    localizedGearEntries,
    glossaryConcepts,
    localizedGlossaryEntries,
    supportingPages: pages.map(({ page }) => page),
    supportingBodies: new Map(
      pages.map(({ page, body }) => [page.pageId, body]),
    ),
  };
}
