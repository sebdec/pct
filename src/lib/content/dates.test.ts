import { describe, expect, it } from "vitest";

import { formatDate, parseLocalIsoDate } from "./dates.ts";

describe("journal dates", () => {
  it("formats localized dates deterministically", () => {
    expect(formatDate("2026-04-18", "fr")).toBe("18 avril 2026");
    expect(formatDate("2026-04-18", "en")).toBe("April 18, 2026");
  });

  it("parses date-only values without changing the calendar day", () => {
    const date = parseLocalIsoDate("2026-07-27");

    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(27);
  });

  it("rejects impossible or malformed values", () => {
    expect(() => parseLocalIsoDate("2026-02-30")).toThrow(RangeError);
    expect(() => parseLocalIsoDate("18-04-2026")).toThrow(RangeError);
  });
});
