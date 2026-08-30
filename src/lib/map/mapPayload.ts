import { z } from "astro/zod";

import {
  mapAreaSchema,
  mapPointSchema,
  trailRouteSchema,
  type MapArea,
  type MapPoint,
  type TrailRoute,
} from "../content/schemas.ts";

export const mapPayloadPath = "/data/pct-map-2026.json";

export interface MapPayload {
  route: TrailRoute;
  points: MapPoint[];
  areas: MapArea[];
}

const mapPayloadSchema = z.object({
  route: trailRouteSchema,
  points: z.array(mapPointSchema),
  areas: z.array(mapAreaSchema),
});

export function parseMapPayload(value: unknown): MapPayload {
  return mapPayloadSchema.parse(value);
}

export async function loadMapPayload(
  url: string,
  signal?: AbortSignal,
): Promise<MapPayload> {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`Unable to load map data: ${response.status}.`);
  }

  return parseMapPayload(await response.json());
}
