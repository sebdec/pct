import { useEffect, useMemo, useRef, useState } from "react";
import type {
  ExpressionSpecification,
  FilterSpecification,
  GeoJSONSource,
  IControl,
  Map as MapLibreMap,
  Marker,
} from "maplibre-gl";
import maplibreWorkerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

import type {
  MapArea,
  MapPoint,
  RouteCoordinate,
  TrailRoute,
} from "../lib/content/schemas.ts";
import type { Locale } from "../lib/content/locales.ts";
import { getUi } from "../lib/i18n/ui.ts";
import {
  getMapDayForMile,
  initialMapSelection,
  selectMapDay,
  selectMapMile,
  type MapDayViewModel,
} from "../lib/map/mapExperience.ts";
import { loadMapPayload, mapPayloadPath } from "../lib/map/mapPayload.ts";
import {
  createRouteIndex,
  getCoordinateAtMile,
  getCoordinateAtProgress,
  getNearestMileOnRoute,
  getRouteProgressAtMile,
} from "../lib/map/route.ts";
import { readRegionColors } from "../lib/trail/presentation.ts";
import TrailDaySummary from "./TrailDaySummary.tsx";
import TrailMetrics from "./TrailMetrics.tsx";
import TrailProgressControl from "./TrailProgressControl.tsx";
import "./TrailMapExperience.css";

interface Props {
  days: readonly MapDayViewModel[];
  mapStyleUrl: string;
  initialDayId?: string;
  locale: Locale;
}

const baseMapAttribution =
  '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a> <a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> Data from <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>';
interface MapThemeColors {
  page: string;
  land: string;
  canada: string;
  mexico: string;
  state: string;
  boundary: string;
  road: string;
  waterway: string;
}

function readMapThemeColors(): MapThemeColors {
  const styles = getComputedStyle(document.documentElement);
  const read = (name: string) => styles.getPropertyValue(name).trim();

  return {
    page: read("--pct-color-night-trail"),
    land: read("--pct-map-land"),
    canada: read("--pct-map-neighbor-canada"),
    mexico: read("--pct-map-neighbor-mexico"),
    state: read("--pct-map-state"),
    boundary: read("--pct-map-boundary"),
    road: read("--pct-map-road"),
    waterway: read("--pct-map-waterway"),
  };
}

function neighborCountryColor(colors: MapThemeColors): ExpressionSpecification {
  return [
    "match",
    ["get", "code"],
    "CAN",
    colors.canada,
    "MEX",
    colors.mexico,
    colors.land,
  ];
}

function localMapStyle(colors: MapThemeColors) {
  return {
    version: 8 as const,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {},
    layers: [
      {
        id: "background",
        type: "background" as const,
        paint: { "background-color": colors.land },
      },
    ],
  };
}

function featureCollection(features: readonly object[]) {
  return { type: "FeatureCollection" as const, features };
}

function areaFeatures(areas: readonly MapArea[]) {
  return featureCollection(
    areas.map((area) => ({
      type: "Feature" as const,
      properties: { id: area.id, kind: area.kind, code: area.code },
      geometry: area.geometry,
    })),
  );
}

function pointFeatures(
  points: readonly MapPoint[],
  route: TrailRoute,
  routeIndex: ReturnType<typeof createRouteIndex>,
) {
  return featureCollection(
    points.map((point) => {
      const mile = getNearestMileOnRoute(route, point.coordinates, routeIndex);
      const coordinate = getCoordinateAtMile(route, mile, routeIndex);

      return {
        type: "Feature" as const,
        properties: {
          label: point.labelFr,
          labelSide: point.coordinates[0] < coordinate[0] ? "left" : "right",
          minZoom: point.minZoom,
          priority: point.priority,
        },
        geometry: {
          type: "Point" as const,
          coordinates: coordinate,
        },
      };
    }),
  );
}

function coordinateIndexAtProgress(
  progress: number,
  cumulativeMeters: readonly number[],
  totalMeters: number,
): number {
  const targetMeters = progress * totalMeters;
  let low = 0;
  let high = cumulativeMeters.length - 1;

  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (cumulativeMeters[middle]! < targetMeters) low = middle;
    else high = middle;
  }

  return high;
}

