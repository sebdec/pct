import { readdir, readFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

import { parse as parseYaml } from "yaml";

import { assertContentModel } from "../src/lib/content/validateContent.ts";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

async function readJsonArray(path) {
  const value = JSON.parse(await readFile(path, "utf8"));

  if (!Array.isArray(value)) {
    throw new TypeError(
      `${relative(repositoryRoot, path)} must contain an array.`,
    );
  }

  return value;
}

async function readJsonObject(path) {
  const value = JSON.parse(await readFile(path, "utf8"));

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(
      `${relative(repositoryRoot, path)} must contain an object.`,
    );
  }

  return value;
}

async function listFiles(directory, extensions) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path, extensions)));
    } else if (extensions.has(extname(entry.name))) {
      files.push(path);
    }
  }

  return files.sort();
}

function assertMatchingLocale(path, baseDirectory, data) {
  const [directoryLocale] = relative(baseDirectory, path).split("/");

  if (data.locale !== directoryLocale) {
    throw new Error(
      `${relative(repositoryRoot, path)} declares locale "${String(data.locale)}" but is stored under "${directoryLocale}".`,
    );
  }
}

async function readLocalizedJson(directory) {
  const files = await listFiles(directory, new Set([".json"]));

  return Promise.all(
    files.map(async (path) => {
      const data = JSON.parse(await readFile(path, "utf8"));
      assertMatchingLocale(path, directory, data);
      return data;
    }),
  );
}

function parseFrontmatter(path, markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);

  if (!match) {
    throw new Error(
      `${relative(repositoryRoot, path)} has no YAML frontmatter.`,
    );
  }

  const data = parseYaml(match[1]);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new TypeError(
      `${relative(repositoryRoot, path)} frontmatter must be an object.`,
    );
  }

  return data;
}

async function readLocalizedMarkdown(directory) {
  const files = await listFiles(directory, new Set([".md"]));

  return Promise.all(
    files.map(async (path) => {
      const data = parseFrontmatter(path, await readFile(path, "utf8"));
      assertMatchingLocale(path, directory, data);
      return data;
    }),
  );
}

const dataDirectory = resolve(repositoryRoot, "src/data");
const contentDirectory = resolve(repositoryRoot, "src/content");

assertContentModel({
  sourceDocuments: await readJsonArray(
    resolve(dataDirectory, "source/word-source.json"),
  ),
  extractionReports: [
    await readJsonObject(
      resolve(dataDirectory, "source/word-extraction-report.json"),
    ),
  ],
  regions: await readJsonArray(resolve(dataDirectory, "trail/regions.json")),
  sections: await readJsonArray(resolve(dataDirectory, "trail/sections.json")),
  days: await readJsonArray(resolve(dataDirectory, "trail/days.json")),
  journalEntries: await readLocalizedMarkdown(
    resolve(contentDirectory, "journal"),
  ),
  photos: await readJsonArray(resolve(dataDirectory, "media/photos.json")),
  localizedPhotos: await readLocalizedJson(resolve(contentDirectory, "media")),
  glossaryConcepts: await readJsonArray(
    resolve(dataDirectory, "glossary/concepts.json"),
  ),
  localizedGlossaryEntries: await readLocalizedJson(
    resolve(contentDirectory, "glossary"),
  ),
  gearItems: await readJsonArray(resolve(dataDirectory, "gear/items.json")),
  localizedGearEntries: await readLocalizedJson(
    resolve(contentDirectory, "gear"),
  ),
  supportingPages: await readLocalizedMarkdown(
    resolve(contentDirectory, "pages"),
  ),
  corrections: await readJsonArray(
    resolve(dataDirectory, "source/corrections.json"),
  ),
});
