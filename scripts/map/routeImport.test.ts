import { describe, expect, it, vi } from "vitest";

import { normalizePctRoute } from "./normalizeRoute.ts";
import {
  assertApprovedLayer,
  fetchGeoJsonPages,
  type GeoJsonFeature,
} from "./pctaSource.ts";

function jsonResponse(value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

describe("PCTA ArcGIS acquisition", () => {
  it("paginates beyond a full ArcGIS page boundary", async () => {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = new URL(String(input));
      const offset = Number(url.searchParams.get("resultOffset"));
      const ids = offset === 0 ? [1, 2] : [3];
      return jsonResponse({
        type: "FeatureCollection",
        features: ids.map(
          (
            OBJECTID,
          ): GeoJsonFeature<
            { OBJECTID: number },
            { type: "Point"; coordinates: [number, number] }
          > => ({
            type: "Feature",
            properties: { OBJECTID },
            geometry: { type: "Point", coordinates: [OBJECTID, OBJECTID] },
          }),
        ),
      });
    }) as unknown as typeof fetch;

    const features = await fetchGeoJsonPages({
      layerUrl: "https://example.com/FeatureServer/0",
      outFields: ["OBJECTID"],
      pageSize: 2,
      fetcher,
    });

    expect(features.map(({ properties }) => properties.OBJECTID)).toEqual([
      1, 2, 3,
    ]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("rejects an unreviewed layer revision", () => {
    expect(() =>
      assertApprovedLayer(
        {
          name: "PCTA_Centerline",
          geometryType: "esriGeometryPolyline",
          maxRecordCount: 2000,
          lastEditDate: "2027-01-01T00:00:00.000Z",
        },
        {
          name: "PCTA_Centerline",
          geometryType: "esriGeometryPolyline",
          lastEditDate: "2026-01-06T23:18:04.221Z",
        },
      ),
    ).toThrow("source drift");
  });
});

describe("PCTA route normalization", () => {
  it("reverses a northbound source and excludes markers without geometry", () => {
    const southern = [-116.466981, 32.589741] as [number, number];
    const northern = [-120.802105, 49.000302] as [number, number];
    const { route, report } = normalizePctRoute({
      centerline: {
        type: "Feature",
        properties: { OBJECTID: 1 },
        geometry: {
          type: "LineString",
          coordinates: [northern, [-118, 40], southern],
        },
      },
      markers: [
        {
          type: "Feature",
          properties: { OBJECTID: 1, Mile: 0.5, RouteID: "PCT" },
          geometry: { type: "Point", coordinates: [-116.4677, 32.5928] },
        },
        {
          type: "Feature",
          properties: { OBJECTID: 2, Mile: 2656, RouteID: "PCT" },
          geometry: null,
        },
      ],
      centerlineLastEdit: "2026-01-06T23:18:04.221Z",
      mileMarkersLastEdit: "2026-01-07T00:14:06.948Z",
    });

    expect(route.coordinates[0]).toEqual(southern);
    expect(route.coordinates.at(-1)).toEqual(northern);
    expect(route.anchors.map(({ mile }) => mile)).toEqual([0, 0.5, 2655.84]);
    expect(route.anchors[1]!.routeProgress).toBeGreaterThan(0);
    expect(route.anchors[1]!.routeProgress).toBeLessThan(1);
    expect(report).toMatchObject({
      reversedCenterline: true,
      validMarkerCount: 1,
      excludedMarkerCount: 1,
      excludedMarkerMiles: [2656],
    });
  });
});