function coordinatesBetweenProgress(
  route: TrailRoute,
  startProgress: number,
  endProgress: number,
  cumulativeMeters: readonly number[],
  totalMeters: number,
): RouteCoordinate[] {
  const routeIndex = { cumulativeMeters, totalMeters };
  const startIndex = coordinateIndexAtProgress(
    startProgress,
    cumulativeMeters,
    totalMeters,
  );
  const endIndex = coordinateIndexAtProgress(
    endProgress,
    cumulativeMeters,
    totalMeters,
  );

  return [
    getCoordinateAtProgress(route, startProgress, routeIndex),
    ...route.coordinates.slice(startIndex, endIndex),
    getCoordinateAtProgress(route, endProgress, routeIndex),
  ];
}

function regionalRouteFeatures(
  days: readonly MapDayViewModel[],
  route: TrailRoute,
  cumulativeMeters: readonly number[],
  totalMeters: number,
  completedMile: number = route.journalMaxMile,
) {
  const ranges: {
    regionId: MapDayViewModel["regionId"];
    mileStart: number;
    mileEnd: number;
  }[] = [];
  for (const day of days) {
    const current = ranges.at(-1);
    if (current?.regionId === day.regionId) {
      current.mileEnd = day.mileEnd;
    } else {
      ranges.push({
        regionId: day.regionId,
        mileStart: day.mileStart,
        mileEnd: day.mileEnd,
      });
    }
  }

  return featureCollection(
    ranges.flatMap((range) => {
      const mileEnd = Math.min(range.mileEnd, completedMile);
      if (mileEnd <= range.mileStart) return [];

      return [
        {
          type: "Feature" as const,
          properties: { regionId: range.regionId },
          geometry: {
            type: "LineString" as const,
            coordinates: coordinatesBetweenProgress(
              route,
              getRouteProgressAtMile(route, range.mileStart),
              getRouteProgressAtMile(route, mileEnd),
              cumulativeMeters,
              totalMeters,
            ),
          },
        },
      ];
    }),
  );
}

function regionLineColor(
  colors: ReturnType<typeof readRegionColors>,
): ExpressionSpecification {
  return [
    "match",
    ["get", "regionId"],
    "desert",
    colors.desert,
    "sierra",
    colors.sierra,
    "norcal",
    colors.norcal,
    "oregon",
    colors.oregon,
    "washington",
    colors.washington,
    colors.desert,
  ];
}

function customizeBaseMap(map: MapLibreMap, colors: MapThemeColors) {
  if (map.getLayer("background")) {
    map.setPaintProperty("background", "background-color", colors.land);
  }
  if (map.getLayer("water")) {
    map.setPaintProperty("water", "fill-color", colors.page);
  }
  for (const layerId of [
    "landcover_ice_shelf",
    "landuse_residential",
    "landcover_wood",
    "park",
    "park_outline",
    "building",
    "aeroway-taxiway",
    "aeroway-runway-casing",
    "aeroway-area",
    "aeroway-runway",
    "railway_transit",
    "railway_transit_dashline",
    "railway_service",
    "railway_service_dashline",
    "railway",
    "railway_dashline",
  ]) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", "none");
    }
  }
  for (const layerId of [
    "highway_name_other",
    "highway_ref",
    "place_other",
    "place_suburb",
    "place_village",
    "place_town",
    "place_city",
    "place_city_large",
  ]) {
    if (map.getLayer(layerId)) {
      map.setLayoutProperty(layerId, "visibility", "none");
    }
  }
  for (const layerId of [
    "tunnel_motorway_casing",
    "tunnel_motorway_inner",
    "highway_path",
    "highway_minor",
    "highway_major_casing",
    "highway_major_inner",
    "highway_major_subtle",
    "highway_motorway_casing",
    "highway_motorway_inner",
    "highway_motorway_subtle",
  ]) {
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, "line-color", colors.road);
      map.setPaintProperty(layerId, "line-opacity", 0.5);
    }
  }
  for (const layerId of ["waterway", "waterway-river-canal"] as const) {
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, "line-color", colors.waterway);
    }
  }
}

