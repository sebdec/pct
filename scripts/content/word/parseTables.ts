import type { OoxmlBlock, OoxmlTable } from "./readOoxml.ts";

export interface ParsedSectionReference {
  code: string;
  properName: string;
}

export interface TrailMetadata {
  regionLabel: string;
  sections: ParsedSectionReference[];
  mileStart: number;
  mileEnd: number;
  declaredMiles: number;
  kilometerStart: number;
  kilometerEnd: number;
  declaredKilometers: number;
  ascentMeters: number;
  descentMeters: number;
  locationLabel: string;
}

export interface PostTrailMetadata {
  regionLabel: string;
  locationLabel: string;
}

export interface GearTableRow {
  category: string;
  name: string;
  detail?: string;
  weightGrams: number;
  rowIndex: number;
}

export interface GlossaryTableRow {
  term: string;
  definition: string;
  rowIndex: number;
}

const milesToKilometers = 1.609344;
const numberPattern = "[+\\-]?[0-9][0-9\\s\\u00a0\\u202f]*(?:[.,][0-9]+)?";

export function parseFrenchNumber(value: string): number {
  const normalized = value.replace(/[\s\u00a0\u202f]/g, "").replace(",", ".");
  const number = Number(normalized);
  if (!Number.isFinite(number)) {
    throw new Error(`Unable to parse French number "${value}".`);
  }
  return number;
}

function rowValue(table: OoxmlTable, label: RegExp): string {
  const row = table.rows.find(([first]) => first && label.test(first.text));
  const value = row?.[1]?.text;
  if (!value) {
    throw new Error(
      `Table at block ${table.blockIndex} is missing ${label.source}.`,
    );
  }
  return value;
}

function parseRange(
  value: string,
  unit: "mi" | "km",
): [number, number, number] {
  const match = value.match(
    new RegExp(
      `(${numberPattern})\\s+à\\s+(${numberPattern})\\s+·\\s+(${numberPattern})\\s+${unit}\\s+parcourus`,
      "u",
    ),
  );
  if (!match) throw new Error(`Unexpected ${unit} range "${value}".`);

  return [
    parseFrenchNumber(match[1]),
    parseFrenchNumber(match[2]),
    parseFrenchNumber(match[3]),
  ];
}

function parseElevation(value: string): [number, number] {
  const match = value.match(
    new RegExp(
      `\\+?(${numberPattern})\\s*m\\s*ascent\\s*·\\s*-?(${numberPattern})\\s*m\\s*descent`,
      "u",
    ),
  );
  if (!match) throw new Error(`Unexpected elevation value "${value}".`);

  return [
    Math.abs(parseFrenchNumber(match[1])),
    Math.abs(parseFrenchNumber(match[2])),
  ];
}

