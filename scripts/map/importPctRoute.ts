import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

import { format } from "prettier";

import { normalizePctRoute } from "./normalizeRoute.ts";
import {
  assertApprovedLayer,
  coordinatePrecision,
  expectedCenterlineLastEdit,
  expectedMileMarkersLastEdit,
  expectedSourceMarkerCount,
  expectedValidMarkerCount,
  fetchGeoJsonPages,
  fetchLayerMetadata,
  maxAllowableOffsetDegrees,
  pctaCenterlineUrl,
  pctaMileMarkersUrl,
} from "./pctaSource.ts";
import type {
  PctaCenterlineFeature,
  PctaMarkerFeature,
} from "./normalizeRoute.ts";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const approvedOutputPath = resolve(repositoryRoot, "src/data/map/routes.json");
const routeWorkspace = resolve(repositoryRoot, ".route-workspace");

function parseArguments(arguments_: readonly string[]): Map<string, string> {
  const values = new Map<string, string>();
  const allowed = new Set(["--output", "--report"]);
  const normalizedArguments = arguments_.filter(
    (argument) => argument !== "--",
  );
  for (let index = 0; index < normalizedArguments.length; index += 1) {
    const key = normalizedArguments[index]!;
    const value = normalizedArguments[index + 1];
    if (!key.startsWith("--") || !value || value.startsWith("--")) {
      throw new Error(`Expected a value after ${key}.`);
    }
    if (!allowed.has(key)) throw new Error(`Unknown argument ${key}.`);
    if (values.has(key)) throw new Error(`Duplicate argument ${key}.`);
    values.set(key, value);
    index += 1;
  }
  return values;
}

function requiredArgument(
  arguments_: Map<string, string>,
  key: string,
): string {
  const value = arguments_.get(key);
  if (!value) throw new Error(`Missing required argument ${key}.`);
  return value;
}

function assertApprovedPaths(outputPath: string, reportPath: string): void {
  if (resolve(outputPath) !== approvedOutputPath) {
    throw new Error(
      `Normalized route output must be ${relative(repositoryRoot, approvedOutputPath)}.`,
    );
  }
  const resolvedReport = resolve(reportPath);
  const reportRelative = relative(routeWorkspace, resolvedReport);
  if (
    !reportRelative ||
    reportRelative.startsWith("..") ||
    resolve(routeWorkspace, reportRelative) !== resolvedReport
  ) {
    throw new Error("Route import report must be inside .route-workspace.");
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp`;
  const formatted = await format(JSON.stringify(value), { parser: "json" });
  await writeFile(temporaryPath, formatted);
  await rename(temporaryPath, path);
}

async function main(): Promise<void> {
  const arguments_ = parseArguments(process.argv.slice(2));
  const outputPath = requiredArgument(arguments_, "--output");
  const reportPath = requiredArgument(arguments_, "--report");
  assertApprovedPaths(outputPath, reportPath);

  const [centerlineMetadata, markerMetadata] = await Promise.all([
    fetchLayerMetadata(pctaCenterlineUrl),
    fetchLayerMetadata(pctaMileMarkersUrl),
  ]);
  assertApprovedLayer(centerlineMetadata, {
    name: "PCTA_Centerline",
    geometryType: "esriGeometryPolyline",
    lastEditDate: expectedCenterlineLastEdit,
  });
  assertApprovedLayer(markerMetadata, {
    name: "Mile_Marker_2026",
    geometryType: "esriGeometryPoint",
    lastEditDate: expectedMileMarkersLastEdit,
  });

  const [centerlines, markers] = await Promise.all([
    fetchGeoJsonPages<
      Record<string, unknown>,
      PctaCenterlineFeature["geometry"]
    >({
      layerUrl: pctaCenterlineUrl,
      outFields: ["OBJECTID"],
      pageSize: centerlineMetadata.maxRecordCount,
      query: {
        maxAllowableOffset: String(maxAllowableOffsetDegrees),
        geometryPrecision: String(coordinatePrecision),
      },
    }),
    fetchGeoJsonPages<
      PctaMarkerFeature["properties"],
      NonNullable<PctaMarkerFeature["geometry"]>
    >({
      layerUrl: pctaMileMarkersUrl,
      outFields: ["OBJECTID", "Mile", "RouteID"],
      pageSize: markerMetadata.maxRecordCount,
    }),
  ]);
  if (centerlines.length !== 1) {
    throw new Error(
      `Expected 1 PCTA centerline and received ${centerlines.length}.`,
    );
  }
  if (markers.length !== expectedSourceMarkerCount) {
    throw new Error(
      `Expected ${expectedSourceMarkerCount} PCTA marker rows and received ${markers.length}.`,
    );
  }

  const { route, report } = normalizePctRoute({
    centerline: centerlines[0] as PctaCenterlineFeature,
    markers: markers as PctaMarkerFeature[],
    centerlineLastEdit: centerlineMetadata.lastEditDate,
    mileMarkersLastEdit: markerMetadata.lastEditDate,
  });
  if (report.validMarkerCount !== expectedValidMarkerCount) {
    throw new Error(
      `Expected ${expectedValidMarkerCount} valid PCTA markers and received ${report.validMarkerCount}.`,
    );
  }
  if (report.maxAnchorProjectionMeters > 250) {
    throw new Error(
      `Maximum anchor projection ${report.maxAnchorProjectionMeters} m exceeds 250 m.`,
    );
  }

  await writeJson(outputPath, [route]);
  await writeJson(reportPath, {
    ...report,
    source: route.source,
    officialLengthMiles: route.officialLengthMiles,
    journalMaxMile: route.journalMaxMile,
  });
  process.stdout.write(
    `Normalized ${report.outputCoordinateCount} route coordinates and ${route.anchors.length} mileage anchors from PCTA 2026.\n`,
  );
}

try {
  await main();
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
}
