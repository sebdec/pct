import { gzipSync } from "node:zlib";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

export interface QualityBudgets {
  version: number;
  compressedBytes: {
    nonMapHtml: number;
    mapHtml: number;
    nonMapJavaScript: number;
    mapJavaScript: number;
    routeCss: number;
    mapPayload: number;
  };
  rawBytes: {
    generatedImage: number;
  };
}

export interface BuildViolation {
  route: string;
  rule: string;
  message: string;
}

interface Attributes {
  [name: string]: string;
}

const siteOrigin = "https://pct.sebdec.com";

export function compressedBytes(content: string | Buffer): number {
  return gzipSync(content).byteLength;
}

export function routeFromHtmlPath(relativePath: string): string {
  const normalized = relativePath.split(path.sep).join("/");
  if (normalized === "index.html") return "/";
  if (normalized.endsWith("/index.html")) {
    return `/${normalized.slice(0, -"index.html".length)}`;
  }
  return `/${normalized}`;
}

function attributes(tag: string): Attributes {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map((match) => [
      match[1]!,
      match[2]!,
    ]),
  );
}

function tags(html: string, name: string): Attributes[] {
  return [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map(
    ([tag]) => attributes(tag),
  );
}

function metaContent(
  html: string,
  attribute: "name" | "property",
  value: string,
): string[] {
  return tags(html, "meta")
    .filter((tag) => tag[attribute] === value)
    .map((tag) => tag.content ?? "");
}

function linkHref(html: string, rel: string, hreflang?: string): string[] {
  return tags(html, "link")
    .filter(
      (tag) =>
        tag.rel === rel &&
        (hreflang === undefined || tag.hreflang === hreflang),
    )
    .map((tag) => tag.href ?? "");
}

function expectedLocale(route: string): "en" | "fr" {
  return route === "/fr/" || route.startsWith("/fr/") ? "fr" : "en";
}

function expectedAlternate(route: string, locale: "en" | "fr"): string {
  const withoutFrench = route.startsWith("/fr/") ? route.slice(3) : route;
  if (locale === "en") return `${siteOrigin}${withoutFrench}`;
  return `${siteOrigin}${withoutFrench === "/" ? "/fr/" : `/fr${withoutFrench}`}`;
}

function comparablePublicUrl(value: string): string {
  const url = new URL(value);
  const pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/$/, "");
  return `${url.origin}${pathname}`;
}

function requireSingle(
  violations: BuildViolation[],
  route: string,
  rule: string,
  values: readonly string[],
): string | undefined {
  if (values.length !== 1 || values[0]?.trim() === "") {
    violations.push({
      route,
      rule,
      message: `Expected exactly 1 non-empty value, found ${values.length}.`,
    });
    return undefined;
  }
  return values[0];
}

