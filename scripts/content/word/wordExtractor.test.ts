import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { zipSync } from "fflate";
import { afterEach, describe, expect, it } from "vitest";

import { parseFrenchDateHeading } from "./parseDays.ts";
import { parseMedia } from "./parseMedia.ts";
import { parseTrailMetadata } from "./parseTables.ts";
import {
  readOoxml,
  type OoxmlDocument,
  type OoxmlParagraph,
  type OoxmlTable,
} from "./readOoxml.ts";
import {
  writeGeneratedContent,
  type GeneratedContent,
} from "./writeGeneratedContent.ts";

const encoder = new TextEncoder();
const png = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  ),
);
const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((path) => rm(path, { recursive: true, force: true })),
  );
});

function table(rows: string[][]): OoxmlTable {
  return {
    kind: "table",
    blockIndex: 12,
    rows: rows.map((row) => row.map((text) => ({ text, markdown: text }))),
    images: [],
  };
}

function paragraph(
  blockIndex: number,
  text: string,
  style: string,
): OoxmlParagraph {
  return {
    kind: "paragraph",
    blockIndex,
    text,
    markdown: text,
    style,
    images: [],
  };
}

async function writeSyntheticDocx(
  relationships: string,
  additionalBody = "",
): Promise<{ path: string; sha256: string }> {
  const directory = await mkdtemp(join(tmpdir(), "pct-ooxml-test-"));
  temporaryDirectories.push(directory);
  const path = join(directory, "synthetic.docx");
  const documentXml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <w:body>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t xml:space="preserve">Solitude. </w:t></w:r><w:hyperlink r:id="rId2"><w:r><w:t>PCTA</w:t></w:r></w:hyperlink></w:p>
    <w:p><w:r><w:drawing><a:blip r:embed="rId1"/></w:drawing></w:r><w:r><w:drawing><a:blip r:embed="rId1"/></w:drawing></w:r></w:p>
    ${additionalBody}
    <w:sectPr/>
  </w:body>
</w:document>`;
  const archive = zipSync({
    "word/document.xml": encoder.encode(documentXml),
    "word/_rels/document.xml.rels": encoder.encode(relationships),
    "word/media/image1.png": png,
  });
  await writeFile(path, archive);
  return {
    path,
    sha256: createHash("sha256").update(archive).digest("hex"),
  };
}

const validRelationships = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://www.pcta.org/" TargetMode="External"/>
</Relationships>`;

describe("Word journal extraction", () => {
  it("parses the first heading and a post-trail date range", () => {
    expect(parseFrenchDateHeading("🗓️ Jour 1 - Samedi 18 avril 2026")).toEqual({
      date: "2026-04-18",
    });
    expect(
      parseFrenchDateHeading("🗓️ Dimanche 26 au lundi 27 juillet 2026"),
    ).toEqual({ date: "2026-07-26", endDate: "2026-07-27" });
  });

  it("parses French decimals and a day spanning multiple PCT sections", () => {
    const metadata = parseTrailMetadata(
      table([
        ["📍 Région:", "Southern California (Desert)"],
        [
          "🗺️ Section:",
          "A (Mexican Border → Warner Springs) → B (Warner Springs → San Gorgonio Pass)",
        ],
        ["🥾 Miles:", "0 à 16,5 · 16,5 mi parcourus"],
        ["🥾 Kilomètres:", "0,0 à 26,6 · 26,6 km parcourus"],
        ["⛰️ Dénivelé:", "+751 m ascent · -684 m descent"],
        ["🏕️ Lieu:", "Campo, Californie"],
      ]),
    );

    expect(metadata.sections).toHaveLength(2);
    expect(metadata.mileEnd).toBe(16.5);
    expect(metadata.locationLabel).toBe("Campo, Californie");
  });

  it("rejects incomplete daily metadata", () => {
    expect(() =>
      parseTrailMetadata(
        table([
          ["📍 Région:", "Oregon"],
          ["🗺️ Section:", "A (California Border → Highway 140)"],
          ["🥾 Miles:", "0 à 10 · 10 mi parcourus"],
          ["🥾 Kilomètres:", "0,0 à 16,1 · 16,1 km parcourus"],
          ["⛰️ Dénivelé:", "+100 m ascent · -50 m descent"],
        ]),
      ),
    ).toThrow("missing Lieu");
  });

  it("reads ordered OOXML text, emphasis, hyperlinks and reused image relationships", async () => {
    const fixture = await writeSyntheticDocx(validRelationships);
    const document = await readOoxml(fixture.path, fixture.sha256);

    expect(document.blocks).toHaveLength(2);
    expect(document.blocks[0]).toMatchObject({
      text: "Solitude. PCTA",
      markdown: "**Solitude.** [PCTA](https://www.pcta.org/)",
    });
    expect(document.blocks[1]?.images).toHaveLength(2);
    expect(document.media.size).toBe(1);
  });

  it("fails on a wrong source hash before parsing the archive", async () => {
    const fixture = await writeSyntheticDocx(validRelationships);

    await expect(readOoxml(fixture.path, "0".repeat(64))).rejects.toThrow(
      "Source SHA-256 mismatch",
    );
  });

  it("rejects an unmatched embedded media relationship", async () => {
    const fixture = await writeSyntheticDocx(
      `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://www.pcta.org/" TargetMode="External"/></Relationships>`,
    );

    await expect(readOoxml(fixture.path, fixture.sha256)).rejects.toThrow(
      "Unmatched image relationship rId1",
    );
  });

  it("rejects unsupported top-level OOXML blocks", async () => {
    const fixture = await writeSyntheticDocx(
      validRelationships,
      "<w:sdt><w:sdtContent/></w:sdt>",
    );

    await expect(readOoxml(fixture.path, fixture.sha256)).rejects.toThrow(
      "Unsupported top-level Word block sdt",
    );
  });

  it("creates 2 placements for 1 reused media asset", () => {
    const image = {
      relationshipId: "rId1",
      mediaPath: "word/media/image1.png",
    };
    const blocks: OoxmlDocument["blocks"] = [
      paragraph(0, "🔢 Le PCT en quelques chiffres", "Heading2"),
      paragraph(1, "🎒 Équipement", "Heading2"),
      paragraph(2, "Journal", "Heading1"),
      { ...paragraph(3, "", "normal"), images: [image, image] },
    ];
    const document: OoxmlDocument = {
      filename: "PCT 2026 - Sebdec.docx",
      sha256: "0".repeat(64),
      sizeBytes: 1,
      blocks,
      paragraphCount: 4,
      tableCount: 0,
      documentSectionCount: 1,
      relationships: new Map(),
      media: new Map([["word/media/image1.png", png]]),
    };

    const media = parseMedia(document, [
      { dayId: "day-001", startBlock: 3, endBlockExclusive: 4 },
    ]);

    expect(media).toMatchObject({
      placementCount: 2,
      mediaAssetCount: 1,
      reusedMediaAssets: 1,
    });
    expect(media.photos.map(({ id }) => id)).toEqual([
      "photo-001001",
      "photo-001002",
    ]);
    expect(media.photos[0]?.assetKey).toBe(media.photos[1]?.assetKey);
  });

  it("scopes pre-journal placement IDs to their supporting page", () => {
    const image = {
      relationshipId: "rId1",
      mediaPath: "word/media/image1.png",
    };
    const blocks: OoxmlDocument["blocks"] = [
      { ...paragraph(0, "", "normal"), images: [image] },
      paragraph(1, "🔢 Le PCT en quelques chiffres", "Heading2"),
      { ...paragraph(2, "", "normal"), images: [image] },
      paragraph(3, "🎒 Équipement", "Heading2"),
      paragraph(4, "Journal", "Heading1"),
    ];
    const document: OoxmlDocument = {
      filename: "PCT 2026 - Sebdec.docx",
      sha256: "0".repeat(64),
      sizeBytes: 1,
      blocks,
      paragraphCount: 5,
      tableCount: 0,
      documentSectionCount: 1,
      relationships: new Map(),
      media: new Map([["word/media/image1.png", png]]),
    };

    const media = parseMedia(document, []);

    expect(media.photos.map(({ id }) => id)).toEqual([
      "photo-introduction-001",
      "photo-analysis-001",
    ]);
  });

  it("does not replace generated files when staging validation fails", async () => {
    const repositoryRoot = await mkdtemp(join(tmpdir(), "pct-writer-test-"));
    temporaryDirectories.push(repositoryRoot);
    const target = join(repositoryRoot, "src/data/trail/regions.json");
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, "sentinel\n", "utf8");
    const incompleteContent = {
      sourceDocuments: [],
      regions: [],
      sections: [],
      days: [],
      journalEntries: [
        {
          dayId: "day-001",
          locale: "fr",
          title: "Entry",
          locationLabel: "Location",
          photoIds: [],
          sourceRefs: [],
        },
      ],
      journalBodies: new Map(),
      photos: [],
      glossaryConcepts: [],
      localizedGlossaryEntries: [],
      gearItems: [],
      localizedGearEntries: [],
      supportingPages: [],
      supportingBodies: new Map(),
      report: {
        sourceDocumentId: "pct-source",
        generator: "test",
        counts: {
          trailEntries: 0,
          postTrailEntries: 0,
          gearItems: 0,
          glossaryConcepts: 0,
          photoPlacements: 0,
          mediaAssets: 0,
          reusedMediaAssets: 0,
          trailPhotoPlacements: 0,
          postTrailPhotoPlacements: 0,
          pagePhotoPlacements: 0,
          trailEntriesWithoutPhotos: 0,
        },
        validations: {
          sourceHashVerified: true,
          structuralCountsVerified: true,
          declaredMilesVerified: true,
          displayedKilometersVerified: true,
          trailMileageContinuous: true,
          mediaRelationshipsMatched: true,
          contentModelValidated: true,
        },
        structuralExceptions: [],
      },
    } satisfies GeneratedContent;

    await expect(
      writeGeneratedContent(repositoryRoot, incompleteContent),
    ).rejects.toThrow("Missing body for day-001");
    expect(await readFile(target, "utf8")).toBe("sentinel\n");
  });
});
