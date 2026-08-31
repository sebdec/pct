import { describe, expect, it } from "vitest";

import { createValidContentModel } from "../content/contentFixtures.ts";
import type { TrailRoute } from "../content/schemas.ts";
import {
  clampJournalMile,
  createRouteIndex,
  getCoordinateAtMile,
  getJournalMileAtRouteProgress,
  getNearestMileOnRoute,
  getRouteProgressAtMile,
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
    expect(getJournalMileAtRouteProgress(route, 0.1)).toBeCloseTo(50);
  });

  it("finds the nearest journal mile for a map coordinate", () => {
    const route = fixtureRoute();
    const index = createRouteIndex(route.coordinates);
    const coordinate = getCoordinateAtMile(route, 1200, index);

    expect(getNearestMileOnRoute(route, coordinate, index)).toBeCloseTo(
      1200,
      0,
    );
  });

  it("rejects invalid miles", () => {
    const route = fixtureRoute();

    expect(() => getRouteProgressAtMile(route, 2655.9)).toThrow(
      "Only journal mile 2656",
    );
    expect(() => getRouteProgressAtMile(route, 2656.1)).toThrow(
      "between 0 and 2656",
    );
  });
});
