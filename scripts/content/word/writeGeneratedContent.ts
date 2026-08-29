import { randomUUID } from "node:crypto";
import {
  access,
  mkdir,
  mkdtemp,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { stringify as stringifyYaml } from "yaml";
import {
  format as formatWithPrettier,
  resolveConfig as resolvePrettierConfig,
  type Options as PrettierOptions,
} from "prettier";

import type {
  Day,
  GearItem,
  GlossaryConcept,
  JournalEntry,
  LocalizedGearEntry,
  LocalizedGlossaryEntry,
  Photo,
  Region,
  SourceDocument,
  SupportingPage,
  TrailSection,
  WordExtractionReport,
} from "../../../src/lib/content/schemas.ts";

export type { WordExtractionReport } from "../../../src/lib/content/schemas.ts";

export interface GeneratedContent {
  sourceDocuments: SourceDocument[];
  regions: Region[];
  sections: TrailSection[];
  days: Day[];
  journalEntries: JournalEntry[];
  journalBodies: ReadonlyMap<string, string>;
  photos: Photo[];
  glossaryConcepts: GlossaryConcept[];
  localizedGlossaryEntries: LocalizedGlossaryEntry[];
  gearItems: GearItem[];
  localizedGearEntries: LocalizedGearEntry[];
  supportingPages: SupportingPage[];
  supportingBodies: ReadonlyMap<string, string>;
  report: WordExtractionReport;
}

function json(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function localizedJson<T>(
  locale: string,
  entries: readonly T[],
  getEntityId: (entry: T) => string,
): string {
  return json(
    Object.fromEntries(
      entries.map((entry) => [`${locale}/${getEntityId(entry)}`, entry]),
    ),
  );
}

function markdown(frontmatter: object, body: string): string {
  const yaml = stringifyYaml(frontmatter, { lineWidth: 0 }).trimEnd();
  return `---\n${yaml}\n---\n\n${body.trim()}\n`;
}

async function writeStagedFile(
  stagingRoot: string,
  relativePath: string,
  contents: string,
  prettierOptions: PrettierOptions,
): Promise<void> {
  const path = resolve(stagingRoot, relativePath);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    await formatWithPrettier(contents, {
      ...prettierOptions,
      filepath: path,
    }),
    "utf8",
  );
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

interface Replacement {
  target: string;
  backup: string;
  hadOriginal: boolean;
}

async function replaceGeneratedPaths(
  repositoryRoot: string,
  stagingRoot: string,
  relativePaths: readonly string[],
): Promise<void> {
  const suffix = randomUUID();
  const completed: Replacement[] = [];

  try {
    for (const relativePath of relativePaths) {
      const target = resolve(repositoryRoot, relativePath);
      const staged = resolve(stagingRoot, relativePath);
      const backup = `${target}.content-extraction-backup-${suffix}`;
      const hadOriginal = await pathExists(target);
      await mkdir(dirname(target), { recursive: true });
      if (hadOriginal) await rename(target, backup);
      try {
        await rename(staged, target);
      } catch (error) {
        if (hadOriginal) await rename(backup, target);
        throw error;
      }
      completed.push({ target, backup, hadOriginal });
    }
  } catch (error) {
    for (const replacement of completed.reverse()) {
      await rm(replacement.target, { recursive: true, force: true });
      if (replacement.hadOriginal) {
        await rename(replacement.backup, replacement.target);
      }
    }
    throw error;
  }

  await Promise.all(
    completed
      .filter(({ hadOriginal }) => hadOriginal)
      .map(({ backup }) => rm(backup, { recursive: true, force: true })),
  );
}

export async function writeGeneratedContent(
  repositoryRoot: string,
  content: GeneratedContent,
): Promise<void> {
  const stagingRoot = await mkdtemp(
    join(repositoryRoot, ".content-extraction-staging-"),
  );

  try {
    const prettierOptions = (await resolvePrettierConfig(repositoryRoot)) ?? {};
    const files = new Map<string, string>([
      ["src/data/trail/regions.json", json(content.regions)],
      ["src/data/trail/sections.json", json(content.sections)],
      ["src/data/trail/days.json", json(content.days)],
      ["src/data/gear/items.json", json(content.gearItems)],
      ["src/data/glossary/concepts.json", json(content.glossaryConcepts)],
      ["src/data/media/photos.json", json(content.photos)],
      ["src/data/source/word-source.json", json(content.sourceDocuments)],
      ["src/data/source/word-extraction-report.json", json(content.report)],
      [
        "src/content/gear/fr.json",
        localizedJson(
          "fr",
          content.localizedGearEntries,
          ({ gearItemId }) => gearItemId,
        ),
      ],
      [
        "src/content/glossary/fr.json",
        localizedJson(
          "fr",
          content.localizedGlossaryEntries,
          ({ conceptId }) => conceptId,
        ),
      ],
    ]);

    for (const entry of content.journalEntries) {
      const body = content.journalBodies.get(entry.dayId);
      if (body === undefined)
        throw new Error(`Missing body for ${entry.dayId}.`);
      files.set(
        `src/content/journal/fr/${entry.dayId}.md`,
        markdown(entry, body),
      );
    }
    for (const page of content.supportingPages) {
      const body = content.supportingBodies.get(page.pageId);
      if (body === undefined)
        throw new Error(`Missing body for ${page.pageId}.`);
      files.set(`src/content/pages/fr/${page.pageId}.md`, markdown(page, body));
    }

    await Promise.all(
      [...files].map(([path, value]) =>
        writeStagedFile(stagingRoot, path, value, prettierOptions),
      ),
    );

    await replaceGeneratedPaths(repositoryRoot, stagingRoot, [
      "src/content/journal/fr",
      "src/content/gear/fr.json",
      "src/content/glossary/fr.json",
      "src/content/pages/fr",
      "src/data/trail/regions.json",
      "src/data/trail/sections.json",
      "src/data/trail/days.json",
      "src/data/gear/items.json",
      "src/data/glossary/concepts.json",
      "src/data/media/photos.json",
      "src/data/source/word-source.json",
      "src/data/source/word-extraction-report.json",
    ]);
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
}
