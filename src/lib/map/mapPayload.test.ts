import { describe, expect, it } from "vitest";

import routes from "../../data/map/routes.json";
import { mapPayloadPath, parseMapPayload } from "./mapPayload.ts";

describe("map payload", () => {
  it("uses a stable versioned public path", () => {
    expect(mapPayloadPath).toBe("/data/pct-map-2026.json");
  });

  it("rejects incomplete public data", () => {
    expect(() =>
      parseMapPayload({ route: routes[0], points: [], areas: [] }),
    ).not.toThrow();
    expect(() => parseMapPayload({ points: [], areas: [] })).toThrow();
  });
});
