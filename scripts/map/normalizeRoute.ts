import {
  createRouteIndex,
  coordinateDistanceMeters,
} from "../../src/lib/map/route.ts";
import {
  trailRouteSchema,
  type RouteCoordinate,
  type TrailRoute,
} from "../../src/lib/content/schemas.ts";
import {
  coordinatePrecision,
  journalMaxMile,
  maxAllowableOffsetDegrees,
  officialLengthMiles,
  pctaCenterlineUrl,
  pctaMileMarkersUrl,
  type GeoJsonFeature,
} from "./pctaSource.ts";

interface LineStringGeometry {
  type: "LineString";
  coordinates: RouteCoordinate[];
}

interface PointGeometry {
  type: "Point";
  coordinates: RouteCoordinate;
}

export interface PctaMarkerProperties extends Record<string, unknown> {
  OBJECTID: number;
  Mile: number;
  RouteID: string;
}

export type PctaCenterlineFeature = GeoJsonFeature<
  Record<string, unknown>,
  LineStringGeometry
>;
export type PctaMarkerFeature = GeoJsonFeature<
  PctaMarkerProperties,
  PointGeometry
>;

type ValidPctaMarkerFeature = PctaMarkerFeature & { geometry: PointGeometry };

export interface RouteNormalizationReport {
  sourceCoordinateCount: number;
  outputCoordinateCount: number;
  sourceMarkerCount: number;
  validMarkerCount: number;
  excludedMarkerCount: number;
  excludedMarkerMiles: number[];
  maxAnchorProjectionMeters: number;
  reversedCenterline: boolean;
}

interface ProjectedPoint {
  x: number;
  y: number;
}

const mercatorRadius = 6_378_137;
const projectionSearchWindowMiles = 5;

function round(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function sameCoordinate(
  left: RouteCoordinate,
  right: RouteCoordinate,
): boolean {
  return left[0] === right[0] && left[1] === right[1];
}

function projectCoordinate([
  longitude,
  latitude,
]: RouteCoordinate): ProjectedPoint {
  const longitudeRadians = (longitude * Math.PI) / 180;
  const latitudeRadians = (latitude * Math.PI) / 180;
  return {
    x: mercatorRadius * longitudeRadians,
    y: mercatorRadius * Math.log(Math.tan(Math.PI / 4 + latitudeRadians / 2)),
  };
}

function findCumulativeIndex(
  cumulativeMeters: readonly number[],
  targetMeters: number,
): number {
  let low = 0;
  let high = cumulativeMeters.length - 1;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (cumulativeMeters[middle]! <= targetMeters) low = middle;
    else high = middle;
  }
  return low;
}

function projectAnchor(options: {
  coordinate: RouteCoordinate;
  coordinates: readonly RouteCoordinate[];
  projectedCoordinates: readonly ProjectedPoint[];
  cumulativeMeters: readonly number[];
  totalMeters: number;
  minimumProgressMeters: number;
  maximumProgressMeters: number;
}): {
  routeProgress: number;
  projectionMeters: number;
} {
  const firstSegment = Math.max(
    0,
    findCumulativeIndex(
      options.cumulativeMeters,
      options.minimumProgressMeters,
    ),
  );
  const lastSegment = Math.min(
    options.coordinates.length - 2,
    findCumulativeIndex(
      options.cumulativeMeters,
      Math.min(options.totalMeters, options.maximumProgressMeters),
    ) + 1,
  );
  const point = projectCoordinate(options.coordinate);
  let best: { distance: number; routeMeters: number } | undefined;

  for (let index = firstSegment; index <= lastSegment; index += 1) {
    const start = options.projectedCoordinates[index]!;
    const end = options.projectedCoordinates[index + 1]!;
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    const squaredLength = deltaX * deltaX + deltaY * deltaY;
    const ratio =
      squaredLength === 0
        ? 0
        : Math.max(
            0,
            Math.min(
              1,
              ((point.x - start.x) * deltaX + (point.y - start.y) * deltaY) /
                squaredLength,
            ),
          );
    const routeMeters =
      options.cumulativeMeters[index]! +
      ratio *
        (options.cumulativeMeters[index + 1]! -
          options.cumulativeMeters[index]!);
    if (routeMeters + 0.01 < options.minimumProgressMeters) continue;
    const startCoordinate = options.coordinates[index]!;
    const endCoordinate = options.coordinates[index + 1]!;
    const projectedCoordinate: RouteCoordinate = [
      startCoordinate[0] + ratio * (endCoordinate[0] - startCoordinate[0]),
      startCoordinate[1] + ratio * (endCoordinate[1] - startCoordinate[1]),
    ];
    const distance = coordinateDistanceMeters(
      options.coordinate,
      projectedCoordinate,
    );
    if (!best || distance < best.distance) best = { distance, routeMeters };
  }

  if (!best) {
    throw new Error("Unable to project a PCTA mileage anchor monotonically.");
  }
  return {
    routeProgress: best.routeMeters / options.totalMeters,
    projectionMeters: best.distance,
  };
}

function normalizeCoordinates(feature: PctaCenterlineFeature): {
  coordinates: RouteCoordinate[];
  reversed: boolean;
} {
  if (!feature.geometry || feature.geometry.type !== "LineString") {
    throw new TypeError("PCTA centerline must contain 1 LineString geometry.");
  }
  const normalized = feature.geometry.coordinates.map(
    ([longitude, latitude]) =>
      [
        round(longitude, coordinatePrecision),
        round(latitude, coordinatePrecision),
      ] as RouteCoordinate,
  );
  const withoutDuplicates = normalized.filter(
    (coordinate, index) =>
      index === 0 || !sameCoordinate(coordinate, normalized[index - 1]!),
  );
  if (withoutDuplicates.length < 2) {
    throw new Error("PCTA centerline has no usable geographic length.");
  }
  const reversed = withoutDuplicates[0]![1] > withoutDuplicates.at(-1)![1];
  return {
    coordinates: reversed ? withoutDuplicates.reverse() : withoutDuplicates,
    reversed,
  };
}

