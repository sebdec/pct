import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sources = {
  countries:
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson",
  states:
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson",
};

const stateMetadata = {
  dataset: "Natural Earth",
  scale: "1:50m",
  url: "https://www.naturalearthdata.com/downloads/50m-cultural-vectors/",
  license: "Public domain",
};

const countryMetadata = {
  ...stateMetadata,
  scale: "1:110m",
  url: "https://www.naturalearthdata.com/downloads/110m-cultural-vectors/",
};

interface SourceFeature {
  properties: Record<string, string | undefined>;
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: unknown;
  };
}

interface SourceFeatureCollection {
  features: SourceFeature[];
}

function roundCoordinates(value: unknown): unknown {
  if (typeof value === "number") return Number(value.toFixed(4));
  if (Array.isArray(value)) return value.map(roundCoordinates);
  return value;
}

async function loadGeoJson(url: string): Promise<SourceFeatureCollection> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Unable to download ${url}: ${response.status}`);
  }
  return (await response.json()) as SourceFeatureCollection;
}

const [countries, states] = await Promise.all([
  loadGeoJson(sources.countries),
  loadGeoJson(sources.states),
]);
const countryCodes = new Set(["CAN", "MEX"]);
const stateCodes = new Set(["US-CA", "US-OR", "US-WA"]);

const selectedCountries = countries.features
  .filter((feature) => countryCodes.has(feature.properties.ADM0_A3 ?? ""))
  .map((feature) => {
    const code = feature.properties.ADM0_A3;
    if (!code) throw new Error("Natural Earth country is missing ADM0_A3.");
    return {
      id: `country-${code.toLowerCase()}`,
      kind: "country",
      code,
      name:
        feature.properties.ADMIN ??
        feature.properties.NAME_EN ??
        feature.properties.NAME ??
        code,
      geometry: {
        ...feature.geometry,
        coordinates: roundCoordinates(feature.geometry.coordinates),
      },
      source: countryMetadata,
    };
  });

const selectedStates = states.features
  .filter((feature) => stateCodes.has(feature.properties.iso_3166_2 ?? ""))
  .map((feature) => {
    const code = feature.properties.iso_3166_2;
    if (!code) throw new Error("Natural Earth state is missing iso_3166_2.");
    return {
      id: `state-${code.toLowerCase()}`,
      kind: "state",
      code,
      name: feature.properties.name_en ?? feature.properties.name,
      geometry: {
        ...feature.geometry,
        coordinates: roundCoordinates(feature.geometry.coordinates),
      },
      source: stateMetadata,
    };
  });

const output = [...selectedCountries, ...selectedStates].toSorted(
  (left, right) => left.id.localeCompare(right.id),
);
const destination = resolve("src/data/map/geography.json");

await writeFile(destination, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${output.length} map areas to ${destination}.`);
