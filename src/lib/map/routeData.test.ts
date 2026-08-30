import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import {
  daySchema,
  mapPointSchema,
  trailRouteSchema,
} from "../content/schemas.ts";
import {
  createRouteIndex,
  getCoordinateAtMile,
  getTrailDayRouteRange,
} from "./route.ts";

async function readJson(relativePath: string): Promise<unknown> {
  return JSON.parse(
    await readFile(new URL(relativePath, import.meta.url), "utf8"),
  );
}

describe("committed PCTA 2026 route snapshot", () => {
  it("keeps the curated landmark inventory unique and complete", async () => {
    const value = await readJson("../../data/map/points-of-interest.json");
    const points = mapPointSchema.array().parse(value);
    const ids = points.map(({ id }) => id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(
      expect.arrayContaining([
        "julian",
        "mojave",
        "independence",
        "bridgeport",
        "belden",
        "quincy",
        "castella",
        "mazama-village",
        "olallie-lake",
        "government-camp",
        "packwood",
        "mazama",
      ]),
    );
  });

  it("preserves approved provenance and structural counts", async () => {
    const value = await readJson("../../data/map/routes.json");
    expect(Array.isArray(value)).toBe(true);
    const route = trailRouteSchema.parse((value as unknown[])[0]);

    expect(route.source.attribution).toBe(
      "Trail data © Pacific Crest Trail Association, CC BY 4.0, 2026",
    );
    expect(route.coordinates).toHaveLength(23_711);
    expect(route.anchors).toHaveLength(5_313);
    expect(route.normalization).toMatchObject({
      sourceMarkerCount: 5_320,
      validMarkerCount: 5_311,
      excludedMarkerCount: 9,
      maxAnchorProjectionMeters: 27.184,
    });
  });

  it("maps all trail days and keeps post-trail entries outside geometry", async () => {
    const routeValue = await readJson("../../data/map/routes.json");
    const route = trailRouteSchema.parse((routeValue as unknown[])[0]);
    const daysValue = await readJson("../../data/trail/days.json");
    const days = (daysValue as unknown[]).map((value) =>
      daySchema.parse(value),
    );
    const ranges = days.map((day) => getTrailDayRouteRange(day, route));
    const trailRanges = ranges.filter(
      (range): range is NonNullable<typeof range> => range !== null,
    );

    expect(trailRanges).toHaveLength(97);
    expect(trailRanges.filter(({ isPoint }) => isPoint)).toEqual([
      expect.objectContaining({
        dayId: "day-028",
        mileStart: 703,
        mileEnd: 703,
      }),
    ]);
    expect(ranges.filter((range) => range === null)).toHaveLength(3);
    expect(trailRanges.at(-1)).toMatchObject({
      dayId: "day-097",
      endProgress: 1,
    });
  });

  it("maps official and journal terminal miles to the same coordinate", async () => {
    const value = await readJson("../../data/map/routes.json");
    const route = trailRouteSchema.parse((value as unknown[])[0]);
    const routeIndex = createRouteIndex(route.coordinates);

    expect(getCoordinateAtMile(route, 0, routeIndex)).toEqual(
      route.termini.south,
    );
    expect(getCoordinateAtMile(route, 2655.84, routeIndex)).toEqual(
      route.termini.north,
    );
    expect(getCoordinateAtMile(route, 2656, routeIndex)).toEqual(
      route.termini.north,
    );
  });
});