export function validatePageMetadata(
  route: string,
  html: string,
): BuildViolation[] {
  const violations: BuildViolation[] = [];
  const locale = expectedLocale(route);
  const htmlTag = tags(html, "html")[0];
  if (htmlTag?.lang !== locale) {
    violations.push({
      route,
      rule: "html-lang",
      message: `Expected lang=${locale}, found ${htmlTag?.lang ?? "none"}.`,
    });
  }

  const pageTitle = requireSingle(
    violations,
    route,
    "title",
    [...html.matchAll(/<title>([^<]+)<\/title>/gi)].map((match) => match[1]!),
  );
  const description = requireSingle(
    violations,
    route,
    "description",
    metaContent(html, "name", "description"),
  );
  const canonical = requireSingle(
    violations,
    route,
    "canonical",
    linkHref(html, "canonical"),
  );
  const expectedCanonical = `${siteOrigin}${route}`;
  if (
    canonical &&
    comparablePublicUrl(canonical) !== comparablePublicUrl(expectedCanonical)
  ) {
    violations.push({
      route,
      rule: "canonical",
      message: `Expected ${expectedCanonical}, found ${canonical}.`,
    });
  }

  for (const alternateLocale of ["en", "fr", "x-default"] as const) {
    const alternate = requireSingle(
      violations,
      route,
      `hreflang-${alternateLocale}`,
      linkHref(html, "alternate", alternateLocale),
    );
    const targetLocale = alternateLocale === "fr" ? "fr" : "en";
    const expected = expectedAlternate(route, targetLocale);
    if (
      alternate &&
      comparablePublicUrl(alternate) !== comparablePublicUrl(expected)
    ) {
      violations.push({
        route,
        rule: `hreflang-${alternateLocale}`,
        message: `Expected ${expected}, found ${alternate}.`,
      });
    }
  }

  const metadataPairs = [
    ["og:title", pageTitle, "property"],
    ["og:description", description, "property"],
    ["og:url", canonical, "property"],
    ["og:image", `${siteOrigin}/social-card.png`, "property"],
    ["og:image:width", "1200", "property"],
    ["og:image:height", "630", "property"],
    ["twitter:card", "summary_large_image", "name"],
    ["twitter:title", pageTitle, "name"],
    ["twitter:description", description, "name"],
    ["twitter:image", `${siteOrigin}/social-card.png`, "name"],
  ] as const;
  for (const [key, expected, attribute] of metadataPairs) {
    const value = requireSingle(
      violations,
      route,
      key,
      metaContent(html, attribute, key),
    );
    if (value && expected && value !== expected) {
      violations.push({
        route,
        rule: key,
        message: `Expected ${expected}, found ${value}.`,
      });
    }
  }

  const jsonLd = [
    ...html.matchAll(
      /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ];
  const serialized = requireSingle(
    violations,
    route,
    "structured-data",
    jsonLd.map((match) => match[1]!),
  );
  if (serialized) {
    try {
      const data = JSON.parse(serialized) as {
        "@context"?: unknown;
        "@graph"?: { "@type"?: unknown }[];
      };
      const types = data["@graph"]?.map((entry) => entry["@type"]) ?? [];
      if (
        data["@context"] !== "https://schema.org" ||
        !types.includes("WebSite") ||
        !types.includes("WebPage")
      ) {
        throw new Error("Missing WebSite or WebPage graph entries.");
      }
      if (route.includes("/journal/") && !types.includes("BlogPosting")) {
        throw new Error("Journal routes require a BlogPosting graph entry.");
      }
    } catch (error) {
      violations.push({
        route,
        rule: "structured-data",
        message: error instanceof Error ? error.message : "Invalid JSON-LD.",
      });
    }
  }

  return violations;
}

function localAssetPaths(html: string): string[] {
  const assets = new Set<string>();
  for (const script of tags(html, "script")) {
    if (script.src?.startsWith("/")) assets.add(script.src);
  }
  for (const link of tags(html, "link")) {
    if (
      link.href?.startsWith("/") &&
      ["stylesheet", "modulepreload"].includes(link.rel ?? "")
    ) {
      assets.add(link.href);
    }
  }
  for (const island of tags(html, "astro-island")) {
    for (const key of ["component-url", "renderer-url"]) {
      const value = island[key];
      if (value?.startsWith("/")) assets.add(value);
    }
  }
  return [...assets];
}

function importedJavaScript(source: string): string[] {
  const imports = new Set<string>();
  for (const match of source.matchAll(
    /\bfrom["']([^"']+)["']|\bimport\(["']([^"']+)["']\)/g,
  )) {
    const value = match[1] ?? match[2];
    if (value?.startsWith(".")) imports.add(value);
  }
  return [...imports];
}

async function routeAssetBytes(
  distDirectory: string,
  html: string,
): Promise<{ javaScript: number; css: number }> {
  const pending = localAssetPaths(html).map((asset) =>
    path.join(distDirectory, asset.slice(1)),
  );
  const visited = new Set<string>();
  let javaScript = 0;
  let css = 0;

  while (pending.length > 0) {
    const file = pending.pop()!;
    if (visited.has(file)) continue;
    visited.add(file);
    const content = await readFile(file);
    if (file.endsWith(".css")) css += compressedBytes(content);
    if (!file.endsWith(".js")) continue;

    javaScript += compressedBytes(content);
    const source = content.toString("utf8");
    for (const imported of importedJavaScript(source)) {
      const importedFile = path.resolve(path.dirname(file), imported);
      if (!visited.has(importedFile)) pending.push(importedFile);
    }
  }

  return { javaScript, css };
}

async function filesUnder(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? filesUnder(target) : [target];
    }),
  );
  return files.flat();
}

