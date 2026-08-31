import type { Day, RouteCoordinate, TrailRoute } from "../content/schemas.ts";

const earthRadiusMeters = 6_371_008.8;

export interface RouteIndex {
  cumulativeMeters: readonly number[];
  totalMeters: number;
}

export interface TrailDayRouteRange {
  dayId: string;
  mileStart: number;
  mileEnd: number;
  startProgress: number;
  endProgress: number;
  isPoint: boolean;
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function coordinateDistanceMeters(
  left: RouteCoordinate,
  right: RouteCoordinate,
): number {
  const latitudeDelta = degreesToRadians(right[1] - left[1]);
  const longitudeDelta = degreesToRadians(right[0] - left[0]);
  const leftLatitude = degreesToRadians(left[1]);
  const rightLatitude = degreesToRadians(right[1]);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) *
      Math.cos(rightLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusMeters * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

export function createRouteIndex(
  coordinates: readonly RouteCoordinate[],
): RouteIndex {
  if (coordinates.length < 2) {
    throw new RangeError("A route requires at least 2 coordinates.");
  }
  const cumulativeMeters = [0];
  for (let index = 1; index < coordinates.length; index += 1) {
    cumulativeMeters.push(
      cumulativeMeters[index - 1]! +
        coordinateDistanceMeters(coordinates[index - 1]!, coordinates[index]!),
    );
  }
  const totalMeters = cumulativeMeters.at(-1)!;
  if (totalMeters <= 0) {
    throw new RangeError("A route must have a positive geographic length.");
  }
  return { cumulativeMeters, totalMeters };
}

export function clampJournalMile(mile: number, route: TrailRoute): number {
  if (!Number.isFinite(mile) || mile < 0 || mile > route.journalMaxMile) {
    throw new RangeError(`Mile must be between 0 and ${route.journalMaxMile}.`);
  }
  if (mile === route.terminalClamp.fromMile) {
    return route.terminalClamp.toMile;
  }
  if (mile > route.officialLengthMiles) {
    throw new RangeError(
      `Only journal mile ${route.terminalClamp.fromMile} may exceed official route mile ${route.officialLengthMiles}.`,
    );
  }
  return mile;
}

export function getRouteProgressAtMile(
  route: TrailRoute,
  journalMile: number,
): number {
  const mile = clampJournalMile(journalMile, route);
  const anchors = route.anchors;
  if (mile <= anchors[0]!.mile) return anchors[0]!.routeProgress;
  if (mile >= anchors.at(-1)!.mile) return anchors.at(-1)!.routeProgress;

  let low = 0;
  let high = anchors.length - 1;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (anchors[middle]!.mile <= mile) low = middle;
    else high = middle;
  }
  const start = anchors[low]!;
  const end = anchors[high]!;
  const ratio = (mile - start.mile) / (end.mile - start.mile);
  return (
    start.routeProgress + ratio * (end.routeProgress - start.routeProgress)
  );
}

export function getJournalMileAtRouteProgress(
  route: TrailRoute,
  routeProgress: number,
): number {
  if (
    !Number.isFinite(routeProgress) ||
    routeProgress < 0 ||
    routeProgress > 1
  ) {
    throw new RangeError("Route progress must be between 0 and 1.");
  }

  const anchors = route.anchors;
  if (routeProgress <= anchors[0]!.routeProgress) return anchors[0]!.mile;
  if (routeProgress >= anchors.at(-1)!.routeProgress) {
    return route.journalMaxMile;
  }

  let low = 0;
  let high = anchors.length - 1;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (anchors[middle]!.routeProgress <= routeProgress) low = middle;
    else high = middle;
  }
  const start = anchors[low]!;
  const end = anchors[high]!;
  const ratio =
    (routeProgress - start.routeProgress) /
    (end.routeProgress - start.routeProgress);

  return start.mile + ratio * (end.mile - start.mile);
}

export function getNearestMileOnRoute(
  route: TrailRoute,
  coordinate: RouteCoordinate,
  routeIndex = createRouteIndex(route.coordinates),
): number {
  const latitudeScale = Math.cos(degreesToRadians(coordinate[1]));
  let closestDistance = Number.POSITIVE_INFINITY;
  let closestProgress = 0;

  for (let index = 0; index < route.coordinates.length - 1; index += 1) {
    const start = route.coordinates[index]!;
    const end = route.coordinates[index + 1]!;
    const startX = (start[0] - coordinate[0]) * latitudeScale;
    const startY = start[1] - coordinate[1];
    const segmentX = (end[0] - start[0]) * latitudeScale;
    const segmentY = end[1] - start[1];
    const segmentLengthSquared = segmentX ** 2 + segmentY ** 2;
    const ratio =
      segmentLengthSquared > 0
        ? Math.max(
            0,
            Math.min(
              1,
              -(startX * segmentX + startY * segmentY) / segmentLengthSquared,
            ),
          )
        : 0;
    const offsetX = startX + ratio * segmentX;
    const offsetY = startY + ratio * segmentY;
    const distance = offsetX ** 2 + offsetY ** 2;

    if (distance < closestDistance) {
      closestDistance = distance;
      const startMeters = routeIndex.cumulativeMeters[index]!;
      const endMeters = routeIndex.cumulativeMeters[index + 1]!;
      closestProgress =
        (startMeters + ratio * (endMeters - startMeters)) /
        routeIndex.totalMeters;
    }
  }

  return getJournalMileAtRouteProgress(route, closestProgress);
}

export function getCoordinateAtProgress(
  route: TrailRoute,
  routeProgress: number,
  routeIndex = createRouteIndex(route.coordinates),
): RouteCoordinate {
  if (
    !Number.isFinite(routeProgress) ||
    routeProgress < 0 ||
    routeProgress > 1
  ) {
    throw new RangeError("Route progress must be between 0 and 1.");
  }
  if (routeProgress === 0) return route.coordinates[0]!;
  if (routeProgress === 1) return route.coordinates.at(-1)!;

  const targetMeters = routeProgress * routeIndex.totalMeters;
  let low = 0;
  let high = routeIndex.cumulativeMeters.length - 1;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (routeIndex.cumulativeMeters[middle]! <= targetMeters) low = middle;
    else high = middle;
  }
  const startDistance = routeIndex.cumulativeMeters[low]!;
  const endDistance = routeIndex.cumulativeMeters[high]!;
  const ratio = (targetMeters - startDistance) / (endDistance - startDistance);
  const start = route.coordinates[low]!;
  const end = route.coordinates[high]!;
  return [
    start[0] + ratio * (end[0] - start[0]),
    start[1] + ratio * (end[1] - start[1]),
  ];
}

export function getCoordinateAtMile(
  route: TrailRoute,
  mile: number,
  routeIndex = createRouteIndex(route.coordinates),
): RouteCoordinate {
  return getCoordinateAtProgress(
    route,
    getRouteProgressAtMile(route, mile),
    routeIndex,
  );
}

export function getTrailDayRouteRange(
  day: Day,
  route: TrailRoute,
): TrailDayRouteRange | null {
  if (day.kind === "post-trail") return null;
  const startProgress = getRouteProgressAtMile(route, day.mileStart);
  const endProgress = getRouteProgressAtMile(route, day.mileEnd);
  return {
    dayId: day.id,
    mileStart: day.mileStart,
    mileEnd: day.mileEnd,
    startProgress,
    endProgress,
    isPoint: day.mileStart === day.mileEnd,
  };
}