function routeCameraBounds(
  route: TrailRoute,
): [[number, number], [number, number]] {
  return [[...route.bounds.southwest], [...route.bounds.northeast]];
}

function routeNavigationBounds(
  route: TrailRoute,
): [[number, number], [number, number]] {
  const [west, south] = route.bounds.southwest;
  const [east, north] = route.bounds.northeast;

  return [
    [west - 12, south - 3.5],
    [east + 12, north + 3.5],
  ];
}

class RouteFitControl implements IControl {
  private container?: HTMLDivElement;
  private map?: MapLibreMap;

  constructor(
    private readonly route: TrailRoute,
    private readonly label: string,
  ) {}

  onAdd(map: MapLibreMap): HTMLElement {
    this.map = map;
    this.container = document.createElement("div");
    this.container.className = "maplibregl-ctrl maplibregl-ctrl-group";

    const button = document.createElement("button");
    button.className = "trail-map-fit-button";
    button.type = "button";
    button.title = this.label;
    button.setAttribute("aria-label", this.label);
    button.addEventListener("click", this.fitRoute);
    this.container.append(button);

    return this.container;
  }

  onRemove(): void {
    this.container
      ?.querySelector("button")
      ?.removeEventListener("click", this.fitRoute);
    this.container?.remove();
    this.map = undefined;
  }

  private readonly fitRoute = () => {
    this.map?.fitBounds(routeCameraBounds(this.route), {
      padding: 44,
      duration: 650,
    });
  };
}

interface LoadedMapPayload {
  route: TrailRoute;
  points: readonly MapPoint[];
  areas: readonly MapArea[];
}

type LoadedProps = Props & LoadedMapPayload;

