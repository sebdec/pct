import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { posix } from "node:path";

import {
  DOMParser,
  type Document as XmlDocument,
  type Element as XmlElement,
  type Node as XmlNode,
} from "@xmldom/xmldom";
import { unzipSync } from "fflate";

export interface OoxmlRelationship {
  id: string;
  target: string;
  targetMode?: string;
  type: string;
}

export interface OoxmlImageReference {
  relationshipId: string;
  mediaPath: string;
}

export interface OoxmlParagraph {
  kind: "paragraph";
  blockIndex: number;
  style: string;
  text: string;
  markdown: string;
  images: OoxmlImageReference[];
}

export interface OoxmlTableCell {
  text: string;
  markdown: string;
}

export interface OoxmlTable {
  kind: "table";
  blockIndex: number;
  rows: OoxmlTableCell[][];
  images: OoxmlImageReference[];
}

export type OoxmlBlock = OoxmlParagraph | OoxmlTable;

export interface OoxmlDocument {
  filename: string;
  sha256: string;
  sizeBytes: number;
  blocks: OoxmlBlock[];
  paragraphCount: number;
  tableCount: number;
  documentSectionCount: number;
  relationships: ReadonlyMap<string, OoxmlRelationship>;
  media: ReadonlyMap<string, Uint8Array>;
}

const textDecoder = new TextDecoder("utf-8", { fatal: true });

function childElements(node: XmlNode): XmlElement[] {
  const elements: XmlElement[] = [];

  for (let index = 0; index < node.childNodes.length; index += 1) {
    const child = node.childNodes.item(index);
    if (child?.nodeType === 1) elements.push(child as XmlElement);
  }

  return elements;
}

function descendants(element: XmlElement, localName: string): XmlElement[] {
  const matches: XmlElement[] = [];
  const visit = (node: XmlElement): void => {
    for (const child of childElements(node)) {
      if (child.localName === localName) matches.push(child);
      visit(child);
    }
  };

  visit(element);
  return matches;
}

function requireArchiveEntry(
  archive: Record<string, Uint8Array>,
  path: string,
): Uint8Array {
  const value = archive[path];
  if (!value) throw new Error(`The DOCX archive is missing ${path}.`);
  return value;
}

function parseXml(bytes: Uint8Array, path: string): XmlDocument {
  try {
    return new DOMParser().parseFromString(
      textDecoder.decode(bytes),
      "text/xml",
    );
  } catch (error) {
    throw new Error(`Unable to parse ${path} as XML.`, { cause: error });
  }
}

function parseRelationships(
  archive: Record<string, Uint8Array>,
): Map<string, OoxmlRelationship> {
  const path = "word/_rels/document.xml.rels";
  const document = parseXml(requireArchiveEntry(archive, path), path);
  const relationships = new Map<string, OoxmlRelationship>();

  for (const element of Array.from(
    document.getElementsByTagName("Relationship"),
  )) {
    const id = element.getAttribute("Id");
    const rawTarget = element.getAttribute("Target");
    const type = element.getAttribute("Type");
    if (!id || !rawTarget || !type) {
      throw new Error("A document relationship is missing Id, Target or Type.");
    }

    const targetMode = element.getAttribute("TargetMode") ?? undefined;
    const target =
      targetMode === "External"
        ? rawTarget
        : posix.normalize(posix.join("word", rawTarget));

    relationships.set(id, { id, target, targetMode, type });
  }

  return relationships;
}

function isEnabledProperty(run: XmlElement, property: "b" | "i"): boolean {
  const runProperties = childElements(run).find(
    (element) => element.localName === "rPr",
  );
  const value = runProperties
    ? childElements(runProperties).find(
        (element) => element.localName === property,
      )
    : undefined;
  if (!value) return false;

  return !["0", "false", "off"].includes(
    (value.getAttribute("w:val") ?? "true").toLowerCase(),
  );
}

function runText(run: XmlElement): string {
  const values: string[] = [];
  const visit = (element: XmlElement): void => {
    if (element.localName === "t") {
      values.push(element.textContent ?? "");
      return;
    }
    if (element.localName === "tab") {
      values.push("\t");
      return;
    }
    if (element.localName === "br" || element.localName === "cr") {
      values.push("\n");
      return;
    }
    if (element.localName === "noBreakHyphen") {
      values.push("‑");
      return;
    }
    if (element.localName === "softHyphen") {
      values.push("\u00ad");
      return;
    }

    for (const child of childElements(element)) visit(child);
  };

  visit(run);
  return values.join("");
}

interface InlineContent {
  text: string;
  markdown: string;
}

function wrapEmphasis(text: string, marker: string): string {
  const match = text.match(/^(\s*)([\s\S]*?)(\s*)$/u);
  if (!match || !match[2]) return text;
  return `${match[1]}${marker}${match[2]}${marker}${match[3]}`;
}

