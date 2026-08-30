import { getCollection } from "astro:content";

import { parseMapPayload } from "../../lib/map/mapPayload.ts";

export const prerender = true;

export async function GET() {
  const [routeEntries, pointEntries, areaEntries] = await Promise.all([
    getCollection("routes"),
    getCollection("mapPoints"),
    getCollection("mapAreas"),
  ]);
  const route = routeEntries[0]?.data;

  if (!route) throw new Error("The PCT route is missing.");

  const payload = parseMapPayload({
    route,
    points: pointEntries.map(({ data }) => data),
    areas: areaEntries.map(({ data }) => data),
  });

  return new Response(JSON.stringify(payload), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