function LoadedTrailMapExperience({
  days,
  route,
  points,
  areas,
  mapStyleUrl,
  initialDayId,
  locale,
}: LoadedProps) {
  const labels = getUi(locale);
  const initialSelection = useMemo(
    () => initialMapSelection(days, initialDayId),
    [days, initialDayId],
  );
  const [selection, setSelection] = useState(initialSelection);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const routeIndex = useMemo(
    () => createRouteIndex(route.coordinates),
    [route.coordinates],
  );
  const selectedDay =
    days.find(({ id }) => id === selection.dayId) ??
    getMapDayForMile(days, selection.mile);
  const selectedDayIndex = days.findIndex(({ id }) => id === selectedDay.id);
  const previousDay = days[selectedDayIndex - 1];
  const nextDay = days[selectedDayIndex + 1];

  useEffect(() => {
    let disposed = false;
    const usingFallback = mapStyleUrl === "local";
    let routeClickBound = false;

    async function createMap() {
      if (!mapContainerRef.current) return;

      try {
        const maplibre = await import("maplibre-gl");
        if (disposed || !mapContainerRef.current) return;
        maplibre.setWorkerUrl(maplibreWorkerUrl);

        const map = new maplibre.Map({
          container: mapContainerRef.current,
          style: usingFallback
            ? localMapStyle(readMapThemeColors())
            : mapStyleUrl,
          bounds: routeCameraBounds(route),
          fitBoundsOptions: { padding: 44 },
          maxBounds: routeNavigationBounds(route),
          minZoom: 2.8,
          attributionControl: {
            compact: true,
            customAttribution: [
              baseMapAttribution,
              `<a href="${route.source.centerlineUrl}" target="_blank" rel="noopener noreferrer">${route.source.attribution}</a>`,
              `<a href="${route.source.licenseUrl}" target="_blank" rel="noopener noreferrer">${route.source.license}</a>`,
            ],
          },
        });
        mapRef.current = map;

        const markerElement = document.createElement("span");
        markerElement.className = "trail-map-marker";
        markerElement.setAttribute("role", "img");
        markerElement.setAttribute("aria-label", labels.trailPosition);
        const marker = new maplibre.Marker({
          element: markerElement,
          draggable: true,
        })
          .setLngLat(
            getCoordinateAtMile(route, initialSelection.mile, routeIndex),
          )
          .addTo(map);
        marker.on("drag", () => {
          const { lng, lat } = marker.getLngLat();
          const mile = getNearestMileOnRoute(route, [lng, lat], routeIndex);
          marker.setLngLat(getCoordinateAtMile(route, mile, routeIndex));
          setSelection(selectMapMile(days, mile));
        });
        marker.on("dragend", () => {
          const { lng, lat } = marker.getLngLat();
          const mile = getNearestMileOnRoute(route, [lng, lat], routeIndex);
          marker.setLngLat(getCoordinateAtMile(route, mile, routeIndex));
        });
        markerRef.current = marker;

        const selectRoutePosition = (event: {
          lngLat: { lng: number; lat: number };
        }) => {
          const mile = getNearestMileOnRoute(
            route,
            [event.lngLat.lng, event.lngLat.lat],
            routeIndex,
          );
          setSelection(selectMapMile(days, mile));
        };

        const addExperienceLayers = () => {
          const themeColors = readMapThemeColors();
          customizeBaseMap(map, themeColors);
          const firstSymbol = map
            .getStyle()
            .layers?.find(({ type }) => type === "symbol")?.id;
          const colors = readRegionColors();

          if (!map.getSource("pct-areas")) {
            map.addSource("pct-areas", {
              type: "geojson",
              data: areaFeatures(areas),
            });
            map.addLayer(
              {
                id: "pct-neighbor-countries",
                type: "fill",
                source: "pct-areas",
                filter: ["==", ["get", "kind"], "country"],
                paint: {
                  "fill-color": neighborCountryColor(themeColors),
                  "fill-opacity": 0.92,
                  "fill-outline-color": themeColors.boundary,
                },
              },
              firstSymbol,
            );
            map.addLayer(
              {
                id: "pct-trail-states",
                type: "fill",
                source: "pct-areas",
                filter: ["==", ["get", "kind"], "state"],
                paint: {
                  "fill-color": themeColors.state,
                  "fill-opacity": 0.78,
                  "fill-outline-color": themeColors.boundary,
                },
              },
              firstSymbol,
            );
          }

          if (!map.getSource("pct-route")) {
            map.addSource("pct-route", {
              type: "geojson",
              data: regionalRouteFeatures(
                days,
                route,
                routeIndex.cumulativeMeters,
                routeIndex.totalMeters,
              ),
            });
            map.addSource("pct-route-complete", {
              type: "geojson",
              data: regionalRouteFeatures(
                days,
                route,
                routeIndex.cumulativeMeters,
                routeIndex.totalMeters,
                initialSelection.mile,
              ),
            });
            map.addLayer(
              {
                id: "pct-route-base",
                type: "line",
                source: "pct-route",
                paint: {
                  "line-color": regionLineColor(colors),
                  "line-width": 2.5,
                  "line-opacity": 0.5,
                },
              },
              firstSymbol,
            );
            map.addLayer(
              {
                id: "pct-route-complete-line",
                type: "line",
                source: "pct-route-complete",
                paint: {
                  "line-color": regionLineColor(colors),
                  "line-width": 3.4,
                  "line-opacity": 1,
                },
              },
              firstSymbol,
            );
            map.addLayer({
              id: "pct-route-hit",
              type: "line",
              source: "pct-route",
              paint: {
                "line-color": "#000000",
                "line-width": 18,
                "line-opacity": 0,
              },
            });
          }

          if (!map.getSource("pct-points")) {
            map.addSource("pct-points", {
              type: "geojson",
              data: pointFeatures(points, route, routeIndex),
            });

            const pointColor = [
              "match",
              ["get", "priority"],
              1,
              "#91e6a5",
              2,
              "#d8ddd8",
              "#9ba49f",
            ] as ExpressionSpecification;
            const zoomThresholds = [
              ...new Set(points.map(({ minZoom }) => minZoom)),
            ].toSorted((left, right) => left - right);

            for (const minZoom of zoomThresholds) {
              const thresholdFilter: FilterSpecification = [
                "==",
                ["get", "minZoom"],
                minZoom,
              ];
              map.addLayer(
                {
                  id: `pct-points-${minZoom}`,
                  type: "circle",
                  source: "pct-points",
                  minzoom: minZoom,
                  filter: thresholdFilter,
                  paint: {
                    "circle-color": pointColor,
                    "circle-radius": 3.2,
                    "circle-stroke-color": themeColors.page,
                    "circle-stroke-width": 1.2,
                  },
                },
                firstSymbol,
              );

              for (const labelSide of ["left", "right"] as const) {
                const isRight = labelSide === "right";
                map.addLayer({
                  id: `pct-point-labels-${minZoom}-${labelSide}`,
                  type: "symbol",
                  source: "pct-points",
                  minzoom: minZoom,
                  filter: [
                    "all",
                    thresholdFilter,
                    ["==", ["get", "labelSide"], labelSide],
                  ] as FilterSpecification,
                  layout: {
                    "text-field": ["get", "label"],
                    "text-font": ["Noto Sans Regular"],
                    "text-size": 10.5,
                    "text-anchor": isRight ? "left" : "right",
                    "text-offset": isRight ? [0.8, 0] : [-0.8, 0],
                    "text-allow-overlap": false,
                    "text-ignore-placement": false,
                    "symbol-sort-key": ["get", "priority"],
                  },
                  paint: {
                    "text-color": pointColor,
                    "text-halo-color": themeColors.page,
                    "text-halo-width": 2,
                    "text-halo-blur": 0.5,
                  },
                });
              }
            }
          }

          if (!routeClickBound) {
            map.on("click", "pct-route-hit", selectRoutePosition);
            map.on("mouseenter", "pct-route-hit", () => {
              map.getCanvas().style.cursor = "pointer";
            });
            map.on("mouseleave", "pct-route-hit", () => {
              map.getCanvas().style.cursor = "";
            });
            routeClickBound = true;
          }
        };

        map.on("load", addExperienceLayers);
        map.on("style.load", addExperienceLayers);
        if (map.isStyleLoaded()) addExperienceLayers();
        map.addControl(new maplibre.NavigationControl({ showCompass: false }));
        map.addControl(
          new RouteFitControl(route, labels.recenterTrail),
          "top-right",
        );
        map.once("idle", () => {
          map.getContainer().dataset.mapReady = "true";
          map
            .getContainer()
            .querySelector(".maplibregl-ctrl-attrib")
            ?.classList.remove("maplibregl-compact-show");
        });
      } catch {
        setMapUnavailable(true);
      }
    }

    void createMap();

    return () => {
      disposed = true;
      markerRef.current?.remove();
      mapRef.current?.remove();
      markerRef.current = null;
      mapRef.current = null;
    };
  }, [
    areas,
    days,
    initialSelection.mile,
    mapStyleUrl,
    points,
    route,
    routeIndex,
    labels.recenterTrail,
    labels.trailPosition,
  ]);

  useEffect(() => {
    const marker = markerRef.current;
    marker?.setLngLat(getCoordinateAtMile(route, selection.mile, routeIndex));
    const completedSource = mapRef.current?.getSource("pct-route-complete") as
      GeoJSONSource | undefined;
    completedSource?.setData(
      regionalRouteFeatures(
        days,
        route,
        routeIndex.cumulativeMeters,
        routeIndex.totalMeters,
        selection.mile,
      ),
    );
  }, [days, route, routeIndex, selection.mile]);

  function chooseDay(dayId: string) {
    setSelection(selectMapDay(days, dayId));
  }

  function chooseMile(mile: number) {
    setSelection(selectMapMile(days, mile));
  }

  return (
    <section className="trail-map-experience" aria-label={labels.mapLabel}>
      <div className="trail-map-stage">
        <div ref={mapContainerRef} className="trail-map-canvas" />
        {mapUnavailable ? (
          <p className="trail-map-fallback">{labels.mapUnavailable}</p>
        ) : null}
      </div>

      <aside className="trail-map-panel" aria-live="polite">
        <TrailDaySummary
          sequence={selectedDay.sequence}
          locationLabel={selectedDay.locationLabel}
          date={selectedDay.date}
          action={{
            href: selectedDay.journalHref,
            label: labels.viewInJournal,
            reload: true,
          }}
          stableLocation
          locale={locale}
        />

        <TrailProgressControl
          className="trail-map-progress"
          sequence={selectedDay.sequence}
          regionId={selectedDay.regionId}
          regionLabel={selectedDay.regionLabel}
          positionMiles={selection.mile}
          min={days[0]!.mileStart}
          max={route.journalMaxMile}
          step={0.1}
          value={selection.mile}
          controlId="map-mile-progress"
          controlLabel={labels.chooseTrailPosition}
          navigationLabel={labels.trailNavigation}
          locale={locale}
          previous={
            previousDay
              ? {
                  ariaLabel: `${labels.previousDay}, ${labels.day.toLowerCase()} ${previousDay.sequence}`,
                  onClick: () => chooseDay(previousDay.id),
                }
              : undefined
          }
          next={
            nextDay
              ? {
                  ariaLabel: `${labels.nextDay}, ${labels.day.toLowerCase()} ${nextDay.sequence}`,
                  onClick: () => chooseDay(nextDay.id),
                }
              : undefined
          }
          onChange={chooseMile}
        />

        <TrailMetrics
          className="trail-map-metrics"
          regionId={selectedDay.regionId}
          regionLabel={selectedDay.regionLabel}
          sections={selectedDay.sections}
          positionMiles={{
            start: selectedDay.mileStart,
            end: selectedDay.mileEnd,
          }}
          distanceMiles={selectedDay.distanceMiles}
          ascentMeters={selectedDay.ascentMeters}
          descentMeters={selectedDay.descentMeters}
          locale={locale}
        />
      </aside>
    </section>
  );
}