function paragraphInlineContent(
  paragraph: XmlElement,
  relationships: ReadonlyMap<string, OoxmlRelationship>,
): InlineContent {
  const plainParts: string[] = [];
  const markdownParts: string[] = [];

  const visit = (element: XmlElement): void => {
    if (element.localName === "r") {
      const text = runText(element);
      if (!text) return;

      const bold = isEnabledProperty(element, "b");
      const italic = isEnabledProperty(element, "i");
      const marker = bold && italic ? "***" : bold ? "**" : italic ? "*" : "";
      plainParts.push(text);
      markdownParts.push(marker ? wrapEmphasis(text, marker) : text);
      return;
    }

    if (element.localName === "hyperlink") {
      const relationshipId = element.getAttribute("r:id");
      const anchor = element.getAttribute("w:anchor");
      const target = relationshipId
        ? relationships.get(relationshipId)?.target
        : anchor
          ? `#${anchor}`
          : undefined;
      const markdownStart = markdownParts.length;
      for (const child of childElements(element)) visit(child);
      if (target && markdownParts.length > markdownStart) {
        const label = markdownParts.splice(markdownStart).join("");
        markdownParts.push(`[${label}](${target})`);
      }
      return;
    }

    for (const child of childElements(element)) visit(child);
  };

  for (const child of childElements(paragraph)) {
    if (child.localName !== "pPr") visit(child);
  }

  return {
    text: plainParts.join("").trim(),
    markdown: markdownParts.join("").trim(),
  };
}

function imageReferences(
  element: XmlElement,
  relationships: ReadonlyMap<string, OoxmlRelationship>,
): OoxmlImageReference[] {
  return descendants(element, "blip").map((blip) => {
    const relationshipId = blip.getAttribute("r:embed");
    if (!relationshipId) {
      throw new Error("An embedded image has no r:embed relationship ID.");
    }
    const relationship = relationships.get(relationshipId);
    if (!relationship || !relationship.type.endsWith("/image")) {
      throw new Error(`Unmatched image relationship ${relationshipId}.`);
    }

    return { relationshipId, mediaPath: relationship.target };
  });
}

function parseParagraph(
  element: XmlElement,
  blockIndex: number,
  relationships: ReadonlyMap<string, OoxmlRelationship>,
): OoxmlParagraph {
  const content = paragraphInlineContent(element, relationships);
  const properties = childElements(element).find(
    (child) => child.localName === "pPr",
  );
  const styleElement = properties
    ? childElements(properties).find((child) => child.localName === "pStyle")
    : undefined;
  const style = styleElement?.getAttribute("w:val") ?? "";
  const numbered = properties
    ? descendants(properties, "numPr").length > 0
    : false;

  return {
    kind: "paragraph",
    blockIndex,
    style,
    text: content.text,
    markdown:
      numbered && content.markdown ? `- ${content.markdown}` : content.markdown,
    images: imageReferences(element, relationships),
  };
}

function parseTable(
  element: XmlElement,
  blockIndex: number,
  relationships: ReadonlyMap<string, OoxmlRelationship>,
): OoxmlTable {
  const rows = childElements(element)
    .filter((child) => child.localName === "tr")
    .map((row) =>
      childElements(row)
        .filter((child) => child.localName === "tc")
        .map((cell) => {
          const contents = childElements(cell)
            .filter((child) => child.localName === "p")
            .map((paragraph) =>
              paragraphInlineContent(paragraph, relationships),
            )
            .filter(({ text, markdown }) => text || markdown);

          return {
            text: contents
              .map(({ text }) => text)
              .join("\n")
              .trim(),
            markdown: contents
              .map(({ markdown }) => markdown)
              .join("<br>")
              .trim(),
          };
        }),
    );

  return {
    kind: "table",
    blockIndex,
    rows,
    images: imageReferences(element, relationships),
  };
}

export async function readOoxml(
  inputPath: string,
  approvedSha256: string,
): Promise<OoxmlDocument> {
  const source = await readFile(inputPath);
  const sha256 = createHash("sha256").update(source).digest("hex");
  if (sha256 !== approvedSha256) {
    throw new Error(
      `Source SHA-256 mismatch. Expected ${approvedSha256} and received ${sha256}.`,
    );
  }

  const archive = unzipSync(source);
  const relationships = parseRelationships(archive);
  const documentPath = "word/document.xml";
  const document = parseXml(
    requireArchiveEntry(archive, documentPath),
    documentPath,
  );
  const body = Array.from(document.getElementsByTagName("w:body"))[0];
  if (!body) throw new Error("word/document.xml has no w:body element.");

  const bodyElements = childElements(body);
  const unsupportedBlock = bodyElements.find(
    (element) =>
      element.localName !== "p" &&
      element.localName !== "tbl" &&
      element.localName !== "sectPr",
  );
  if (unsupportedBlock) {
    throw new Error(
      `Unsupported top-level Word block ${unsupportedBlock.localName ?? "unknown"}.`,
    );
  }
  const blockElements = bodyElements.filter(
    (element) => element.localName === "p" || element.localName === "tbl",
  );
  const blocks = blockElements.map((element, blockIndex) => {
    if (element.localName === "p") {
      return parseParagraph(element, blockIndex, relationships);
    }
    if (element.localName === "tbl") {
      return parseTable(element, blockIndex, relationships);
    }
    throw new Error(`Unsupported top-level Word block ${element.localName}.`);
  });
  const media = new Map<string, Uint8Array>(
    Object.entries(archive).filter(([path]) => path.startsWith("word/media/")),
  );

  return {
    filename: inputPath.split(/[\\/]/).at(-1) ?? inputPath,
    sha256,
    sizeBytes: source.byteLength,
    blocks,
    paragraphCount: blocks.filter(({ kind }) => kind === "paragraph").length,
    tableCount: blocks.filter(({ kind }) => kind === "table").length,
    documentSectionCount: document.getElementsByTagName("w:sectPr").length,
    relationships,
    media,
  };
}
