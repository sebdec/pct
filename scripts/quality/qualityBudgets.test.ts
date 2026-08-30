import { describe, expect, it } from "vitest";

import {
  compressedBytes,
  routeFromHtmlPath,
  validatePageMetadata,
} from "./qualityBudgets.ts";

describe("quality budgets", () => {
  it("derives public routes from generated HTML paths", () => {
    expect(routeFromHtmlPath("index.html")).toBe("/");
    expect(routeFromHtmlPath("fr/gear/index.html")).toBe("/fr/gear/");
  });

  it("measures compressed output", () => {
    expect(compressedBytes("a".repeat(1_000))).toBeLessThan(1_000);
  });

  it("reports missing metadata without throwing", () => {
    const violations = validatePageMetadata(
      "/gear/",
      '<html lang="en"><head><title>Gear</title></head></html>',
    );
    expect(violations.map(({ rule }) => rule)).toContain("canonical");
    expect(violations.map(({ rule }) => rule)).toContain("structured-data");
  });
});
