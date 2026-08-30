import type { APIRoute } from "astro";

import rawDays from "../data/trail/days.json";
import { daySchema } from "../lib/content/schemas.ts";
import { buildLocalizedSitemapEntries } from "../lib/i18n/sitemap.ts";

const siteOrigin = "https://pct.sebdec.com";

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function absoluteUrl(path: string): string {
  return new URL(path, siteOrigin).href;
}

function urlNode(path: string, en: string, fr: string): string {
  return [
    "  <url>",
    `    <loc>${escapeXml(absoluteUrl(path))}</loc>`,
    `    <xhtml:link rel="alternate" hreflang="en" href="${escapeXml(absoluteUrl(en))}" />`,
    `    <xhtml:link rel="alternate" hreflang="fr" href="${escapeXml(absoluteUrl(fr))}" />`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(absoluteUrl(en))}" />`,
    "  </url>",
  ].join("\n");
}

export const GET: APIRoute = () => {
  const entries = buildLocalizedSitemapEntries(
    daySchema.array().parse(rawDays),
  );
  const nodes = entries.flatMap(({ en, fr }) => [
    urlNode(en, en, fr),
    urlNode(fr, en, fr),
  ]);
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...nodes,
    "</urlset>",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