export async function validateBuild(
  distDirectory: string,
  budgets: QualityBudgets,
): Promise<BuildViolation[]> {
  const violations: BuildViolation[] = [];
  const files = await filesUnder(distDirectory);
  const htmlFiles = files.filter((file) => file.endsWith(".html"));

  for (const file of htmlFiles) {
    const relative = path.relative(distDirectory, file);
    const route = routeFromHtmlPath(relative);
    const html = await readFile(file, "utf8");
    const isMap =
      route === "/map/" ||
      route.startsWith("/map/") ||
      route === "/fr/map/" ||
      route.startsWith("/fr/map/");
    const htmlLimit = isMap
      ? budgets.compressedBytes.mapHtml
      : budgets.compressedBytes.nonMapHtml;
    const htmlSize = compressedBytes(html);
    if (htmlSize > htmlLimit) {
      violations.push({
        route,
        rule: "html-budget",
        message: `${htmlSize} compressed bytes exceeds ${htmlLimit}. Raw size: ${Buffer.byteLength(html)} bytes.`,
      });
    }

    const assets = await routeAssetBytes(distDirectory, html);
    const javaScriptLimit = isMap
      ? budgets.compressedBytes.mapJavaScript
      : budgets.compressedBytes.nonMapJavaScript;
    if (assets.javaScript > javaScriptLimit) {
      violations.push({
        route,
        rule: "javascript-budget",
        message: `${assets.javaScript} compressed bytes exceeds ${javaScriptLimit}.`,
      });
    }
    if (assets.css > budgets.compressedBytes.routeCss) {
      violations.push({
        route,
        rule: "css-budget",
        message: `${assets.css} compressed bytes exceeds ${budgets.compressedBytes.routeCss}.`,
      });
    }

    violations.push(...validatePageMetadata(route, html));
  }

  const mapPayload = path.join(distDirectory, "data/pct-map-2026.json");
  const mapPayloadContent = await readFile(mapPayload);
  const mapPayloadSize = compressedBytes(mapPayloadContent);
  if (mapPayloadSize > budgets.compressedBytes.mapPayload) {
    violations.push({
      route: "/data/pct-map-2026.json",
      rule: "map-payload-budget",
      message: `${mapPayloadSize} compressed bytes exceeds ${budgets.compressedBytes.mapPayload}. Raw size: ${mapPayloadContent.byteLength} bytes.`,
    });
  }

  for (const file of files.filter((candidate) =>
    /\.(?:avif|webp|png|jpe?g)$/i.test(candidate),
  )) {
    const size = (await stat(file)).size;
    if (size > budgets.rawBytes.generatedImage) {
      violations.push({
        route: `/${path.relative(distDirectory, file).split(path.sep).join("/")}`,
        rule: "image-budget",
        message: `${size} bytes exceeds ${budgets.rawBytes.generatedImage}.`,
      });
    }
  }

  const robots = await readFile(path.join(distDirectory, "robots.txt"), "utf8");
  if (!robots.includes(`Sitemap: ${siteOrigin}/sitemap.xml`)) {
    violations.push({
      route: "/robots.txt",
      rule: "robots-sitemap",
      message: "Missing the canonical production sitemap URL.",
    });
  }

  const llms = await readFile(path.join(distDirectory, "llms.txt"), "utf8");
  if (!llms.startsWith("# Pacific Crest Trail 2026\n\n> ")) {
    violations.push({
      route: "/llms.txt",
      rule: "llms-format",
      message: "Expected an H1 followed by a blockquote summary.",
    });
  }
  for (const match of llms.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const url = match[1]!;
    if (!url.startsWith(`${siteOrigin}/`)) {
      violations.push({
        route: "/llms.txt",
        rule: "llms-url",
        message: `Expected an internal canonical URL, found ${url}.`,
      });
    }
  }

  return violations;
}