function assertClose(
  actual: number,
  expected: number,
  tolerance: number,
  message: string,
): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}: expected ${expected} and received ${actual}.`);
  }
}

export function isTrailMetadataTable(table: OoxmlTable): boolean {
  const labels = table.rows.map(([cell]) => cell?.text ?? "");
  return (
    labels.some((label) => label.includes("Région")) &&
    labels.some((label) => label.includes("Miles")) &&
    labels.some((label) => label.includes("Kilomètres"))
  );
}

export function parseTrailMetadata(table: OoxmlTable): TrailMetadata {
  if (!isTrailMetadataTable(table)) {
    throw new Error(
      `Table at block ${table.blockIndex} is not trail metadata.`,
    );
  }

  const sectionValue = rowValue(table, /Section/u);
  const sections = Array.from(
    sectionValue.matchAll(/([A-Z])\s*\(([^)]+)\)/gu),
    (match) => ({ code: match[1], properName: match[2].trim() }),
  );
  if (sections.length === 0) {
    throw new Error(
      `No PCT section found in metadata at block ${table.blockIndex}.`,
    );
  }

  const [mileStart, mileEnd, declaredMiles] = parseRange(
    rowValue(table, /Miles/u),
    "mi",
  );
  const [kilometerStart, kilometerEnd, declaredKilometers] = parseRange(
    rowValue(table, /Kilomètres/u),
    "km",
  );
  const [ascentMeters, descentMeters] = parseElevation(
    rowValue(table, /Dénivelé/u),
  );

  assertClose(
    declaredMiles,
    mileEnd - mileStart,
    0.001,
    `Declared mile distance at block ${table.blockIndex}`,
  );
  const kilometerChecks: Array<[number, number, string]> = [
    [kilometerStart, mileStart * milesToKilometers, "start"],
    [kilometerEnd, mileEnd * milesToKilometers, "end"],
    [declaredKilometers, declaredMiles * milesToKilometers, "distance"],
  ];
  for (const [actual, expected, label] of kilometerChecks) {
    assertClose(
      actual,
      expected,
      0.11,
      `Displayed kilometer ${label} at block ${table.blockIndex}`,
    );
  }

  return {
    regionLabel: rowValue(table, /Région/u),
    sections,
    mileStart,
    mileEnd,
    declaredMiles,
    kilometerStart,
    kilometerEnd,
    declaredKilometers,
    ascentMeters,
    descentMeters,
    locationLabel: rowValue(table, /Lieu/u),
  };
}

export function isPostTrailMetadataTable(table: OoxmlTable): boolean {
  const labels = table.rows.map(([cell]) => cell?.text ?? "");
  return (
    table.rows.length === 2 &&
    labels.some((label) => label.includes("Région")) &&
    labels.some((label) => label.includes("Lieu"))
  );
}

export function parsePostTrailMetadata(table: OoxmlTable): PostTrailMetadata {
  if (!isPostTrailMetadataTable(table)) {
    throw new Error(
      `Table at block ${table.blockIndex} is not post-trail metadata.`,
    );
  }

  return {
    regionLabel: rowValue(table, /Région/u),
    locationLabel: rowValue(table, /Lieu/u),
  };
}

export function findTableByHeader(
  blocks: readonly OoxmlBlock[],
  headers: readonly string[],
): OoxmlTable {
  const table = blocks.find(
    (block): block is OoxmlTable =>
      block.kind === "table" &&
      headers.every((header, index) => block.rows[0]?.[index]?.text === header),
  );
  if (!table)
    throw new Error(`Unable to find table with headers ${headers.join(", ")}.`);
  return table;
}

export function parseGearTable(table: OoxmlTable): GearTableRow[] {
  const header = table.rows[0]?.map(({ text }) => text);
  if (header?.join("|") !== "Catégorie|Équipement|Détail|Poids") {
    throw new Error(
      `Unexpected gear table header at block ${table.blockIndex}.`,
    );
  }

  return table.rows.slice(1).map((row, index) => {
    const [category, name, detail, weight] = row.map(({ text }) => text);
    if (!category || !name || !weight) {
      throw new Error(
        `Incomplete gear row ${index + 1} at block ${table.blockIndex}.`,
      );
    }
    const weightMatch = weight.match(
      new RegExp(`(${numberPattern})\\s*g`, "u"),
    );
    if (!weightMatch) throw new Error(`Unexpected gear weight "${weight}".`);

    return {
      category,
      name,
      detail: detail || undefined,
      weightGrams: parseFrenchNumber(weightMatch[1]),
      rowIndex: index + 1,
    };
  });
}

export function parseGlossaryTable(table: OoxmlTable): GlossaryTableRow[] {
  const header = table.rows[0]?.map(({ text }) => text);
  if (header?.join("|") !== "Terme|Définition") {
    throw new Error(
      `Unexpected glossary table header at block ${table.blockIndex}.`,
    );
  }

  return table.rows.slice(1).map((row, index) => {
    const [term, definition] = row.map(({ text }) => text);
    if (!term || !definition) {
      throw new Error(
        `Incomplete glossary row ${index + 1} at block ${table.blockIndex}.`,
      );
    }
    return { term, definition, rowIndex: index + 1 };
  });
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

export function renderMarkdownTable(table: OoxmlTable): string {
  const columnCount = Math.max(...table.rows.map((row) => row.length));
  if (columnCount === 0) return "";
  const emptyHeader = `|${Array.from({ length: columnCount }, () => " ").join("|")}|`;
  const separator = `|${Array.from({ length: columnCount }, () => "---").join("|")}|`;
  const rows = table.rows.map(
    (row) =>
      `|${Array.from({ length: columnCount }, (_, index) =>
        escapeTableCell(row[index]?.markdown ?? ""),
      ).join("|")}|`,
  );

  return [emptyHeader, separator, ...rows].join("\n");
}
