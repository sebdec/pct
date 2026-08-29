export const pctaCenterlineUrl =
  "https://services5.arcgis.com/ZldHa25efPFpMmfB/ArcGIS/rest/services/PCTA_Centerline/FeatureServer/0";
export const pctaMileMarkersUrl =
  "https://services5.arcgis.com/ZldHa25efPFpMmfB/ArcGIS/rest/services/PCT_Mile_Markers_2026/FeatureServer/0";
export const expectedCenterlineLastEdit = "2026-01-06T23:18:04.221Z";
export const expectedMileMarkersLastEdit = "2026-01-07T00:14:06.948Z";
export const officialLengthMiles = 2655.84;
export const journalMaxMile = 2656;
export const maxAllowableOffsetDegrees = 0.00025;
export const coordinatePrecision = 6;
export const expectedSourceMarkerCount = 5320;
export const expectedValidMarkerCount = 5311;

export interface GeoJsonFeature<
  Properties extends Record<string, unknown>,
  Geometry,
> {
  type: "Feature";
  properties: Properties;
  geometry: Geometry | null;
}

interface GeoJsonFeatureCollection<
  Properties extends Record<string, unknown>,
  Geometry,
> {
  type: "FeatureCollection";
  features: Array<GeoJsonFeature<Properties, Geometry>>;
  exceededTransferLimit?: boolean;
}

export interface ArcGisLayerMetadata {
  name: string;
  geometryType: string;
  maxRecordCount: number;
  lastEditDate: string;
}

async function fetchJson(
  url: URL,
  fetcher: typeof fetch,
): Promise<Record<string, unknown>> {
  const response = await fetcher(url);
  if (!response.ok) {
    throw new Error(`PCTA request failed with HTTP ${response.status}: ${url}`);
  }
  const value: unknown = await response.json();
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`PCTA request returned invalid JSON: ${url}`);
  }
  if ("error" in value) {
    throw new Error(
      `PCTA service returned an error: ${JSON.stringify(value.error)}`,
    );
  }
  return value as Record<string, unknown>;
}

export async function fetchLayerMetadata(
  layerUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<ArcGisLayerMetadata> {
  const url = new URL(layerUrl);
  url.searchParams.set("f", "json");
  const value = await fetchJson(url, fetcher);
  const editingInfo = value.editingInfo;
  if (
    typeof value.name !== "string" ||
    typeof value.geometryType !== "string" ||
    typeof value.maxRecordCount !== "number" ||
    !editingInfo ||
    typeof editingInfo !== "object" ||
    !("lastEditDate" in editingInfo) ||
    typeof editingInfo.lastEditDate !== "number"
  ) {
    throw new TypeError(`PCTA layer metadata is incomplete: ${layerUrl}`);
  }
  return {
    name: value.name,
    geometryType: value.geometryType,
    maxRecordCount: value.maxRecordCount,
    lastEditDate: new Date(editingInfo.lastEditDate).toISOString(),
  };
}

export async function fetchGeoJsonPages<
  Properties extends Record<string, unknown>,
  Geometry,
>(options: {
  layerUrl: string;
  outFields: readonly string[];
  pageSize: number;
  fetcher?: typeof fetch;
  query?: Readonly<Record<string, string>>;
}): Promise<Array<GeoJsonFeature<Properties, Geometry>>> {
  const fetcher = options.fetcher ?? fetch;
  const features: Array<GeoJsonFeature<Properties, Geometry>> = [];

  for (let offset = 0; ; offset += options.pageSize) {
    const url = new URL(`${options.layerUrl}/query`);
    url.searchParams.set("where", "1=1");
    url.searchParams.set("outFields", options.outFields.join(","));
    url.searchParams.set("returnGeometry", "true");
    url.searchParams.set("outSR", "4326");
    url.searchParams.set("orderByFields", "OBJECTID");
    url.searchParams.set("resultOffset", String(offset));
    url.searchParams.set("resultRecordCount", String(options.pageSize));
    url.searchParams.set("f", "geojson");
    for (const [key, value] of Object.entries(options.query ?? {})) {
      url.searchParams.set(key, value);
    }
    const value = await fetchJson(url, fetcher);
    if (value.type !== "FeatureCollection" || !Array.isArray(value.features)) {
      throw new TypeError(
        `PCTA query did not return a GeoJSON FeatureCollection: ${url}`,
      );
    }
    const page = value as unknown as GeoJsonFeatureCollection<
      Properties,
      Geometry
    >;
    features.push(...page.features);
    if (page.features.length < options.pageSize) break;
  }

  return features;
}

export function assertApprovedLayer(
  metadata: ArcGisLayerMetadata,
  expected: {
    name: string;
    geometryType: string;
    lastEditDate: string;
  },
): void {
  if (metadata.name !== expected.name) {
    throw new Error(
      `Expected layer ${expected.name} and received ${metadata.name}.`,
    );
  }
  if (metadata.geometryType !== expected.geometryType) {
    throw new Error(
      `Expected geometry ${expected.geometryType} and received ${metadata.geometryType}.`,
    );
  }
  if (metadata.lastEditDate !== expected.lastEditDate) {
    throw new Error(
      `PCTA source drift detected for ${metadata.name}. Expected ${expected.lastEditDate} and received ${metadata.lastEditDate}.`,
    );
  }
}
