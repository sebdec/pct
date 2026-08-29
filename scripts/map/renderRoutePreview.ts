import { mkdir, readFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, URL } from "node:url";

import sharp from "sharp";

import {
  daySchema,
  trailRouteSchema,
  type RouteCoordinate,
} from "../../src/lib/content/schemas.ts";
import {
  createRouteIndex,
  getCoordinateAtMile,
} from "../../src/lib/map/route.ts";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const routeWorkspace = resolve(repositoryRoot, ".route-workspace");
const width = 1000;
const height = 1400;
const padding = 80;

function parseArguments(arguments_: readonly string[]): Map<string, string> {
  const normalizedArguments = arguments_.filter(
    (argument) => argument !== "--",
  );
  const values = new Map<string, string>();
  const allowed = new Set(["--input", "--days", "--output"]);
  for (let index = 0; index < normalizedArguments.length; index += 2) {
    const key = normalizedArguments[index];
    const value = normalizedArguments[index + 1];
    if (!key?.startsWith("--") || !value) {
      throw new Error(`Expected a value after ${String(key)}.`);
    }
    if (!allowed.has(key)) throw new Error(`Unknown argument ${key}.`);
    if (values.has(key)) throw new Error(`Duplicate argument ${key}.`);
    values.set(key, value);
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

function assertPreviewOutput(outputPath: string): void {
  const output = resolve(outputPath);
  const relativeOutput = relative(routeWorkspace, output);
  if (
    !relativeOutput ||
    relativeOutput.startsWith("..") ||
    resolve(routeWorkspace, relativeOutput) !== output ||
    !output.endsWith(".png")
  ) {
    throw new Error("Route preview must be a PNG inside .route-workspace.");
  }
}

function mercator([longitude, latitude]: RouteCoordinate): [number, number] {
  const longitudeRadians = (longitude * Math.PI) / 180;
  const latitudeRadians = (latitude * Math.PI) / 180;
  return [
    longitudeRadians,
    Math.log(Math.tan(Math.PI / 4 + latitudeRadians / 2)),
  ];
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function main(): Promise<void> {
  const arguments_ = parseArguments(process.argv.slice(2));
  const inputPath = requiredArgument(arguments_, "--input");
  const daysPath = requiredArgument(arguments_, "--days");
  const outputPath = requiredArgument(arguments_, "--output");
  assertPreviewOutput(outputPath);
  const routeValue: unknown = JSON.parse(await readFile(inputPath, "utf8"));
  if (!Array.isArray(routeValue) || routeValue.length !== 1) {
    throw new Error("Route preview input must contain exactly 1 route.");
  }
  const route = trailRouteSchema.parse(routeValue[0]);
  const dayValue: unknown = JSON.parse(await readFile(daysPath, "utf8"));
  if (!Array.isArray(dayValue)) throw new Error("Days input must be an array.");
  const days = dayValue.map((day) => daySchema.parse(day));
  const projectedRoute = route.coordinates.map(mercator);
  const xs = projectedRoute.map(([x]) => x);
  const ys = projectedRoute.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const scale = Math.min(
    (width - padding * 2) / (maxX - minX),
    (height - padding * 2) / (maxY - minY),
  );
  const offsetX = (width - (maxX - minX) * scale) / 2;
  const offsetY = (height - (maxY - minY) * scale) / 2;
  const toCanvas = ([x, y]: [number, number]): [number, number] => [
    offsetX + (x - minX) * scale,
    height - offsetY - (y - minY) * scale,
  ];
  const path = projectedRoute
    .map((coordinate, index) => {
      const [x, y] = toCanvas(coordinate);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
  const routeIndex = createRouteIndex(route.coordinates);
  const dayMarkers = days
    .filter((day) => day.kind === "trail")
    .map((day) => {
      const [x, y] = toCanvas(
        mercator(getCoordinateAtMile(route, day.mileEnd, routeIndex)),
      );
      const radius = day.mileStart === day.mileEnd ? 5 : 2.5;
      return `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${radius}" />`;
    })
    .join("");
  const attribution = escapeXml(route.source.attribution);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#101613"/>
  <path d="${path}" fill="none" stroke="#83c99a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <g fill="#e6e9df" opacity="0.8">${dayMarkers}</g>
  <circle cx="${toCanvas(projectedRoute[0]!)[0]}" cy="${toCanvas(projectedRoute[0]!)[1]}" r="8" fill="#f0b36d"/>
  <circle cx="${toCanvas(projectedRoute.at(-1)!)[0]}" cy="${toCanvas(projectedRoute.at(-1)!)[1]}" r="8" fill="#f0b36d"/>
  <text x="50" y="1330" fill="#e6e9df" font-family="system-ui, sans-serif" font-size="24">PCT 2026 normalized route</text>
  <text x="50" y="1365" fill="#9eaaa3" font-family="system-ui, sans-serif" font-size="15">${attribution}</text>
</svg>`;
  await mkdir(dirname(resolve(outputPath)), { recursive: true });
  await sharp(Buffer.from(svg)).png().toFile(outputPath);
  process.stdout.write(
    `Rendered route preview to ${relative(repositoryRoot, outputPath)}.\n`,
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