function getBounds(coordinates: readonly RouteCoordinate[]): {
  southwest: RouteCoordinate;
  northeast: RouteCoordinate;
} {
  let west = Infinity;
  let south = Infinity;
  let east = -Infinity;
  let north = -Infinity;
  for (const [longitude, latitude] of coordinates) {
    west = Math.min(west, longitude);
    south = Math.min(south, latitude);
    east = Math.max(east, longitude);
    north = Math.max(north, latitude);
  }
  return { southwest: [west, south], northeast: [east, north] };
}

function isValidMarker(
  feature: PctaMarkerFeature,
): feature is ValidPctaMarkerFeature {
  return (
    feature.properties.RouteID === "PCT" &&
    Number.isFinite(feature.properties.Mile) &&
    feature.geometry?.type === "Point" &&
    feature.geometry.coordinates.every(Number.isFinite)
  );
}

export function normalizePctRoute(options: {
  centerline: PctaCenterlineFeature;
  markers: readonly PctaMarkerFeature[];
  centerlineLastEdit: string;
  mileMarkersLastEdit: string;
}): { route: TrailRoute; report: RouteNormalizationReport } {
  const sourceCoordinateCount =
    options.centerline.geometry?.coordinates.length ?? 0;
  const normalized = normalizeCoordinates(options.centerline);
  const routeIndex = createRouteIndex(normalized.coordinates);
  const projectedCoordinates = normalized.coordinates.map(projectCoordinate);
  const validMarkers = options.markers
    .filter(isValidMarker)
    .sort((left, right) => left.properties.Mile - right.properties.Mile);
  const excludedMarkerMiles = options.markers
    .filter((feature) => !isValidMarker(feature))
    .map(({ properties }) => properties.Mile)
    .filter(Number.isFinite)
    .sort((left, right) => left - right);
  const anchors: TrailRoute["anchors"] = [{ mile: 0, routeProgress: 0 }];
  let minimumProgressMeters = 0;
  let maxAnchorProjectionMeters = 0;
  let previousMile = 0;

  for (const marker of validMarkers) {
    const mile = marker.properties.Mile;
    if (mile <= 0 || mile >= officialLengthMiles) continue;
    if (mile <= previousMile) {
      throw new Error(
        `PCTA mileage anchors are not strictly ordered at mile ${mile}.`,
      );
    }
    const projection = projectAnchor({
      coordinate: marker.geometry.coordinates,
      coordinates: normalized.coordinates,
      projectedCoordinates,
      cumulativeMeters: routeIndex.cumulativeMeters,
      totalMeters: routeIndex.totalMeters,
      minimumProgressMeters,
      maximumProgressMeters:
        minimumProgressMeters +
        Math.max(projectionSearchWindowMiles, (mile - previousMile) * 2) *
          1609.344,
    });
    minimumProgressMeters = projection.routeProgress * routeIndex.totalMeters;
    maxAnchorProjectionMeters = Math.max(
      maxAnchorProjectionMeters,
      projection.projectionMeters,
    );
    anchors.push({
      mile,
      routeProgress: round(projection.routeProgress, 9),
    });
    previousMile = mile;
  }
  anchors.push({ mile: officialLengthMiles, routeProgress: 1 });

  const route = trailRouteSchema.parse({
    id: "pct-2026",
    source: {
      name: "Pacific Crest Trail Association",
      revision: "2026",
      centerlineUrl: pctaCenterlineUrl,
      centerlineLastEdit: options.centerlineLastEdit,
      mileMarkersUrl: pctaMileMarkersUrl,
      mileMarkersLastEdit: options.mileMarkersLastEdit,
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      attribution:
        "Trail data © Pacific Crest Trail Association, CC BY 4.0, 2026",
    },
    crs: "EPSG:4326",
    officialLengthMiles,
    journalMaxMile,
    terminalClamp: { fromMile: journalMaxMile, toMile: officialLengthMiles },
    bounds: getBounds(normalized.coordinates),
    termini: {
      south: normalized.coordinates[0],
      north: normalized.coordinates.at(-1),
    },
    coordinates: normalized.coordinates,
    anchors,
    normalization: {
      maxAllowableOffsetDegrees,
      coordinatePrecision,
      sourceCoordinateCount,
      sourceMarkerCount: options.markers.length,
      validMarkerCount: validMarkers.length,
      excludedMarkerCount: options.markers.length - validMarkers.length,
      maxAnchorProjectionMeters: round(maxAnchorProjectionMeters, 3),
    },
  });
  const report: RouteNormalizationReport = {
    sourceCoordinateCount,
    outputCoordinateCount: route.coordinates.length,
    sourceMarkerCount: options.markers.length,
    validMarkerCount: validMarkers.length,
    excludedMarkerCount: options.markers.length - validMarkers.length,
    excludedMarkerMiles,
    maxAnchorProjectionMeters: route.normalization.maxAnchorProjectionMeters,
    reversedCenterline: normalized.reversed,
  };

  if (
    coordinateDistanceMeters(route.termini.south, route.coordinates[0]!) > 0.01
  ) {
    throw new Error(
      "Normalized southern terminus drifted from the route start.",
    );
  }
  return { route, report };
}
