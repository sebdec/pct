import { describe, expect, it } from "vitest";

import { createValidContentModel } from "../content/contentFixtures.ts";
import type { Day, TrailRoute } from "../content/schemas.ts";
import {
  clampJournalMile,
  createRouteIndex,
  getCoordinateAtMile,
  getRouteProgressAtMile,
  getTrailDayRouteRange,
} from "./route.ts";

function fixtureRoute(): TrailRoute {
  return structuredClone(createValidContentModel().routes![0]) as TrailRoute;
}

describe("route mileage mapping", () => {
  it("maps both official and rounded journal maxima to the northern terminus", () => {
    const route = fixtureRoute();
    const index = createRouteIndex(route.coordinates);

    expect(clampJournalMile(2656, route)).toBe(2655.84);
    expect(getRouteProgressAtMile(route, 2655.84)).toBe(1);
    expect(getRouteProgressAtMile(route, 2656)).toBe(1);
    expect(getCoordinateAtMile(route, 2656, index)).toEqual(
      route.termini.north,
    );
  });

  it("interpolates a mile between ordered route anchors", () => {
    const route = fixtureRoute();
    route.anchors = [
      { mile: 0, routeProgress: 0 },
      { mile: 100, routeProgress: 0.2 },
      { mile: 2655.84, routeProgress: 1 },
    ];

    expect(getRouteProgressAtMile(route, 50)).toBeCloseTo(0.1);
  });

  it("represents a zero-mile trail day as one route position", () => {
    const route = fixtureRoute();
    const day: Day = {
      id: "day-028",
      sequence: 28,
      kind: "trail",
      date: "2026-05-15",
      regionId: "sierra",
      sectionIds: ["section-california-b"],
      mileStart: 703,
      mileEnd: 703,
      ascentMeters: 0,
      descentMeters: 0,
      locationId: "kennedy-meadows",
      published: true,
      sourceRefs: [
        {
          document: "PCT 2026 - Sebdec.docx",
          blockType: "table",
          blockIndex: 1,
        },
      ],
    };

    expect(getTrailDayRouteRange(day, route)).toMatchObject({
      dayId: "day-028",
      isPoint: true,
      startProgress: getRouteProgressAtMile(route, 703),
      endProgress: getRouteProgressAtMile(route, 703),
    });
  });

  it("keeps post-trail entries outside the route and rejects invalid miles", () => {
    const route = fixtureRoute();
    const postTrail = createValidContentModel().days.at(-1) as Day;

    expect(getTrailDayRouteRange(postTrail, route)).toBeNull();
    expect(() => getRouteProgressAtMile(route, 2655.9)).toThrow(
      "Only journal mile 2656",
    );
    expect(() => getRouteProgressAtMile(route, 2656.1)).toThrow(
      "between 0 and 2656",
    );
  });
});