function MapDataPlaceholder({
  days,
  initialDayId,
  locale,
  failed,
}: Pick<Props, "days" | "initialDayId" | "locale"> & { failed: boolean }) {
  const activeLocale = locale;
  const labels = getUi(activeLocale);
  const selection = initialMapSelection(days, initialDayId);
  const selectedDay =
    days.find(({ id }) => id === selection.dayId) ??
    getMapDayForMile(days, selection.mile);

  return (
    <section
      className="trail-map-experience"
      aria-label={labels.mapLabel}
      aria-busy={!failed}
    >
      <div className="trail-map-stage">
        <p className="trail-map-fallback" role={failed ? "alert" : "status"}>
          {failed ? labels.mapUnavailable : labels.mapLoading}
        </p>
      </div>

      <aside className="trail-map-panel">
        <TrailDaySummary
          sequence={selectedDay.sequence}
          locationLabel={selectedDay.locationLabel}
          date={selectedDay.date}
          action={{
            href: selectedDay.journalHref,
            label: labels.viewInJournal,
            reload: true,
          }}
          stableLocation
          locale={activeLocale}
        />
        <TrailMetrics
          className="trail-map-metrics"
          regionId={selectedDay.regionId}
          regionLabel={selectedDay.regionLabel}
          sections={selectedDay.sections}
          positionMiles={{
            start: selectedDay.mileStart,
            end: selectedDay.mileEnd,
          }}
          distanceMiles={selectedDay.distanceMiles}
          ascentMeters={selectedDay.ascentMeters}
          descentMeters={selectedDay.descentMeters}
          locale={activeLocale}
        />
      </aside>
    </section>
  );
}

export default function TrailMapExperience(props: Props) {
  const [payload, setPayload] = useState<LoadedMapPayload>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    loadMapPayload(mapPayloadPath, controller.signal)
      .then(setPayload)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError")
          return;
        setFailed(true);
      });

    return () => controller.abort();
  }, []);

  if (!payload) {
    return (
      <MapDataPlaceholder
        days={props.days}
        initialDayId={props.initialDayId}
        locale={props.locale}
        failed={failed}
      />
    );
  }

  return <LoadedTrailMapExperience {...props} {...payload} />;
}
